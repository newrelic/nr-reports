'use strict'

const nunjucks = require('nunjucks'),
  fetch = require('node-fetch'),
  PDFMerger = require('pdf-merger-js'),
  showdown = require('showdown'),
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
  logger.verbose(`Creating new browser page to render PDF to ${file}...`)

  const page = await browser.newPage()

  page
    .on('console', message => logger.verbose(`chrome-console: ${message.type().slice(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => logger.error(`chrome-pageerror: ${message}`))
    .on('response', response => logger.verbose(`chrome-response: ${response.status()} ${response.url()}`))
    .on('requestfailed', request => logger.error(`chrome-requestfailed: ${request.failure()} ${request.url()}`))

  logger.debug((log, format) => {
    log(format('Dumping HTML content:'))
    log(content)
  })

  await page.setContent(
    content,
    {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
    },
  )

  logger.verbose(`Saving PDF to ${file}...`)

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
    logger.verbose(`Rendering file template named ${file}...`)

    logger.debug((log, format) => {
      log(format('Context:'))
      log(context)
    })

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
    logger.verbose('Rendering template content...')

    logger.debug((log, format) => {
      log(format('Context:'))
      log(context)
    })

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

  async runTemplateReport(report, tempDir) {
    const {
      templateName,
      parameters,
      channels,
      isMarkdown,
    } = report
    let templateIsMarkdown = isMarkdown

    try {
      const output = path.join(tempDir, templateOutputName(templateName))

      logger.verbose(`Rendering ${templateName} to ${output}...`)

      if (typeof templateIsMarkdown === 'undefined') {
        templateIsMarkdown = (path.extname(templateName.toLowerCase()) === '.md')
      }

      logger.verbose(`templateIsMarkdown: ${templateIsMarkdown}`)

      parameters.isMarkdown = templateIsMarkdown

      let content = await renderTemplateFromFile(templateName, parameters)

      if (templateIsMarkdown) {
        content = await renderTemplateFromString(
          `{% extends "base/report.md.html" %} {% block content %}${converter.makeHtml(content)}{% endblock %}`,
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
    }
  }

  async runTemplateReportWithContent(report, templateContent, tempDir) {
    const {
      templateName,
      parameters,
      channels,
      isMarkdown,
    } = report
    let templateIsMarkdown = isMarkdown

    try {
      const output = path.join(tempDir, templateOutputName(templateName))

      logger.verbose(`Rendering ${templateName} to ${output}...`)

      if (typeof templateIsMarkdown === 'undefined') {
        templateIsMarkdown = (path.extname(templateName.toLowerCase()) === '.md')
      }

      logger.verbose(`templateIsMarkdown: ${templateIsMarkdown}`)

      parameters.isMarkdown = isMarkdown

      let content = await renderTemplateFromString(templateContent, parameters)

      if (isMarkdown) {
        content = await renderTemplateFromString(
          `{% extends "base/report.md.html" %} {% block content %}${converter.makeHtml(content)}{% endblock %}`,
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
    }
  }

  async runDashboardReport(report, tempDir) {
    let consolidatedPdf

    try {
      const {
        dashboards,
        parameters,
        channels,
        combinePdfs,
      } = report

      logger.verbose(`Running dashboard report for dashboards [${dashboards}]...`)

      const promises = dashboards.map(async dashboard => (
          await downloadDashboardPdf(this.apiKey, dashboard, tempDir)
        )),
        dashboardPdfs = await Promise.all(promises)

      if (combinePdfs && dashboardPdfs.length > 1) {
        consolidatedPdf = path.join(tempDir, 'consolidated_dashboards.pdf')
        await mergePdfs(dashboardPdfs, consolidatedPdf)
      }

      await publish(
        channels,
        combinePdfs ? [consolidatedPdf] : dashboardPdfs,
        parameters,
      )
    } catch (err) {
      logger.error(err)
    }
  }
}

module.exports = Engine
