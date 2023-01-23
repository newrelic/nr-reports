'use strict'

const chromium = require('chrome-aws-lambda'),
  {
    rootLogger,
    FileHandler,
    EngineRunner,
    getEnv,
    getOption,
    getSecretValue,
  } = require('nr-reports-core')

const logger = rootLogger

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
  const values = event.body || event,
    logLevel = getOption(values, 'logLevel', 'LOG_LEVEL', 'INFO'),
    logFile = getEnv('LOG_FILE')

  logger.isVerbose = logLevel === 'VERBOSE'
  logger.isDebug = logLevel === 'DEBUG'

  if (logFile) {
    logger.handlers = new FileHandler(logFile)
  }

  try {
    const runner = new EngineRunner({
      apiKey: await getApiKey(),
      defaultChannelType: 's3',
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
    })

    await runner.run(values)

    return lambdaResponse(
      200,
      true,
    )
  } catch (err) {
    logger.error('Uncaught exception:')
    logger.error(err)
    return lambdaResponse(
      500,
      false,
      null,
      err.message,
    )
  }
}

module.exports.handler = handler
