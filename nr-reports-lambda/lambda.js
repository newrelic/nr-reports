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
    getSecretAsJson,
    trimStringAndLower,
    DEFAULT_LOG_LEVEL,
    CORE_CONSTANTS,
  } = require('nr-reports-core')

const logger = rootLogger,
  { SECRET_NAME_VAR } = CORE_CONSTANTS

function configureLogger() {
  const logLevel = trimStringAndLower(getEnv('LOG_LEVEL', DEFAULT_LOG_LEVEL))

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

function makeSecretData(
  apiKey,
  accountId = null,
  sourceNerdletId = null,
) {
  if (!apiKey) {
    throw Error('No api key found')
  }

  // This is done so we don't accidentally expose the context.secrets
  // info when dumping the context to a log or to the screen. The properties
  // have to explicitly be referenced in code. Otherwise, something like
  // [apiKey getter] will be shown, not the value behind it.

  return {
    get apiKey() {
      return apiKey
    },
    get accountId() {
      return accountId
    },
    get sourceNerdletId() {
      return sourceNerdletId
    },
  }
}

async function getSecretData(options) {
  const secretName = getEnv(SECRET_NAME_VAR)

  if (!secretName) {
    return makeSecretData(
      await getApiKey(),
      options.accountId,
    )
  }

  const secret = await getSecretAsJson(secretName),
    accountId = options.accountId || secret.accountId

  // Remove it from the options just to be safe

  delete options.accountId

  return makeSecretData(
    secret.apiKey,
    accountId,
    secret.sourceNerdletId,
  )
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
  const payload = event.body || event,
    {
      options,
      ...params
    } = payload

  try {
    const engine = new Engine(
      await getSecretData(options),
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

    await engine.run(options, params)

    logger.trace('Recording job status...')

    newrelic.recordCustomEvent(
      'NrReportsStatus',
      {
        error: false,
        ...options,
      },
    )

    return lambdaResponse(
      200,
      true,
    )
  } catch (err) {
    logger.error('Uncaught exception:')
    logger.error(err.message)

    // eslint-disable-next-line no-console
    console.error(err)

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
