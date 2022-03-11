'use strict'

const fs = require('fs'),
  os = require('os'),
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

function getTempFile() {
  return path.join(
    os.tmpdir(),
    `storybook-${new Date().getTime()}`,
  )
}

function parseManifest(manifestFile) {
  const contents = fs.readFileSync(manifestFile, { encoding: 'utf-8' }),
    data = JSON.parse(contents)

  if (!Array.isArray(data)) {
    throw new Error(`${manifestFile} must start with an array`)
  }

  return data.map((report, index) => {
    if (!report.name) {
      throw new Error(`Report ${index} in ${manifestFile} must include a 'name' property`)
    }

    if (!report.parameters) {
      report.parameters = {}
    }

    if (!report.channels) {
      report.channels = [{ type: 'file' }]
    }

    if (!report.dashboards) {
      if (!report.template) {
        report.template = 'report.html'
      }

      return report
    }

    report.combinePdfs = typeof report.combinePdfs !== 'undefined' ? (
      report.combinePdfs
    ) : false

    return report
  })
}

function parseParams(paramFile) {
  const contents = fs.readFileSync(paramFile, { encoding: 'utf-8' })

  return JSON.parse(contents)
}

function splitPaths(paths) {
  return paths.split(path.delimiter)
}

function templateOutputName(templateName, ext = 'pdf') {
  const {
    name,
  } = path.parse(templateName)

  return `${name}.${ext}`
}

function stringToBoolean(str) {
  const lower = str.toLowerCase()

  if (lower === 'true' || lower === 'on' || lower === 'yes' || lower === '1') {
    return true
  }

  return false
}

module.exports = {
  ENDPOINTS,
  HttpError,
  getNested,
  raiseForStatus,
  nonDestructiveMerge,
  getTempFile,
  parseManifest,
  parseParams,
  splitPaths,
  templateOutputName,
  stringToBoolean,
}
