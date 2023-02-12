'use strict'

const path = require('path'),
  { createLogger } = require('../logger'),
  { getProperty, writeCsv, getFormattedDateTime } = require('../util'),
  { NerdgraphClient } = require('../nerdgraph')

const logger = createLogger('publisher')

async function generateQueryReport(engineOptions, manifest, report, tempDir) {
  try {
    const accountId = getProperty(
      'accountId',
      'NEW_RELIC_ACCOUNT_ID',
      null,
      report,
      manifest.variables,
    )

    if (!accountId) {
      logger.warn(`Missing account id for query report ${report.name}.`)
      return null
    }

    const {
        query,
      } = report,
      nerdgraph = new NerdgraphClient()

    logger.verbose(`Running query report for query ${query}...`)

    const result = await nerdgraph.runNrql(
      engineOptions.apiKey,
      accountId,
      query,
      {
        timeout: report.timeout || 5,
        metadata: true,
      },
    )

    if (!result) {
      logger.warn(`No results returned for query ${query}.`)
      return null
    }

    const {
        metadata,
        results,
      } = result,
      outputFileName = `${report.name}-${getFormattedDateTime()}.csv`,
      outputFilePath = path.join(tempDir, outputFileName),
      columns = [],
      rows = []

    if (metadata.facets !== null && metadata.facets.length > 0) {
      metadata.facets.forEach(facet => columns.push(facet))
    }

    Object.getOwnPropertyNames(results[0])
      .filter(r => r !== 'facet')
      .forEach(name => columns.push(name))

    results.forEach(r => {
      const { facet, ...rest } = r,
        row = []

      if (Array.isArray(facet)) {
        facet.forEach(f => row.push(f))
      }

      Object.getOwnPropertyNames(rest).forEach(name => {
        row.push(`${rest[name]}`)
      })

      rows.push(row)
    })

    await writeCsv(outputFilePath, columns, rows)

    return [outputFilePath]
  } catch (err) {
    logger.error(err)
  }

  return null
}

module.exports = {
  generate: generateQueryReport,
}
