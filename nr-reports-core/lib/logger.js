/* eslint-disable no-console */
'use strict'

const pino = require('pino')

class Logger {
  constructor(clazz, parentLogger = null) {
    if (parentLogger) {
      this.logger = parentLogger.logger.child({ component: clazz })
      parentLogger.children.push(this)
    } else {
      const pinoOpts = { name: clazz },
        logPretty = process.env.LOG_PRETTY_PRINT

      if (logPretty) {
        pinoOpts.transport = { target: 'pino-pretty' }
      }

      this.logger = pino(pinoOpts)
      this.children = []
    }
  }

  log(msg, type = 'info') {
    if (typeof msg === 'function') {
      msg(message => this.logger[type](message))
      return
    }

    this.logger[type](msg)
  }

  error(msg) {
    this.log(msg, 'error')
  }

  warn(msg) {
    this.log(msg, 'warn')
  }

  verbose(msg) {
    this.log(msg, 'debug')
  }

  debug(msg) {
    this.log(msg, 'trace')
  }

  set level(lvl) {
    this.logger.level = lvl
    if (this.children) {
      this.children.forEach(child => {
        child.logger.level = lvl
      })
    }
  }
}

const rootLogger = new Logger('nr-reports')

module.exports = {
  rootLogger,
  createLogger: clazz => (new Logger(clazz, rootLogger)),
}
