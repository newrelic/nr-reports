'use strict'

const nunjucks = require('nunjucks'),
  fetch = require('node-fetch'),
  merge = require('easy-pdf-merge'),
  showdown = require('showdown'),
  fs = require('fs'),
  { createWriteStream } = require('fs'),
  // eslint-disable-next-line node/no-unsupported-features/node-builtins
  fsPromise = require('fs').promises,
  path = require('path'),
  // eslint-disable-next-line node/no-unsupported-features/node-builtins
  { pipeline } = require('stream'),
  { promisify } = require('util'),
  publish = require('./channels'),
  { createLogger } = require('./logger'),
  NrqlExtension = require('./extensions/nrql-extension'),
  ChartExtension = require('./extensions/chart-extension'),
  DumpContextExtension = require('./extensions/dump-context-extension'),
  { NerdgraphClient } = require('./nerdgraph')

const converter = new showdown.Converter({
  ghCompatibleHeaderId: true,
  strikethrough: true,
  tables: true,
  tablesHeaderId: true,
  tasklists: true,
  openLinksInNewWindow: true,
  backslashEscapesHTMLTags: true,
})

converter.setFlavor('github')
const streamPipeline = promisify(pipeline)

const steps = {
  notStarted: 0,
  mergePdfs: 1,
  publishChannels: 2,
  cleanupDownloadDir: 3,
  completed: 4,
}
let currentStep = steps.notStarted

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
    this.templatesPath = options.templatesPath
    this.apiKey = options.apiKey
  }

  async convertToHtml(templateFile) {
    const templatePath = this.templatesPath.find(dir => fs.existsSync(path.join(dir, templateFile)))

    if (!templatePath) {
      throw new Error(`Error: failed to find markdown template ${templateFile}`)
    } else {
      const markdown = await fsPromise.readFile(path.join(templatePath, templateFile), 'utf8')

      return (`{% extends "report.html" %} {% block content %}${converter.makeHtml(markdown)}{% endblock %}`)
    }
  }

  async runReport(templatePath, values, outputPath, channels) {
    if (templatePath.toLowerCase().match(/\.md$/u)) {
      const template = await this.convertToHtml(templatePath)

      await this.runReportFromString(template, values, outputPath)
    } else {
      this.logger.verbose((log, format) => {
        log(format(`Rendering ${templatePath} to ${outputPath}`))
      })
      await renderReport(
        this.browser,
        await renderTemplateFromFile(templatePath, values),
        outputPath,
      )
    }
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

  mergePdfs(dashboardPdfs, consolidatedPdf) {
    this.logger.verbose('mergePdfs()')
    this.logger.verbose(`dashboardPdfs: ${dashboardPdfs}`)
    this.logger.verbose(`consolidatedPdf: ${consolidatedPdf}`)
    merge(dashboardPdfs, consolidatedPdf, err => {
      if (err) {
        this.logger.error(`failed to consolidate dashboards: ${err}`)
      }
    })
  }

  async downloadPdf(dashboardUrl, dashboardPdfFileName) {
    this.logger.verbose(`dashboard url: ${dashboardUrl}`)

    const response = await fetch(dashboardUrl)

    if (!response.ok) {
      throw new Error(`Error: fetch failed to read the file: ${response.statusText}`)
    }
    await streamPipeline(response.body, createWriteStream(dashboardPdfFileName))
  }

  async runMutation(apiKey, dashboards, downloadDir) {
    const nerdgraph = new NerdgraphClient()
    const dashboardPdfs = []

    try {
      const query = `{
                      dashboardCreateSnapshotUrl(guid: $guid)
                    }`
      const options = {
        nextCursonPath: null,
        mutation: true,
        headers: {},
      }

      dashboards.forEach(async dashboard => {
        const variables = { guid: ['EntityGuid!', dashboard] }
        const results = await nerdgraph.query(
          apiKey,
          query,
          variables,
          options,
        )
        const dashboardPdfFileName = path.join(downloadDir, `dashboard_${dashboard}.pdf`)

        dashboardPdfs.push(dashboardPdfFileName)
        await this.downloadPdf(results[0].dashboardCreateSnapshotUrl, dashboardPdfFileName)
      })
    } catch (err) {
      this.logger.error(err)
    }
    return dashboardPdfs
  }

  mergePdfsStep(downloadDir, dashboardCount, dashboardPdfs, consolidatedPdf) {
    this.logger.verbose('mergePdfsStep()')
    const intervalObject = setInterval(() => {
      const pdfCount = fs.readdirSync(downloadDir).length

      if (currentStep === steps.mergePdfs && pdfCount === dashboardCount) {
        this.mergePdfs(dashboardPdfs, consolidatedPdf)
        clearInterval(intervalObject)
        currentStep = steps.publishChannels
      } else {
        this.logger.verbose(`state: ${currentStep} -- pdf file count ${pdfCount} of ${dashboardCount}`)
      }
    }, 2000)
  }

  publishChannelsStep(outputFiles, downloadDir, channels) {
    this.logger.verbose('publishChannelsStep()')
    const intervalObject = setInterval(() => {
      const downloadDirContent = fs.readdirSync(downloadDir)

      this.logger.verbose(`downloadDirContent: ${downloadDirContent} -- count: ${downloadDirContent.length}`)
      this.logger.verbose(`outputFiles: ${outputFiles} -- count: ${outputFiles.length}`)

      if (currentStep === steps.publishChannels && outputFiles.every(item => downloadDirContent.includes(item.slice(item.lastIndexOf('/') + 1)))) {
        channels.forEach(async (channel, index) => {
          this.logger.verbose(`sending to channel: ${channel.type}`)
          await publish(channel, outputFiles, {})
          if (index === (channels.length - 1)) {
            clearInterval(intervalObject)
            currentStep = steps.cleanupDownloadDir
          }
        })
      } else {
        this.logger.verbose(`state: ${currentStep} -- wait for 2 more seconds`)
      }
    }, 2000)
  }

  cleanupDownloadDirStep(downloadDir) {
    this.logger.verbose('cleanupDownloadDirStep()')
    const intervalObject = setInterval(() => {
      if (currentStep === steps.cleanupDownloadDir) {
        if (downloadDir && downloadDir.trim() !== '/' && downloadDir.trim() !== '.' && fs.existsSync(downloadDir)) {
          this.logger.verbose(`removing tempDir ${downloadDir}`)

          fs.rmSync(downloadDir, { recursive: true })
          clearInterval(intervalObject)
          currentStep = steps.completed
        }
      } else {
        this.logger.verbose(`state: ${currentStep} -- wait for 2 more seconds`)
      }
    }, 2000)
  }

  async getDashboards(report) {
    let downloadDir, dashboardPdfs, consolidatedPdf

    try {
      downloadDir = fs.mkdtempSync(path.join('.', 'dashboards-'))
      this.logger.verbose(`dashboard report directory: ${downloadDir}`)
      dashboardPdfs = await this.runMutation(this.apiKey, report.dashboards, downloadDir)
      if (report.combinedPdf) {
        consolidatedPdf = path.join(downloadDir, 'consolidated_dashboards.pdf')
        this.logger.verbose(`report.dashboards.length: ${report.dashboards.length}`)

        currentStep = steps.mergePdfs
        const expectedCount = report.dashboards.length

        this.mergePdfsStep(downloadDir, expectedCount, dashboardPdfs, consolidatedPdf)
      } else {
        currentStep = steps.publishChannels
      }

      if (report.channels.length) {
        const outputFiles = report.combinedPdf ? [consolidatedPdf] : dashboardPdfs

        this.publishChannelsStep(outputFiles, downloadDir, report.channels)
      } else {
        currentStep = steps.cleanupDownloadDir
      }
    } finally {
      try {
        this.cleanupDownloadDirStep(downloadDir)

      } catch (err) {
        this.logger.error(`Process failed - Error: ${err}`)
      }
    }
  }
}

module.exports = Engine
