'use strict'

const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  YAML = require('yaml'),
  { stringify } = require('csv-stringify'),
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

function getProperty(propName, envName, defaultValue, ...objs) {
  for (const obj of objs) {
    if (obj) {
      const type = typeof obj[propName]

      if (type !== 'undefined') {
        return type === 'string' ? obj[propName].trim() : obj[propName]
      }
    }
  }

  return envName ? getEnv(envName, defaultValue) : defaultValue
}

function getOption(options, optionName, envName = null, defaultValue = null) {
  return getProperty(optionName, envName, defaultValue, options)
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

function isYaml(fileName) {
  let {
    ext,
  } = path.parse(fileName)

  if (!ext || ext.length <= 1) {
    return false
  }

  ext = ext.slice(1).toLowerCase()

  return ext === 'yml' || ext === 'yaml'
}

function parseManifest(manifestFile, contents, defaultChannel = null) {
  logger.debug((log, format) => {
    log(format('Parsing manifest:'))
    log(contents)
  })

  let data = isYaml(manifestFile) ? (
    YAML.parse(contents)
  ) : JSON.parse(contents)

  logger.debug((log, format) => {
    log(format('Parsed manifest:'))
    log(JSON.stringify(data, null, 2))
  })

  if (Array.isArray(data)) {
    logger.verbose('Manifest starts with array')
    data = {
      reports: data,
    }
  } else if (!Array.isArray(data.reports)) {
    throw new Error('Manifest is missing "reports" array or it is not an array')
  }

  data.reports.forEach((report, index) => {
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
  })

  if (!data.variables) {
    data.variables = {}
  }

  if (!data.config) {
    data.config = {}
  }

  return data
}

function parseJaml(fileName, contents) {
  logger.debug((log, format) => {
    log(format('Parsing JSON/YML:'))
    log(contents)
  })

  const data = isYaml(fileName) ? (
    YAML.parse(contents)
  ) : JSON.parse(contents)

  logger.debug((log, format) => {
    log(format('Parsed JSON/YML:'))
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

function getDefaultOutputFilename(templateName) {
  const {
    name,
    ext,
  } = path.parse(templateName)

  return `${name}.out${ext}`
}

function stringToBoolean(str) {
  const lower = str.toLowerCase()

  if (lower === 'true' || lower === 'on' || lower === 'yes' || lower === '1') {
    return true
  }

  return false
}

function shouldRender(report) {
  return report.templateName && (
    typeof report.render === 'undefined' || report.render
  )
}

function pad(number, length) {
  let str = `${number}`

  while (str.length < length) {
    str = `0${str}`
  }

  return str
}

function toDate(input) {
  if (typeof input === 'undefined') {
    return null
  }

  let date

  if (typeof input === 'number') {
    if (input > 0 && input < 1000000000000) {
      date = new Date(input * 1000)
    } else {
      date = new Date(input)
    }
  } else if (Object.prototype.toString.call(input) !== '[object Date]') {
    date = new Date(input)
  } else {
    date = input
  }

  if (isNaN(date.getDate()) || date.getTime() === 0) {
    return null
  }

  return date
}

function getFormattedDateTime(input = new Date()) {
  const date = toDate(input)

  if (!date) {
    return ''
  }

  const month = pad(date.getUTCMonth() + 1, 2),
    day = pad(date.getUTCDate(), 2),
    year = date.getUTCFullYear(),
    hour = pad(date.getUTCHours(), 2),
    minutes = pad(date.getUTCMinutes(), 2),
    seconds = pad(date.getUTCSeconds(), 2)

  return `${year}-${month}-${day}_${hour}${minutes}${seconds}`
}

function writeCsv(filePath, columns, rows) {
  const file = fs.createWriteStream(filePath, { encoding: 'utf-8' }),
    stringifier = stringify({
      header: true,
      columns,
    })

  logger.verbose(`Exporting ${rows.length} rows...`)
  logger.debug(log => {
    rows.forEach(row => log(JSON.stringify(row)))
  })

  return new Promise((resolve, reject) => {
    stringifier.on('readable', () => {
      let row = stringifier.read()

      while (row) {
        file.write(row)
        row = stringifier.read()
      }
    })

    stringifier.on('error', err => {
      logger.error(err.message)
      file.close(() => reject(err))
    })

    stringifier.on('finish', () => {
      file.end()
      logger.verbose(
        `Finished writing ${filePath}!\n${rows.length} rows exported.`,
      )
      file.close(err => {
        if (err) {
          reject(err)
        }
        resolve()
      })
    })

    rows.forEach(row => {
      stringifier.write(row)
    })

    stringifier.end()
  })
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
  getProperty,
  makeChannel,
  loadFile,
  parseManifest,
  parseJaml,
  splitPaths,
  getFilenameWithNewExtension,
  getDefaultOutputFilename,
  stringToBoolean,
  withTempDir,
  shouldRender,
  toDate,
  getFormattedDateTime,
  writeCsv,
  DEFAULT_CHANNEL,
}
