'use strict'

const path = require('path'),
  { createLogger } = require('../logger'),
  {
    DEFAULT_CONCURRENCY,
    writeCsv,
    getFormattedDateTime,
    requireAccountIds,
    strToLower,
    doAsyncWork,
  } = require('../util'),
  { NerdgraphClient } = require('../nerdgraph')

const logger = createLogger('query-generator'),
  COLUMN_TYPES = {
    ACCOUNT_ID: 0,
    VALUE: 1,
    FACET: 2,
  }

async function writeFile(context, output, nrqlResults) {
  const { metadata: md0 } = nrqlResults[0],
    columns = {},
    rows = []
  let singleFacet

  logger.debug((log, format) => {
    log(format('NRQL results:'))
    log(format(nrqlResults))
  })

  // If there is more than one result, the query was run per account so
  // automatically include the account ID as a column.

  if (nrqlResults.length > 1) {
    columns['Account ID'] = COLUMN_TYPES.ACCOUNT_ID
  }

  // Add a column for each facet.
  // Also record the first facet name if it is the only one.

  if (md0.facets !== null && md0.facets.length > 0) {
    md0.facets.forEach((facet, index) => {
      columns[facet] = COLUMN_TYPES.FACET + index
    })
    singleFacet = md0.facets.length === 1 && md0.facets[0]
  }

  // Add properties to the columns object for all columns except for the
  // "facet" column or the name of the facet in the single facet case.
  //
  // TODO: Doing this in multiple passes which is not great but not sure
  // how to do it otherwise.

  nrqlResults.forEach(({ results }) => {
    Object.getOwnPropertyNames(results[0])
      .filter(r => r !== 'facet' && r !== singleFacet)
      .forEach(name => {
        columns[name] = COLUMN_TYPES.VALUE
      })
  })

  // Build up the rows. Start by getting all the column properties.
  // getOwnPropertyNames() will give us the property names in the order
  // they were added. For each result in each set of results, create
  // a row by adding values for all properties in order, defaulting to ''
  // for missing properties.

  const orderedColumnProps = Object.getOwnPropertyNames(columns)

  for (let index = 0; index < nrqlResults.length; index += 1) {
    const { accountId, results } = nrqlResults[index]

    results.forEach(r => {
      const { facet, ...rest } = r,
        row = []

      orderedColumnProps.reduce((accumulator, prop) => {
        const columnType = columns[prop]

        if (columnType === COLUMN_TYPES.ACCOUNT_ID) {
          row.push(accountId)
        } else if (columnType >= COLUMN_TYPES.FACET && Array.isArray(facet)) {
          const val = facet[columnType - COLUMN_TYPES.FACET]

          accumulator.push(val ? `${val}` : '')
        } else if (typeof rest[prop] !== 'undefined') {
          accumulator.push(`${rest[prop]}`)
        } else {
          accumulator.push('')
        }

        return accumulator
      }, row)

      rows.push(row)
    })
  }

  await writeCsv(output, orderedColumnProps, rows)
}

function runMultiConcurrentNrql(context, report, accountIds) {
  const {
      query,
      timeout,
    } = report,
    nrqlResults = [],
    errors = [],
    nerdgraph = new NerdgraphClient()

  function handleResults(results) {
    results.forEach(result => {
      const { data, error } = result

      if (error) {
        logger.error(error)
        errors.push(error)
        return
      }

      const { accountId, nrqlResult } = data

      if (!nrqlResult) {
        return
      }

      nrqlResults.push({ ...nrqlResult, accountId })
    })
  }

  return new Promise((resolve, reject) => {
    logger.verbose(`Running concurrent queries for ${accountIds.length} accounts...`)

    doAsyncWork(
      accountIds,
      DEFAULT_CONCURRENCY,
      async accountId => {
        const nrqlResult = await nerdgraph.runNrql(
          context.apiKey,
          [accountId],
          query,
          {
            timeout: timeout || 5,
            metadata: true,
          },
        )

        return { accountId, nrqlResult }
      },
      [],
      handleResults,
    ).then(() => {
      if (errors.length > 0) {
        reject(new Error('One or more queries failed. See additional output for details.'))
      }
      resolve(nrqlResults)
    })
  })
}

async function runMultiNrql(context, report, accountIds) {
  const {
      query,
      timeout,
    } = report,
    variables = {
      query: ['Nrql!', query],
      timeout: ['Seconds', timeout || 5],
    },
    nerdgraph = new NerdgraphClient()
  let q = ''

  logger.verbose(`Running aliased queries for ${accountIds.length} accounts...`)

  for (let index = 0; index < accountIds.length; index += 1) {
    q += `
      NrqlQuery${index}: actor {
        account(id: $accountId${index}) {
          nrql(query: $query, timeout: $timeout) {
            results
            metadata {
              facets
              eventTypes
            }
          }
        }
      }
    `
    variables[`accountId${index}`] = ['Int!', accountIds[index]]
  }

  const results = await nerdgraph.query(
    context.apiKey,
    `{${q}}`,
    variables,
  )

  return accountIds.reduce((accumulator, accountId, index) => {
    const { nrql } = results[0][`NrqlQuery${index}`].account

    if (!nrql || nrql.results.length === 0) {
      return accumulator
    }

    accumulator.push({ ...nrql, accountId })

    return accumulator
  }, [])
}

async function runNrql(context, report) {
  const accountIds = requireAccountIds(context),
    {
      query,
      timeout,
    } = report,
    multiAccountMode = strToLower(context.get(
      'multiAccountMode',
      null,
      'cross-account',
    )),
    nerdgraph = new NerdgraphClient()

  logger.verbose(`Running query report for query "${query}"...`)

  if (multiAccountMode === 'per-account') {
    return await runMultiNrql(context, report, accountIds)
  }

  if (multiAccountMode === 'per-account-concurrent') {
    return await runMultiConcurrentNrql(context, report, accountIds)
  }

  const result = await nerdgraph.runNrql(
    context.apiKey,
    accountIds,
    query,
    {
      timeout: timeout || 5,
      metadata: true,
    },
  )

  if (!result) {
    return null
  }

  return [result]
}

async function generateQueryReport(context, manifest, report, tempDir) {
  try {
    const results = await runNrql(context, report)

    if (!results || results.length === 0) {
      logger.warn(`No results returned for query ${report.query}.`)
      return null
    }

    const outputFileName = context.outputFileName,
      output = outputFileName ? path.join(tempDir, outputFileName) : (
        path.join(
          tempDir,
          `${report.name || 'query-report'}-${getFormattedDateTime()}.csv`,
        )
      )

    await writeFile(context, output, results)

    return [output]
  } catch (err) {
    logger.error(err)
  }

  return null
}

module.exports = {
  generate: generateQueryReport,
}
