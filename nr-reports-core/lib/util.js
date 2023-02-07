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
  },
  { access, mkdtemp, readFile, rmdir } = fs.promises

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
    if (typeof target[prop] === 'undefined') {
      target[prop] = source[prop]
    }
  }
  return target
}

function getTempPath(prefix) {
  return path.join(
    os.tmpdir(),
    prefix,
  )
}

function getArgv() {
  return process.argv.slice(2)
}

function getEnv(envName, defaultValue = null) {
  if (typeof process.env[envName] !== 'undefined') {
    return process.env[envName].trim()
  }

  return defaultValue
}

function getOption(options, optionName, envName = null, defaultValue = null) {
  if (options) {
    const type = options && typeof options[optionName]

    if (type !== 'undefined') {
      return type === 'string' ? options[optionName].trim() : options[optionName]
    }
  }

  return envName ? getEnv(envName, defaultValue) : defaultValue
}

function makeChannel(type) {
  return { type }
}

const DEFAULT_CHANNEL = 'file'

async function withTempDir(fn) {
  let tempDir

  try {
    tempDir = await mkdtemp(getTempPath('nr-reports-'))
    logger.verbose(`Created temporary directory ${tempDir}`)

    await fn(tempDir)
  } finally {
    try {
      if (
        tempDir && tempDir.trim() !== '/' &&
        tempDir.trim() !== '.'
      ) {

        /* Check for file existence */
        await access(tempDir, fs.constants.F_OK)

        logger.verbose(`Removing temporary directory ${tempDir}...`)
        await rmdir(tempDir, { recursive: true })
      }
    } catch (err) {
      logger.error(err)
    }
  }
}

function getDefaultChannel(report, defaultChannel) {
  if (!defaultChannel) {
    return makeChannel(DEFAULT_CHANNEL)
  }

  if (typeof defaultChannel === 'function') {
    return defaultChannel(report)
  }

  return defaultChannel
}

async function loadFile(filePath) {
  return await readFile(filePath, { encoding: 'utf-8' })
}

function parseManifest(contents, defaultChannel = null) {
  logger.debug((log, format) => {
    log(format('Parsing manifest:'))
    log(contents)
  })

  const data = JSON.parse(contents)

  logger.debug((log, format) => {
    log(format('Parsed manifest:'))
    log(JSON.stringify(data, null, 2))
  })

  if (!Array.isArray(data)) {
    throw new Error('Manifest must start with an array')
  }

  return data.map((report, index) => {
    if (!report.name) {
      throw new Error(`Report ${index} must include a 'name' property`)
    }

    if (report.templateName) {
      if (!report.parameters) {
        report.parameters = {}
      }
    } else if (report.dashboards) {
      report.combinePdfs = typeof report.combinePdfs !== 'undefined' ? (
        report.combinePdfs
      ) : false
    }

    if (!report.channels || report.channels.length === 0) {
      report.channels = [getDefaultChannel(report, defaultChannel)]
    }

    return report
  })
}

function parseJson(contents) {
  logger.debug((log, format) => {
    log(format('Parsing values:'))
    log(contents)
  })

  const data = JSON.parse(contents)

  logger.debug((log, format) => {
    log(format('Parsed values:'))
    log(JSON.stringify(data, null, 2))
  })

  return data
}

function splitPaths(paths) {
  return paths.split(path.delimiter)
}

function getFilenameWithNewExtension(templateName, ext) {
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
  getArgv,
  getEnv,
  getOption,
  makeChannel,
  loadFile,
  parseManifest,
  parseJson,
  splitPaths,
  getFilenameWithNewExtension,
  stringToBoolean,
  withTempDir,
  DEFAULT_CHANNEL,
}
