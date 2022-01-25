'use strict'

const fs = require('fs'),
  chromium = require('chrome-aws-lambda'),
  {
    rootLogger,
    FileHandler,
    getTempFile,
    Engine,
    getS3ObjectAsString,
    putS3Object,
    getSecretValue,
  } = require('nr-storybook-core')

async function getApiKey() {
  const apiKey = process.env.USER_API_KEY,
    apiKeySecret = process.env.USER_API_KEY_SECRET,
    apiKeySecretKey = process.env.USER_API_KEY_SECRET_KEY || 'UserApiKey'

  if (!apiKeySecret) {
    return apiKey
  }

  const secret = await getSecretValue(apiKeySecret, apiKeySecretKey)

  if (!secret) {
    return apiKey
  }

  return secret
}

function lambdaResponse(
  statusCode,
  success = false,
  payload = null,
  message = '',
  mimeType = 'application/json',
) {
  const body = { success }

  if (!success) {
    body.message = message
  } else if (payload) {
    body.payload = payload
  }

  return {
    statusCode,
    headers: {
      'Content-Type': mimeType,
    },
    body: JSON.stringify(body),
  }
}

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
      template = await getS3ObjectAsString(templateBucket, templatePath)


    tempFile = await getTempFile()

    await engine.runReportFromString(
      template,
      values,
      tempFile,
    )

    const data = await putS3Object(
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
