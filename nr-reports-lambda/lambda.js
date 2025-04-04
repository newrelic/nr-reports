'use strict'

// The newrelic module is provided by the Lambda layer.
// eslint-disable-next-line node/no-missing-require
const newrelic = require('newrelic')

const {
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
  { SECRET_NAME_VAR, REPORTS_BUILDER_NERDPACK_ID } = CORE_CONSTANTS

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

  let sourceNerdletId = REPORTS_BUILDER_NERDPACK_ID

  if (secret.sourceNerdletId) {
    const val = secret.sourceNerdletId.trim()

    if (val !== '') {
      logger.debug('Using a custom nerdpack ID for sourceNerdletId')
      sourceNerdletId = val
    }
  }

  return makeSecretData(
    secret.apiKey,
    accountId,
    sourceNerdletId,
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
    } = payload,
    runnerId = getEnv('APP_NAME', 'nr-reports-lambda'),
    runnerVersion = getEnv('APP_VERSION', '<unknown>')

  try {
    const engine = new Engine(
      newrelic,
      runnerId,
      runnerVersion,
      await getSecretData(options),
      's3',
      {},
    )

    await engine.run(options)

    logger.trace('Recording job status...')

    newrelic.recordCustomEvent(
      'NrReportsStatus',
      {
        error: false,
        runnerId,
        runnerVersion,
        reportIds: options.reportIds,
        publishConfigIds: options.publishConfigIds,
        dashboardIds: options.dashboardIds,
        channelIds: options.channelIds,
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
        runnerId,
        runnerVersion,
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
