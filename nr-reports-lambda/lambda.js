'use strict'

// The newrelic module is provided by the Lambda layer.
// eslint-disable-next-line node/no-missing-require
const newrelic = require('newrelic')

const chromium = require('chrome-aws-lambda'),
  {
    rootLogger,
    setLogLevel,
    Engine,
    getEnv,
    getSecretValue,
    strToLower,
  } = require('nr-reports-core')

const logger = rootLogger

function configureLogger() {
  const logLevel = strToLower(getEnv('LOG_LEVEL', 'info'))

  if (logLevel === 'debug') {
    setLogLevel(logger, 'trace')
  } else if (logLevel === 'verbose') {
    setLogLevel(logger, 'debug')
  }
}

// The root logger is a global object so all invocations will share the
// same one until the lambda is reloaded. So we need to configure it once
// globally.

configureLogger()

async function getApiKey() {
  const apiKey = getEnv('USER_API_KEY'),
    apiKeySecret = getEnv('USER_API_KEY_SECRET'),
    apiKeySecretKey = getEnv('USER_API_KEY_SECRET_KEY', 'UserApiKey')

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
  const values = event.body || event

  try {
    const engine = new Engine(
      await getApiKey(),
      's3',
      {
        getPuppetArgs: async () => ({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        }),
        openChrome: async puppetArgs => (
          await chromium.puppeteer.launch(puppetArgs)
        ),
        closeChrome: async browser => (
          await browser.close()
        ),
      },
    )

    await engine.run(values)

    logger.trace('Recording job status...')

    newrelic.recordCustomEvent(
      'NrReportsStatus',
      {
        error: false,
        ...values.options,
      },
    )

    return lambdaResponse(
      200,
      true,
    )
  } catch (err) {
    logger.error('Uncaught exception:')
    logger.error(err)

    newrelic.noticeError(err)

    logger.trace('Recording job status...')

    newrelic.recordCustomEvent(
      'NrReportsStatus',
      {
        error: true,
        message: err.message,
      },
    )

    return lambdaResponse(
      500,
      false,
      null,
      err.message,
    )
  }
}

module.exports.handler = handler
