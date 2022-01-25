'use strict'

const nunjucks = require('nunjucks'),
  publish = require('./channels'),
  { createLogger } = require('./logger'),
  NrqlExtension = require('./extensions/nrql-extension'),
  ChartExtension = require('./extensions/chart-extension'),
  DumpContextExtension = require('./extensions/dump-context-extension')

async function renderReport(browser, content, file) {
  const page = await browser.newPage()

  /*
  @todo
  page
    .on('console', message =>
      console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => console.log(message))
    .on('response', response =>
      console.log(`${response.status()} ${response.url()}`))
    .on('requestfailed', request =>
      console.log(`${request.failure()} ${request.url()}`))
  */

  await page.setContent(
    content,
    {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
    },
  )

  await page.pdf({
    path: file,
    format: 'Letter',
    margin: {
      top: '20px',
      left: '40px',
      bottom: '20px',
      right: '40px',
    },
  })
}

function renderTemplateFromFile(file, context = {}) {
  return new Promise((resolve, reject) => {
    nunjucks.render(file, context, (err, res) => {
      if (err) {
        reject(err)
        return
      }

      resolve(res)
    })
  })
}

function renderTemplateFromString(template, context = {}) {
  return new Promise((resolve, reject) => {
    nunjucks.renderString(template, context, (err, res) => {
      if (err) {
        reject(err)
        return
      }

      resolve(res)
    })
  })
}

class Engine {
  constructor(options) {
    const env = nunjucks.configure(options.templatesPath || null)

    env.addExtension('NrqlExtension', new NrqlExtension(options.apiKey))
    env.addExtension('ChartExtension', new ChartExtension(options.apiKey))
    env.addExtension('DumpContextExtension', new DumpContextExtension())

    this.env = env
    this.browser = options.browser
    this.logger = createLogger('engine')
  }

  async runReport(templatePath, values, outputPath, channels) {
    this.logger.verbose((log, format) => {
      log(format(`Rendering ${templatePath} to ${outputPath}`))
    })

    await renderReport(
      this.browser,
      await renderTemplateFromFile(templatePath, values),
      outputPath,
    )

    channels.forEach(channel => publish(channel, [outputPath], values))
  }

  async runReportFromString(template, values, outputPath) {
    this.logger.verbose((log, format) => {
      log(format(`Rendering string template to ${outputPath}`))
    })

    await renderReport(
      this.browser,
      await renderTemplateFromString(template, values),
      outputPath,
    )
  }
}

module.exports = Engine
