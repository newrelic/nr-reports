'use strict'

const nunjucks = require('nunjucks'),
  // eslint-disable-next-line node/no-extraneous-require
  merge = require('easy-pdf-merge'),
  fs = require('fs'),
  path = require('path'),
  { createLogger } = require('./logger'),
  NrqlExtension = require('./extensions/nrql-extension'),
  ChartExtension = require('./extensions/chart-extension'),
  DumpContextExtension = require('./extensions/dump-context-extension'),
  { NerdgraphClient } = require('./nerdgraph')

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
    this.logger = createLogger('engine')
    this.apiKey = options.apiKey
  }

  async runReport(templatePath, values, outputPath) {
    this.logger.verbose((log, format) => {
      log(format(`Rendering ${templatePath} to ${outputPath}`))
    })

    await renderReport(
      this.browser,
      await renderTemplateFromFile(templatePath, values),
      outputPath,
    )
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

  mergePdfs(dashboardPdfs, consolidatedPdf) {
    merge(dashboardPdfs, consolidatedPdf, err => {
      if (err) {
        this.logger.error(
          `failed to consolidate dashboards: ${err}`,
        )
      }
    })
  }

  async getDashboards(dashboards) {
    const nerdgraph = new NerdgraphClient()
    const downloadDir = path.join('.', 'dashboards', `${new Date().getTime().toString()}`)

    fs.mkdir(downloadDir, { recursive: true }, err => {
      if (err) {
        throw err
      }
    })
    this.logger.log(`: dashboard report directory: ${downloadDir}`)
    const dashboardPdfs = await nerdgraph.runMutation(this.apiKey, dashboards, downloadDir)
    const consolidatedPdf = path.join(downloadDir, 'consolidated_dashboards.pdf')

    setTimeout(() => {
      this.mergePdfs(dashboardPdfs, consolidatedPdf)
    },
    dashboards.length * 5000)
  }
}

module.exports = Engine
