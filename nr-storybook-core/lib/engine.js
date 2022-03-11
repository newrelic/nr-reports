'use strict'

const nunjucks = require('nunjucks'),
  fetch = require('node-fetch'),
  PDFMerger = require('pdf-merger-js'),
  showdown = require('showdown'),
  fs = require('fs'),
  { createWriteStream } = require('fs'),
  path = require('path'),
  { pipeline } = require('stream'),
  { promisify } = require('util'),
  publish = require('./channels'),
  { createLogger } = require('./logger'),
  NrqlExtension = require('./extensions/nrql-extension'),
  ChartExtension = require('./extensions/chart-extension'),
  DumpContextExtension = require('./extensions/dump-context-extension'),
  { NerdgraphClient } = require('./nerdgraph'),
  { templateOutputName } = require('./util')

const logger = createLogger('engine'),
  converter = new showdown.Converter({
    ghCompatibleHeaderId: true,
    strikethrough: true,
    tables: true,
    tablesHeaderId: true,
    tasklists: true,
    openLinksInNewWindow: true,
    backslashEscapesHTMLTags: true,
  }),
  streamPipeline = promisify(pipeline)

converter.setFlavor('github')

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

async function downloadDashboardPdf(apiKey, dashboard, downloadDir) {
  const query = `{
      dashboardCreateSnapshotUrl(guid: $guid)
    }`,
    options = {
      nextCursonPath: null,
      mutation: true,
      headers: {},
    },
    nerdgraph = new NerdgraphClient(),
    results = await nerdgraph.query(
      apiKey,
      query,
      { guid: ['EntityGuid!', dashboard] },
      options,
    ),
    dashboardPdfFileName = path.join(
      downloadDir,
      `dashboard-${dashboard}.pdf`,
    ),
    dashboardUrl = results[0].dashboardCreateSnapshotUrl

  // todo: check for errors

  logger.verbose(`Fetching dashboard ${dashboardUrl}...`)

  const response = await fetch(dashboardUrl)

  if (!response.ok) {
    throw new Error(`Download PDF at ${dashboardUrl} failed: status=${response.status}`)
  }

  logger.verbose(`Writing PDF to ${dashboardPdfFileName}...`)
  await streamPipeline(response.body, createWriteStream(dashboardPdfFileName))
  logger.verbose(`Wrote PDF to ${dashboardPdfFileName}...`)

  return dashboardPdfFileName
}

async function mergePdfs(dashboardPdfs, consolidatedPdf) {
  const merger = new PDFMerger()

  logger.verbose((log, format) => {
    log(format(`Merging ${dashboardPdfs.length} PDFs to ${consolidatedPdf}...`))
    dashboardPdfs.forEach(pdf => log(format(pdf)))
  })

  dashboardPdfs.forEach(dashboard => merger.add(dashboard))

  logger.verbose(`Creating consolidated PDF ${consolidatedPdf}...`)
  await merger.save(consolidatedPdf)
}

class Engine {
  constructor(options) {
    const env = nunjucks.configure(options.templatesPath || null)

    env.addExtension('NrqlExtension', new NrqlExtension(options.apiKey))
    env.addExtension('ChartExtension', new ChartExtension(options.apiKey))
    env.addExtension('DumpContextExtension', new DumpContextExtension())

    this.apiKey = options.apiKey
    this.env = env
    this.browser = options.browser
  }

  async runReport(report) {
    const {
      template,
      parameters,
      channels,
      isMarkdown,
    } = report
    let downloadDir,
      templateIsMarkdown = isMarkdown

    try {
      downloadDir = fs.mkdtempSync('report-')
      logger.verbose(`Created temporary directory ${downloadDir}`)

      const output = path.join(downloadDir, templateOutputName(template))

      logger.verbose((log, format) => {
        log(format(`Rendering ${template} to ${output}...`))
      })

      if (templateIsMarkdown === 'undefined') {
        templateIsMarkdown = (path.extname(template.toLowerCase()) === '.md')
      }

      parameters.isMarkdown = templateIsMarkdown

      let content = await renderTemplateFromFile(template, parameters)

      if (templateIsMarkdown) {
        content = await renderTemplateFromString(
          `{% extends "report.md.html" %} {% block content %}${converter.makeHtml(content)}{% endblock %}`,
          parameters,
        )
      }

      await renderReport(
        this.browser,
        content,
        output,
      )

      await publish(channels, [output], parameters)
    } catch (err) {
      logger.error(err)
    } finally {
      try {
        if (
          downloadDir && downloadDir.trim() !== '/' &&
          downloadDir.trim() !== '.' &&
          fs.existsSync(downloadDir)
        ) {
          logger.verbose(`Removing temporary directory ${downloadDir}...`)
          fs.rmdirSync(downloadDir, { recursive: true })
        }
      } catch (err) {
        logger.error(err)
      }
    }
  }

  async runReportFromString(report) {
    const {
      template,
      parameters,
      isMarkdown,
      outputPath,
    } = report

    try {
      logger.verbose((log, format) => {
        log(format(`Rendering string template to ${outputPath}`))
      })

      parameters.isMarkdown = isMarkdown

      let content = await renderTemplateFromString(template, parameters)

      if (isMarkdown) {
        content = await renderTemplateFromString(
          `{% extends "report.md.html" %} {% block content %}${converter.makeHtml(content)}{% endblock %}`,
          parameters,
        )
      }

      await renderReport(
        this.browser,
        content,
        outputPath,
      )
    } catch (err) {
      logger.error(err)
    }
  }

  async runDashboardReport(report) {
    let downloadDir, consolidatedPdf

    try {
      downloadDir = fs.mkdtempSync('dashboards-')
      logger.verbose(`Created temporary directory ${downloadDir}`)

      const {
          dashboards,
          parameters,
          channels,
          combinePdfs,
        } = report,
        promises = dashboards.map(async dashboard => (
          await downloadDashboardPdf(this.apiKey, dashboard, downloadDir)
        )),
        dashboardPdfs = await Promise.all(promises)

      if (combinePdfs && dashboardPdfs.length > 1) {
        consolidatedPdf = path.join(downloadDir, 'consolidated_dashboards.pdf')
        await mergePdfs(dashboardPdfs, consolidatedPdf)
      }

      await publish(
        channels,
        combinePdfs ? [consolidatedPdf] : dashboardPdfs,
        parameters,
      )
    } catch (err) {
      logger.error(err)
    } finally {
      try {
        if (
          downloadDir && downloadDir.trim() !== '/' &&
          downloadDir.trim() !== '.' &&
          fs.existsSync(downloadDir)
        ) {
          logger.verbose(`Removing temporary directory ${downloadDir}...`)
          fs.rmdirSync(downloadDir, { recursive: true })
        }
      } catch (err) {
        logger.error(err)
      }
    }
  }
}

module.exports = Engine
