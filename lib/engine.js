'use strict'

const fs = require('fs'),
  nunjucks = require('nunjucks'),
  NrqlExtension = require('./extensions/nrql-extension'),
  ChartExtension = require('./extensions/chart-extension'),
  DumpContextExtension = require('./extensions/dump-context-extension')

async function renderReport(browser, content, file) {
  const page = await browser.newPage()

  /*
  page
    .on('console', message =>
      console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => console.log(message))
    .on('response', response =>
      console.log(`${response.status()} ${response.url()}`))
    .on('requestfailed', request =>
      console.log(`${request.failure()} ${request.url()}`))
  */

  await page.setContent(content)
  await page.pdf({ path: file, format: 'Letter' })
  await browser.close()
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
  }

  async runReport(templatePath, valuesPath, outputPath) {
    const data = fs.readFileSync(valuesPath, { encoding: 'utf-8' }),
      values = JSON.parse(data)

    await renderReport(
      this.browser,
      await renderTemplateFromFile(templatePath, values),
      outputPath,
    )
  }

  async runReportFromString(template, values, outputPath) {
    await renderReport(
      this.browser,
      await renderTemplateFromString(template, values),
      outputPath,
    )
  }
}

module.exports = Engine
