/* eslint-disable no-console */
'use strict'

const pino = require('pino')

const LOG_LEVEL_TRACE = 'trace',
  LOG_LEVEL_DEBUG = 'debug',
  LOG_LEVEL_INFO = 'info',
  LOG_LEVEL_WARN = 'warn',
  LOG_LEVEL_ERROR = 'error',
  LOG_LEVEL_FATAL = 'fatal',
  DEFAULT_LOG_LEVEL = LOG_LEVEL_WARN

function createRootLogger() {
  const pinoOpts = { name: 'nr-reports', level: DEFAULT_LOG_LEVEL },
    logPretty = process.env.LOG_PRETTY_PRINT

  if (logPretty) {
    pinoOpts.transport = { target: 'pino-pretty' }
  }

  // Per https://github.com/pinojs/pino/issues/416, creating child loggers
  // is a hot path and keeping child arrays around per logger can make it
  // worse. But our loggers are long lived so it should be ok.

  const logger = pino(pinoOpts)

  logger.children = []

  return logger
}

const rootLogger = createRootLogger()

function createLogger(clazz, parentLogger = rootLogger) {
  const logger = parentLogger.child({ component: clazz })

  parentLogger.children.push(logger)

  return logger
}

function setLogLevel(logger, level) {
  logger.level = level
  if (logger.children) {
    logger.children.forEach(child => {
      child.level = level
    })
  }
}

function obfuscate(obj, level = 0) {
  if (level > 3) {
    return Array.isArray(obj) ? (
      `[array],length:${obj.length} (max depth exceeded)`
    ) : (
      '[object] (max depth exceeded)'
    )
  }

  const objPrime = {}

  Object.getOwnPropertyNames(obj).forEach(prop => {
    const type = typeof obj[prop]

    if (/newrelic|browser|key|token|password|secret|account|user|pass|pwd/iu.test(prop)) {
      objPrime[prop] = '[REDACTED]'
      return
    }

    objPrime[prop] = obj[prop] && type === 'object' ? (
      obfuscate(obj[prop], level + 1)
    ) : obj[prop]
  })

  return objPrime
}

function logSafe(logger, type, fn) {
  if (logger.isLevelEnabled(type)) {
    fn((...args) => {
      const [first, ...rest] = args
      let newArgs = args

      if (typeof first === 'object') {
        newArgs = [obfuscate(first), ...rest]
      }

      logger[type](...newArgs)
    })
  }
}

function logTrace(logger, fn) {
  logSafe(logger, LOG_LEVEL_TRACE, fn)
}

module.exports = {
  rootLogger,
  createLogger,
  setLogLevel,
  LOG_LEVEL_TRACE,
  LOG_LEVEL_DEBUG,
  LOG_LEVEL_INFO,
  LOG_LEVEL_WARN,
  LOG_LEVEL_ERROR,
  LOG_LEVEL_FATAL,
  DEFAULT_LOG_LEVEL,
  logSafe,
  logTrace,
}
