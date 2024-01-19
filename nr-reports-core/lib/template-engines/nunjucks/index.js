'use strict'

const nunjucks = require('nunjucks'),
  NrqlExtension = require('./extensions/nrql-extension'),
  ChartExtension = require('./extensions/chart-extension'),
  DumpContextExtension = require('./extensions/dump-context-extension'),
  { createLogger, logTrace } = require('../../logger'),
  { splitPaths, markdownToHtml: convertMarkdown } = require('../../util')

const logger = createLogger('nunjucks')

function init(context) {
  const {
    templatePath,
  } = context

  logger.trace('Configuring Nunjucks...')

  const templatesPath = ['.', 'include', 'templates']

  if (templatePath) {
    splitPaths(templatePath).forEach(p => {
      if (p) {
        templatesPath.push(p)
      }
    })
  }

  logTrace(logger, log => {
    log({ templatesPath }, 'Final template path:')
  })

  const env = nunjucks.configure(templatesPath)

  env.addExtension('NrqlExtension', new NrqlExtension())
  env.addExtension('ChartExtension', new ChartExtension())
  env.addExtension('DumpContextExtension', new DumpContextExtension())

  return env
}

function processTemplateFile(file, renderContext) {
  return new Promise((resolve, reject) => {
    logger.trace(`Processing template file ${file}...`)

    logTrace(logger, log => {
      log(renderContext, 'Render context')
    })

    nunjucks.render(file, renderContext, (err, res) => {
      if (err) {
        reject(err)
        return
      }

      logTrace(logger, log => {
        log('Render result:')
        log(res)
      })

      resolve(res)
    })
  })
}

function processTemplateString(template, renderContext) {
  return new Promise((resolve, reject) => {
    logger.trace('Processing template string...')

    logTrace(logger, log => {
      log(renderContext, 'Render context:')
    })

    nunjucks.renderString(template, renderContext, (err, res) => {
      if (err) {
        reject(err)
        return
      }

      logTrace(logger, log => {
        log('Render result:')
        log(res)
      })

      resolve(res)
    })
  })
}

function markdownToHtml(markdown) {
  return nunjucks.renderString(
    `{% extends "base/report.md.html" %} {% block content %}${convertMarkdown(markdown)}{% endblock %}`,
    {},
  )
}

processTemplateFile.init = init
processTemplateFile.fromString = processTemplateString
processTemplateFile.markdownToHtml = markdownToHtml

module.exports = processTemplateFile
