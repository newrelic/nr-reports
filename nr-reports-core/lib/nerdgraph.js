'use strict'

const fetch = require('node-fetch'),
  { createLogger, logTrace } = require('./logger'),
  {
    ENDPOINTS,
    getNested,
    raiseForStatus,
    nonDestructiveMerge,
  } = require('./util')

const logger = createLogger('nerdgraph')

class ApiError extends Error {
}

class NerdgraphError extends ApiError {
  constructor(msg, payload, response) {
    super(msg)
    this.payload = payload
    this.response = response
  }
}

function staticChartUrl(chart) {
  nonDestructiveMerge(
    chart,
    {
      type: 'LINE',
      format: 'PNG',
      width: 640,
      height: 480,
    },
  )

  return `staticChartUrl(chartType: ${chart.type}, format: ${chart.format}, width: ${chart.width}, height: ${chart.height})`
}

function nrqlResults(metadata) {
  return metadata ? ' results metadata { facets eventTypes } ' : ' results '
}

class NerdgraphClient {
  url(options) {
    return ENDPOINTS.GRAPHQL[(options.region || 'US').toUpperCase()]
  }

  headers(apiKey, headers = {}) {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Charset': 'utf-8',
      'API-Key': apiKey,
      ...headers,
    }
  }

  payload(
    query,
    variables = {},
    mutation = false,
  ) {
    const vars = {},
      keys = Object.keys(variables)
    let varSpec = keys.reduce((prev, key, index) => {
      let str = prev

      if (index > 0) {
        str += ','
      }

      const [type, value] = variables[key]

      // Yum, side effects
      vars[key] = value
      return `${str}$${key}: ${type}`
    }, '')

    if (keys.length > 0) {
      varSpec = `(${varSpec})`
    }

    return {
      query: `${mutation ? 'mutation' : 'query'}${varSpec}${query}`,
      variables: vars,
    }
  }

  async post(apiKey, payload, options = { headers: {} }) {
    logTrace(logger, log => {
      log({ payload }, 'GraphQL Request:')
    })

    const response = await fetch(this.url(options), {
      headers: this.headers(apiKey, options.headers),
      method: 'POST',
      body: JSON.stringify(payload),
    })

    raiseForStatus(response)

    const responseJson = await response.json()

    logTrace(logger, log => {
      log({ response: responseJson }, 'GraphQL Response:')
    })

    if (responseJson.errors) {
      const body = JSON.stringify(responseJson)

      logger.error(
        `GraphQL post error for query: ${body}`,
      )
      throw new ApiError(
        `GraphQL post error for query: ${body}`,
        payload,
        body,
      )
    }

    return responseJson.data
  }

  async query(
    apiKey,
    query,
    variables,
    options = {
      nextCursorPath: null,
      mutation: false,
      headers: {},
    },
  ) {
    const nextCursorPath = options.nextCursorPath,
      results = []
    let done = false,
      nextCursor = null

    while (!done) {
      if (nextCursorPath) {
        variables.cursor = ['String', nextCursor]
      }

      const gqlResult = await this.post(
        apiKey,
        this.payload(query, variables, options.mutation),
        options,
      )

      results.push(gqlResult)

      if (nextCursorPath) {
        nextCursor = getNested(gqlResult, nextCursorPath)
        if (!nextCursor) {
          throw new ApiError(
            `Expected value at path ${nextCursorPath} but found none`,
          )
        }
      }

      if (!nextCursor) {
        done = true
      }
    }

    return results
  }

  async runNrql(
    apiKey,
    accountIds,
    query,
    options = {
      headers: {},
      timeout: 5,
      metadata: false,
    },
  ) {
    const results = await this.query(
      apiKey,
      `
      {
        actor {
          nrql(accounts: $accountIds, query: $query, timeout: $timeout) {
            ${nrqlResults(options.metadata)}
          }
        }
      }
      `,
      {
        accountIds: ['[Int!]!', accountIds],
        query: ['Nrql!', query],
        timeout: ['Seconds', options.timeout],
      },
      options,
    )

    const nrql = results[0].actor.nrql

    if (!nrql) {
      return null
    }

    if (options.metadata) {
      return nrql.results.length > 0 ? nrql : null
    }

    return nrql.results.length > 0 ? nrql.results : null
  }

  async getShareableChartUrl(
    apiKey,
    accountId,
    query,
    chart = {},
    options = {
      headers: {},
      timeout: 5,
      metadata: false,
    },
  ) {
    const results = await this.query(
      apiKey,
      `
      {
        actor {
          account(id: $accountId) {
            nrql(query: $query, timeout: $timeout) {
              ${staticChartUrl(chart)}
            }
          }
        }
      }
      `,
      {
        accountId: ['Int!', accountId],
        query: ['Nrql!', query],
        timeout: ['Seconds', options.timeout],
      },
      options,
    )

    const nrql = results[0].actor.account.nrql

    if (!nrql) {
      return null
    }

    return nrql.staticChartUrl
  }

  async entitySearch(
    apiKey,
    query,
    fragment,
    options = {
      headers: {},
    },
  ) {
    const results = await this.query(
      apiKey,
      `
      {
          actor {
              entitySearch(query: $query) {
                  results(cursor: $cursor) {
                      entities {
                          ${fragment}
                      }
                      nextCursor
                  }
              }
          }
      }
      `,
      { query: ['String', query] },
      {
        ...options,
        nextCursorPath: 'actor.entitySearch.results.nextCursor',
      },
    )

    let entities = []

    results.forEach(result => {
      const resultEntities = getNested(
        result,
        'actor.entitySearch.results.entities',
      )

      if (resultEntities && resultEntities.length > 0) {
        entities = entities.concat(resultEntities)
      }
    })

    return entities
  }
}

module.exports = {
  ApiError,
  NerdgraphError,
  NerdgraphClient,
}
