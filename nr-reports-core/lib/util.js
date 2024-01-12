'use strict'

const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  YAML = require('yaml'),
  { stringify } = require('csv-stringify'),
  showdown = require('showdown'),
  { createLogger, logTrace } = require('./logger'),
  { DEFAULT_PUBLISH_CONFIG_ID, DEFAULT_MANIFEST_ID } = require('./constants')

const logger = createLogger('util'),
  ENDPOINTS = {
    GRAPHQL: {
      US: 'https://api.newrelic.com/graphql',
      EU: 'https://api.eu.newrelic.com/graphql',
    },
  },
  DEFAULT_CONCURRENCY = 4,
  { access, mkdtemp, readFile, rmdir, unlink } = fs.promises,
  markdownConverter = new showdown.Converter({
    ghCompatibleHeaderId: true,
    strikethrough: true,
    tables: true,
    tablesHeaderId: true,
    tasklists: true,
    openLinksInNewWindow: true,
    backslashEscapesHTMLTags: true,
  }),
  SIMPLE_VAR_REGEX = /[{][{]\s*([a-zA-Z_$][a-zA-Z0-9$_]*)\s*[}][}]/ug

markdownConverter.setFlavor('github')

function isUndefined(val) {
  return typeof val === 'undefined'
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

function getEnvNs(
  context,
  envName,
  defaultValue = null,
) {
  const { namespace } = context

  if (!Array.isArray(namespace)) {
    return getEnv(envName, defaultValue)
  }

  for (let index = namespace.length - 1; index >= 0; index -= 1) {
    const value = getEnv(`${namespace[index]}.${envName}`)

    if (!isUndefined(value)) {
      return value
    }
  }

  return getEnv(envName, defaultValue)
}

function getOption(options, optionName, envName = null, defaultValue = null) {
  if (options) {
    const type = typeof options[optionName]

    if (type !== 'undefined') {
      return type === 'string' ? options[optionName].trim() : options[optionName]
    }
  }

  return envName ? getEnv(envName, defaultValue) : defaultValue
}

class Context {
  constructor(ns, ...objs) {
    this.namespace = ns
    for (const obj of objs) {
      if (obj) {
        for (const prop of Object.getOwnPropertyNames(obj)) {
          if (typeof this[prop] !== 'function') {
            this[prop] = obj[prop]
          }
        }
      }
    }
  }

  context(obj) {
    return new Context(this.namespace, this, obj)
  }

  contextNs(ns, obj) {
    return new Context(this.namespace.concat(ns), this, obj)
  }

  get(propName, envName = null, defaultValue = null) {
    return getOption(this, propName, envName, defaultValue)
  }

  getWithEnvNs(propName, envName = null, defaultValue = null) {
    const opt = getOption(this, propName)

    if (!isUndefined(opt)) {
      return opt
    }

    return getEnvNs(this, envName, defaultValue)
  }
}

function makeContext(...objs) {
  return new Context([], ...objs)
}

function makeChannel(id, type, props) {
  return {
    id,
    type,
    ...props,
  }
}

const DEFAULT_CHANNEL = 'file'

async function withTempDir(fn) {
  let tempDir

  try {
    tempDir = await mkdtemp(getTempPath('nr-reports-'))
    logger.debug(`Created temporary directory ${tempDir}`)

    await fn(tempDir)
  } finally {
    try {
      if (
        tempDir && tempDir.trim() !== '/' &&
        tempDir.trim() !== '.'
      ) {

        /* Check for file existence */
        await access(tempDir, fs.constants.F_OK)

        logger.debug(`Removing temporary directory ${tempDir}...`)
        await rmdir(tempDir, { recursive: true })
      }
    } catch (err) {
      logger.error(err)
    }
  }
}

async function withTempFile(fn, tempDir, fileName) {
  let tempFile

  try {
    tempFile = path.join(tempDir, fileName)

    await fn(tempFile)
  } finally {
    try {
      if (tempFile) {

        /* Check for file existence */
        await access(tempFile, fs.constants.F_OK)

        logger.debug(`Removing temporary file ${tempFile}...`)
        await unlink(tempFile)
      }
    } catch (err) {
      logger.error(err)
    }
  }
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

function normalizeManifestHelper(manifest, defaultChannelType, channelDefaults) {
  manifest.reports.forEach((report, index) => {
    if (!report.id) {
      throw new Error(`Report ${index} must include an 'id' property`)
    }

    const reportName = report.name || report.id

    if (report.templateName) {
      if (!report.parameters) {
        report.parameters = {}
      }
    } else if (report.dashboards) {
      report.combinePdfs = typeof report.combinePdfs !== 'undefined' ? (
        report.combinePdfs
      ) : false
    }

    if (
      !Array.isArray(report.publishConfigs) ||
      report.publishConfigs.length === 0
    ) {
      report.publishConfigs = [
        {
          id: DEFAULT_PUBLISH_CONFIG_ID,
          channels: [makeChannel(
            `${report.id}.${DEFAULT_PUBLISH_CONFIG_ID}.${defaultChannelType}`,
            defaultChannelType,
            channelDefaults,
          )],
        },
      ]
    } else {
      report.publishConfigs.forEach((publishConfig, jindex) => {
        if (!publishConfig.id) {
          throw new Error(`Publish configuration with index ${jindex} for report "${reportName}" must include an 'id' property`)
        }

        const publishConfigName = publishConfig.name || publishConfig.id

        if (
          !Array.isArray(publishConfig.channels) ||
          publishConfig.channels.length === 0
        ) {
          report.publishConfigs[jindex].channels = [makeChannel(
            `${report.id}.${publishConfig.id}.${defaultChannelType}`,
            defaultChannelType,
            channelDefaults,
          )]
        } else {
          publishConfig.channels.forEach((channel, kindex) => {
            if (!channel.id) {
              throw new Error(`Channel with index ${kindex} for publish configuration "${publishConfigName}" and report "${reportName}" must include an 'id' property`)
            }
          })
        }
      })
    }
  })

  if (!manifest.variables) {
    manifest.variables = {}
  }

  if (!manifest.config) {
    manifest.config = {}
  }

  return manifest
}

function normalizeManifest(manifest, defaultChannelType, channelDefaults) {
  if (Array.isArray(manifest)) {
    logger.trace('Manifest starts with array')
    return normalizeManifestHelper(
      {
        id: DEFAULT_MANIFEST_ID,
        reports: manifest,
      },
      defaultChannelType,
      channelDefaults,
    )
  }

  if (!Array.isArray(manifest.reports)) {
    throw new Error('Manifest is missing "reports" array or it is not an array')
  }

  return normalizeManifestHelper(manifest, defaultChannelType, channelDefaults)
}

function parseJaml(fileName, contents) {
  logTrace(logger, log => {
    log({ contents }, 'Parsing JSON/YML:')
  })

  const data = isYaml(fileName) ? (
    YAML.parse(contents)
  ) : JSON.parse(contents)

  logTrace(logger, log => {
    log({ data }, 'Parsed JSON/YML:')
  })

  return data
}

function splitPaths(paths) {
  return paths.split(path.delimiter)
}

function splitStringAndTrim(str, delimiter = ',') {
  return str.split(delimiter).map(s => s.trim())
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

function trimStringAndLower(input, defaultValue = null) {
  if (!input) {
    return defaultValue
  }

  return input.trim().toLowerCase()
}

function toString(input, defaultValue = '') {
  const type = typeof input

  if (type === 'undefined') {
    return defaultValue
  }

  if (type === 'string') {
    return input
  }

  return input.toString()
}

function toBoolean(input) {
  const type = typeof input

  if (type === 'boolean') {
    return input
  }

  if (Number.isInteger(input)) {
    return input === 1
  }

  if (type === 'string') {
    const lower = trimStringAndLower(input)

    if (lower === 'true' || lower === 'on' || lower === 'yes' || lower === '1') {
      return true
    }
  }

  return false
}

function toNumber(input) {
  if (Number.isInteger(input)) {
    return input
  }

  if (typeof input === 'string') {
    const str = input.trim()

    if (str.length > 0) {
      return Number.parseInt(str, 10)
    }
  }

  return null
}

function toDate(input) {
  if (typeof input === 'undefined') {
    return null
  }

  let date

  if (Number.isInteger(input)) {
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

function buildCsv(columns, rows) {
  const stringifier = stringify({
      header: true,
      columns,
    }),
    data = []

  logger.debug(`Generating ${rows.length} rows...`)

  return new Promise((resolve, reject) => {
    stringifier.on('readable', () => {
      let row

      while ((row = stringifier.read()) !== null) {
        data.push(row)
      }
    })

    stringifier.on('error', err => {
      logger.error(err.message)
      reject(err)
    })

    stringifier.on('finish', () => {
      logger.debug(
        `Finished generating ${rows.length} rows.`,
      )
      resolve(data.join(''))
    })

    rows.forEach(row => {
      stringifier.write(row)
    })

    stringifier.end()
  })
}

function getAccountId(context) {
  let accountId = getOption(context, 'accountId')

  if (!accountId) {
    accountId = context.secrets.accountId
  }

  if (!accountId) {
    accountId = getEnv('NEW_RELIC_ACCOUNT_ID')
  }

  if (!accountId) {
    throw new Error('Missing account ID(s)')
  }

  return accountId
}

function requireAccountId(context) {
  const n = toNumber(getAccountId(context))

  if (!n) {
    throw new Error(`'${n}' is not a valid account ID.`)
  }

  return n
}

function requireAccountIds(context) {
  let accountIds = getOption(context, 'accountIds')

  if (!accountIds) {
    const accountId = getAccountId(context)

    accountIds = typeof accountId === 'string' ? (
      splitStringAndTrim(accountId)
    ) : [accountId]
  } else if (typeof accountIds === 'string') {
    accountIds = splitStringAndTrim(accountIds.trim())
  }

  if (Array.isArray(accountIds) && accountIds.length > 0) {
    return accountIds.reduce((u, v) => {
      const n = toNumber(v)

      if (!n) {
        throw new Error(`'${v}' is not a valid account ID.`)
      }

      u.push(n)

      return u
    }, [])
  }

  throw new Error('No valid account IDs found.')
}

function doAsyncWork(items, max, fn, args, cb) {
  return new Promise(resolve => {
    const count = items.length

    function doMoreWork(index) {
      if (index >= count) {
        resolve()
        return
      }

      const u = items.slice(index, index + max),
        results = u.map(() => ({ complete: false, data: null, error: null }))

      u.forEach((v, uindex) => {
        fn(v, index + uindex, items, ...args)
          .then(result => {
            results[uindex].data = result
          })
          .catch(err => {
            results[uindex].error = err
          })
          .finally(() => {
            results[uindex].complete = true

            for (const result of results) {
              if (!result.complete) {
                return
              }
            }

            // eslint-disable-next-line node/callback-return
            cb(results)
            doMoreWork(index + u.length)
          })
      })
    }

    doMoreWork(0)
  })
}

function markdownToHtml(text) {
  return markdownConverter.makeHtml(text)
}

function format(str, replacements) {
  return str.replace(
    SIMPLE_VAR_REGEX,
    (_, key) => {
      if (replacements[key]) {
        return replacements[key]
      }
      return key
    },
  )
}

module.exports = {
  DEFAULT_CHANNEL,
  DEFAULT_CONCURRENCY,
  ENDPOINTS,
  HttpError,
  Context,
  makeContext,
  makeChannel,
  getNested,
  raiseForStatus,
  nonDestructiveMerge,
  getArgv,
  getEnv,
  getEnvNs,
  getOption,
  loadFile,
  normalizeManifest,
  parseJaml,
  splitPaths,
  splitStringAndTrim,
  toBoolean,
  withTempDir,
  withTempFile,
  shouldRender,
  toString,
  toNumber,
  toDate,
  getFormattedDateTime,
  isUndefined,
  buildCsv,
  requireAccountId,
  requireAccountIds,
  trimStringAndLower,
  doAsyncWork,
  markdownToHtml,
  format,
}
