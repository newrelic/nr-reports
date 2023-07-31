'use strict'
const path = require('path'),
  { shouldRender } = require('../util'),
  {
    Output,
    getDefaultOutputFileName,
    FileOutput,
  } = require('../output'),
  { createLogger, logTrace } = require('../logger')
const {
  init: initEngines,
  processTemplate,
  getTemplateEngine,
} = require('../template-engines')

const logger = createLogger('template-generator')

function init(context) {
  initEngines(context)
}

function maybeConvertMarkdown(context, report, content) {
  const {
      templateName,
    } = report,
    isMarkdown = typeof report.isMarkdown === 'undefined' ? (
      path.extname(templateName.toLowerCase()) === '.md'
    ) : report.isMarkdown

  logger.trace(`Template ${isMarkdown ? 'is' : 'is not'} markdown.`)

  return isMarkdown ? (
    getTemplateEngine(context).markdownToHtml(content)
  ) : content
}

async function renderPdf(context, report, content, tempDir) {
  const browser = context.browser,
    html = maybeConvertMarkdown(context, report, content),
    file = path.join(
      tempDir,
      getDefaultOutputFileName(report, 'pdf'),
    )

  logger.trace('Creating new browser page to render PDF...')

  const page = await browser.newPage()

  page
    .on('console', message => logger.trace(`chrome-console: ${message.type().slice(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => logger.error(`chrome-pageerror: ${message}`))
    .on('response', response => logger.trace(`chrome-response: ${response.status()} ${response.url()}`))
    .on('requestfailed', request => logger.error(`chrome-requestfailed: ${request.failure()} ${request.url()}`))

  logTrace(logger, log => {
    log({ content }, 'HTML content:')
  })

  await page.setContent(
    html,
    {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
    },
  )

  logger.trace(`Rendering page PDF to file ${file}...`)

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

  return new FileOutput([file])
}

async function generateTemplateReport(context, manifest, report, tempDir) {
  try {
    const content = await processTemplate(context, manifest, report)

    if (shouldRender(report)) {
      return await renderPdf(context, report, content, tempDir)
    }

    return new Output(content)
  } catch (err) {
    logger.error(err)
  }

  return null
}

module.exports = {
  init,
  generate: generateTemplateReport,
}
