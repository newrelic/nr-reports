'use strict'

const fs = require('fs'),
  chromium = require('chrome-aws-lambda'),
  { rootLogger, FileHandler } = require('./core/logger'),
  {
    getTempFile,
  } = require('./core/util'),
  {
    readS3ObjectAsString,
    writeS3ObjectFromString,
    getApiKey,
    lambdaResponse,
  } = require('./core/aws-util'),
  Engine = require('./core/engine')

async function handler(event) {
  const log = rootLogger,
    logLevel = process.env.LOG_LEVEL || 'INFO'

  if (logLevel === 'VERBOSE') {
    log.isVerbose = true
  }

  if (logLevel === 'DEBUG') {
    log.isDebug = true
  }

  if (process.env.LOG_FILE) {
    log.handlers = new FileHandler(process.env.LOG_FILE)
  }

  let tempFile = null

  try {
    const puppetArgs = {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    }

    log.log('Creating browser using the following args:')
    log.log(puppetArgs)

    log.debug(process.env)

    const engine = new Engine({
      apiKey: await getApiKey(),
      templatesPath: 'templates',
      browser: await chromium.puppeteer.launch(puppetArgs),
    })

    let values

    if (process.env.REPORT_PARAMS) {
      values = JSON.parse(process.env.REPORT_PARAMS)
    } else if (event.body) {
      values = event.body
    } else if (event.params) {
      values = event.params
    }

    const templateBucket = (
        (values && values.templateBucket) || process.env.S3_SOURCE_BUCKET || 'newrelic'
      ),
      templatePath = (
        (values && values.templatePath) || process.env.S3_SOURCE_PATH_KEY || 'report.html'
      ),
      reportBucket = (
        (values && values.reportBucket) || process.env.S3_DEST_BUCKET || 'newrelic'
      ),
      reportPath = (
        (values && values.reportPath) || process.env.S3_DEST_PATH_KEY || 'report.pdf'
      ),
      template = await readS3ObjectAsString(templateBucket, templatePath)


    tempFile = await getTempFile()

    await engine.runReportFromString(
      template,
      values,
      tempFile,
    )

    const data = await writeS3ObjectFromString(
      reportBucket,
      reportPath,
      fs.createReadStream(tempFile),
    )

    return lambdaResponse(
      200,
      true,
      data,
    )
  } catch (err) {
    log.error('Uncaught exception:')
    log.error(err)
    return lambdaResponse(
      500,
      false,
      null,
      err.message,
    )
  } finally {
    try {
      if (tempFile && fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
    } catch (err) {
      log.warn(`Failed to close ${tempFile}`)
      log.warn(err)
    }
  }
}

module.exports.handler = handler
