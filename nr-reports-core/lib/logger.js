/* eslint-disable no-console */
'use strict'

const fs = require('fs')

class FileHandler {
  constructor(fileName) {
    this.out = fs.createWriteStream(fileName, { autoClose: true })
  }

  log(msg) {
    this.out.write(`${msg}\n`)
  }

  error(msg) {
    this.out.write(`${msg}\n`)
  }

  warn(msg) {
    this.out.write(`${msg}\n`)
  }
}

function write(handlers, type, msg) {
  handlers.forEach(handler => {
    handler[type](msg)
  })
}

function formatMessage(msg) {
  if (typeof msg !== 'object') {
    return msg
  }

  if (msg instanceof Error) {
    if (msg.stack) {
      return `\n${msg.stack}`
    }

    return msg.message
  }

  return `\n${JSON.stringify(msg, null, 2)}`
}

class Logger {
  constructor(clazz, parentLogger = null) {
    this.CLASS = clazz
    this.children = []

    if (parentLogger) {
      this.VERBOSE = parentLogger.VERBOSE
      this.DEBUG = parentLogger.DEBUG
      parentLogger.children.push(this)
      this.logHandlers = parentLogger.logHandlers
    } else {
      this.VERBOSE = false
      this.DEBUG = false
      this.logHandlers = [console]
    }

    this.format = this.formatter()
  }

  formatter() {
    return msg => {
      const now = new Date(),
        message = formatMessage(msg)

      return `[${now.toUTCString()}] ${this.CLASS} ${message}`
    }
  }

  log(msg, type = 'log') {
    if (typeof msg === 'function') {
      const logHandlers = this.logHandlers

      msg(message => write(logHandlers, type, message), this.format)
      return
    }

    if (!msg || msg.length === 0) {
      write(this.logHandlers, type, '')
      return
    }

    write(this.logHandlers, type, this.format(msg))
  }

  error(msg) {
    this.log(msg, 'error')
  }

  warn(msg) {
    this.log(msg, 'warn')
  }

  verbose(msg) {
    // eslint-disable-next-line no-unused-expressions
    (this.VERBOSE || this.DEBUG) && this.log(msg)
  }

  debug(msg) {
    // eslint-disable-next-line no-unused-expressions
    this.DEBUG && this.log(msg)
  }

  set isVerbose(verbose) {
    this.VERBOSE = verbose
    if (this.children.length > 0) {
      this.children.forEach(child => {
        child.VERBOSE = verbose
      })
    }
  }

  set isDebug(debug) {
    this.DEBUG = debug
    if (this.children.length > 0) {
      this.children.forEach(child => {
        child.DEBUG = debug
      })
    }
  }

  set handlers(handlers) {
    if (Array.isArray(handlers)) {
      this.logHandlers = handlers
      return
    }

    this.logHandlers = [handlers]
  }
}

const rootLogger = new Logger('nr-reports')

module.exports = {
  rootLogger,
  createLogger: clazz => (new Logger(clazz, rootLogger)),
  FileHandler,
}
