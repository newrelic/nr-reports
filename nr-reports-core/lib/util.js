'use strict'

const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  { createLogger } = require('./logger')

const logger = createLogger('util'),
  ENDPOINTS = {
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
    `report-${new Date().getTime()}`,
  )
}

async function withTempDir(fn) {
  let tempDir

  try {
    tempDir = fs.mkdtempSync('nr-reports-')
    logger.verbose(`Created temporary directory ${tempDir}`)

    await fn(tempDir)
  } finally {
    try {
      if (
        tempDir && tempDir.trim() !== '/' &&
        tempDir.trim() !== '.' &&
        fs.existsSync(tempDir)
      ) {
        logger.verbose(`Removing temporary directory ${tempDir}...`)
        fs.rmdirSync(tempDir, { recursive: true })
      }
    } catch (err) {
      logger.error(err)
    }
  }
}

function parseManifest(contents, defaultChannel = null) {
  const data = JSON.parse(contents)

  if (!Array.isArray(data)) {
    throw new Error('Manifest must start with an array')
  }

  return data.map((report, index) => {
    if (!report.name) {
      throw new Error(`Report ${index} must include a 'name' property`)
    }

    if (!report.parameters) {
      report.parameters = {}
    }

    if (!report.channels) {
      report.channels = [defaultChannel || { type: 'file' }]
    }

    if (report.dashboards) {
      report.combinePdfs = typeof report.combinePdfs !== 'undefined' ? (
        report.combinePdfs
      ) : false

      return report
    }

    return report
  })
}

function loadManifest(manifestFile, defaultChannel = null) {
  const contents = fs.readFileSync(manifestFile, { encoding: 'utf-8' })

  return parseManifest(contents, defaultChannel)
}

function parseParams(contents) {
  return JSON.parse(contents)
}

function loadParams(valuesFile) {
  const contents = fs.readFileSync(valuesFile, { encoding: 'utf-8' })

  return parseParams(contents)
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
  loadManifest,
  parseManifest,
  loadParams,
  parseParams,
  splitPaths,
  templateOutputName,
  stringToBoolean,
  withTempDir,
}
