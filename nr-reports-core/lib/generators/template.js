'use strict'
const fs = require('fs'),
  path = require('path'),
  nunjucks = require('nunjucks'),
  showdown = require('showdown'),
  {
    getFilenameWithNewExtension,
    shouldRender,
    getDefaultOutputFilename,
  } = require('../util'),
  {
    getS3ObjectAsString,
  } = require('../aws-util'),
  { createLogger } = require('../logger')

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

function processTemplateFile(file, context = {}) {
  return new Promise((resolve, reject) => {
    logger.verbose(`Processing template file ${file}...`)

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

function processTemplateString(template, context = {}) {
  return new Promise((resolve, reject) => {
    logger.verbose('Processing template string...')

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

async function processTemplateReport(
  manifest,
  report,
  tempDir,
  browser,
  processor,
) {
  const {
      templateName,
      parameters,
      isMarkdown,
      outputFileName,
    } = report,
    templateParameters = { ...manifest.variables, ...parameters },
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

    logger.verbose(`Processing template ${templateName}...`)

    if (typeof templateIsMarkdown === 'undefined') {
      templateIsMarkdown = (path.extname(templateName.toLowerCase()) === '.md')
    }

    logger.verbose(`templateIsMarkdown: ${templateIsMarkdown}`)

    templateParameters.isMarkdown = templateIsMarkdown

    let content = await processor(templateName, templateParameters)

    if (templateIsMarkdown) {
      content = await processTemplateString(
        `{% extends "base/report.md.html" %} {% block content %}${converter.makeHtml(content)}{% endblock %}`,
        templateParameters,
      )
    }

    if (shouldRenderPdf) {
      await renderPdf(
        browser,
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
  engineOptions,
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
      manifest,
      report,
      tempDir,
      engineOptions.browser,
      async (templateName, parameters) => (
        await processTemplateString(template, parameters)
      ),
    )
  }

  return await processTemplateReport(
    manifest,
    report,
    tempDir,
    engineOptions.browser,
    async (templateName, parameters) => (
      await processTemplateFile(templateName, parameters)
    ),
  )
}

module.exports = {
  generate: generateTemplateReport,
}
