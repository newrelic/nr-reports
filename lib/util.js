'use strict'

const os = require('os'),
  path = require('path')

const ENDPOINTS = {
  GRAPHQL: {
    US: 'https://api.newrelic.com/graphql',
    EU: 'https://api.eu.newrelic.com/graphql',
  },
}

function getNestedHelper(val, arr = [], index = 0) {
  if (index === arr.length) {
    return false
  }

  if (typeof val === 'object') {
    const key = arr[index]

    if (index === arr.length - 1) {
      return val[key] ? val[key] : null
    }
    return val[key] ? getNestedHelper(val[key], arr, index + 1) : null
  }
  return false
}

function getNested(d, propPath) {
  return getNestedHelper(d, propPath.split('.'))
}

class HttpError extends Error {
  constructor(msg, status) {
    super(msg)

    this.status = status
  }
}

function raiseForStatus(response) {
  if (400 <= response.status && response.status < 500) {
    throw new HttpError(
      `${response.status} Client Error: ${response.statusText} for url: ${response.url}`,
    )
  }

  if (500 <= response.status && response.status < 600) {
    throw new HttpError(
      `${response.status} Server Error: ${response.statusText} for url: ${response.url}`,
    )
  }
}

function nonDestructiveMerge(target, source) {
  for (const prop in source) {
    if (!target[prop]) {
      target[prop] = source[prop]
    }
  }
  return target
}

function getApiKey() {
  // eslint-disable-next-line dot-notation
  const apiKey = process.env['NEW_RELIC_API_KEY']

  if (!apiKey) {
    throw Error('No api key found in NEW_RELIC_API_KEY')
  }

  return apiKey
}

function getTempFile() {
  return path.join(
    os.tmpdir(),
    `herald-${new Date().getTime()}`,
  )
}

module.exports = {
  ENDPOINTS,
  HttpError,
  getNested,
  raiseForStatus,
  nonDestructiveMerge,
  getApiKey,
  getTempFile,
}
