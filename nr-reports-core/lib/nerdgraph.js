'use strict'

const fetch = require('node-fetch'),
  { createLogger } = require('./logger'),
  {
    ENDPOINTS,
    getNested,
    raiseForStatus,
    nonDestructiveMerge,
  } = require('./util')

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
  constructor() {
    this.logger = createLogger('nerdgraph')
  }

  url(options) {
    return ENDPOINTS.GRAPHQL[(options.region || 'US').toUpperCase()]
  }

  headers(apiKey, headers = {}) {
    return Object.assign(
      {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Charset': 'utf-8',
        'API-Key': apiKey,
      },
      headers,
    )
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
    this.logger.debug((writer, formatter) => {
      writer(formatter(JSON.stringify(payload)))
    })

    const response = await fetch(this.url(options), {
      headers: this.headers(apiKey, options.headers),
      method: 'POST',
      body: JSON.stringify(payload),
    })

    raiseForStatus(response)

    const responseJson = await response.json()

    this.logger.debug(async (writer, formatter) => {
      writer(formatter(JSON.stringify(responseJson)))
    })


    if (responseJson.errors) {
      const body = JSON.stringify(responseJson)

      this.logger.error(
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
    accountId,
    query,
    options = {
      headers: {},
      timeout: 5,
      chart: null,
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
              ${options.chart ? staticChartUrl(options.chart) : nrqlResults(options.metadata)}
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

    if (options.chart) {
      return nrql.staticChartUrl
    }

    if (options.metadata) {
      return nrql.results.length > 0 ? ({
        metadata: nrql.metadata,
        results: nrql.results,
      }) : null
    }

    return nrql.results.length > 0 ? nrql.results : null
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
      Object.assign(
        options,
        { nextCursorPath: 'actor.entitySearch.results.nextCursor' },
      ),
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
