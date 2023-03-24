'use strict'
const fs = require('fs'),
  path = require('path'),
  nunjucks = require('nunjucks'),
  showdown = require('showdown'),
  NrqlExtension = require('../extensions/nrql-extension'),
  ChartExtension = require('../extensions/chart-extension'),
  DumpContextExtension = require('../extensions/dump-context-extension'),
  {
    getFilenameWithNewExtension,
    shouldRender,
    getDefaultOutputFilename,
    splitPaths,
  } = require('../util'),
  {
    getS3ObjectAsString,
  } = require('../aws-util'),
  { createLogger, logTrace } = require('../logger')

const { writeFile } = fs.promises,
  logger = createLogger('template-generator'),
  converter = new showdown.Converter({
    ghCompatibleHeaderId: true,
    strikethrough: true,
    tables: true,
    tablesHeaderId: true,
    tasklists: true,
    openLinksInNewWindow: true,
    backslashEscapesHTMLTags: true,
  })

converter.setFlavor('github')

async function renderPdf(browser, content, file) {
  logger.debug(`Creating new browser page to render PDF to ${file}...`)

  const page = await browser.newPage()

  page
    .on('console', message => logger.debug(`chrome-console: ${message.type().slice(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => logger.error(`chrome-pageerror: ${message}`))
    .on('response', response => logger.debug(`chrome-response: ${response.status()} ${response.url()}`))
    .on('requestfailed', request => logger.error(`chrome-requestfailed: ${request.failure()} ${request.url()}`))

  logTrace(logger, log => {
    log({ content }, 'HTML content:')
  })

  await page.setContent(
    content,
    {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
    },
  )

  logger.debug(`Saving PDF to ${file}...`)

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

function processTemplateFile(file, renderContext) {
  return new Promise((resolve, reject) => {
    logger.debug(`Processing template file ${file}...`)

    logTrace(logger, log => {
      log(renderContext, 'Render context:')
    })

    nunjucks.render(file, renderContext, (err, res) => {
      if (err) {
        reject(err)
        return
      }

      resolve(res)
    })
  })
}

function processTemplateString(template, renderContext) {
  return new Promise((resolve, reject) => {
    logger.debug('Processing template string...')

    logTrace(logger, log => {
      log(renderContext, 'Render context:')
    })

    nunjucks.renderString(template, renderContext, (err, res) => {
      if (err) {
        reject(err)
        return
      }

      resolve(res)
    })
  })
}

async function processTemplateReport(
  context,
  report,
  tempDir,
  processor,
) {
  const {
      templateName,
      parameters,
      isMarkdown,
      outputFileName,
    } = report,
    renderContext = context.context(parameters),
    shouldRenderPdf = shouldRender(report)
  let templateIsMarkdown = isMarkdown

  try {
    const output = outputFileName ? path.join(tempDir, outputFileName) : (
      path.join(
        tempDir,
        shouldRenderPdf ? (
          getFilenameWithNewExtension(templateName, 'pdf')
        ) : getDefaultOutputFilename(templateName),
      )
    )

    logger.debug(`Processing template ${templateName}...`)

    if (typeof templateIsMarkdown === 'undefined') {
      templateIsMarkdown = (path.extname(templateName.toLowerCase()) === '.md')
    }

    logger.debug(`templateIsMarkdown: ${templateIsMarkdown}`)

    renderContext.isMarkdown = templateIsMarkdown

    let content = await processor(templateName, renderContext)

    if (templateIsMarkdown) {
      content = await processTemplateString(
        `{% extends "base/report.md.html" %} {% block content %}${converter.makeHtml(content)}{% endblock %}`,
        renderContext,
      )
    }

    if (shouldRenderPdf) {
      await renderPdf(
        context.browser,
        content,
        output,
      )

      return [output]
    }

    await writeFile(output, content)

    return [output]
  } catch (err) {
    logger.error(err)
  }

  return null
}

async function generateTemplateReport(
  context,
  manifest,
  report,
  tempDir,
) {
  if (report.S3Bucket) {
    const template = await getS3ObjectAsString(
      report.S3Bucket,
      report.templateName,
    )

    return await processTemplateReport(
      context,
      report,
      tempDir,
      async (templateName, renderContext) => (
        await processTemplateString(template, renderContext)
      ),
    )
  }

  return await processTemplateReport(
    context,
    report,
    tempDir,
    async (templateName, renderContext) => (
      await processTemplateFile(templateName, renderContext)
    ),
  )
}

function configureNunjucks(apiKey, templatePath) {
  logger.debug('Configuring Nunjucks...')

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

  env.addExtension('NrqlExtension', new NrqlExtension(apiKey))
  env.addExtension('ChartExtension', new ChartExtension(apiKey))
  env.addExtension('DumpContextExtension', new DumpContextExtension())

  return env
}

module.exports = {
  generate: generateTemplateReport,
  configureNunjucks,
}
