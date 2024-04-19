'use strict'

// The newrelic module is provided by the Lambda layer.
// eslint-disable-next-line node/no-missing-require
const newrelic = require('newrelic')

const {
    rootLogger,
    setLogLevel,
    getEnv,
    getSecretAsJson,
    NerdstorageClient,
    requireAccountIds,
    trimStringAndLower,
    DEFAULT_LOG_LEVEL,
    CORE_CONSTANTS,
  } = require('nr-reports-core'),
  { NerdstorageRepository } = require('./lib/repositories/nerdstorage'),
  { EventBridgeBackend } = require('./lib/backends/eventbridge'),
  { poll } = require('./lib/scheduler')

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

function makeSecretData(secret) {
  if (!secret.apiKey) {
    throw Error('No api key found')
  }

  if (!secret.accountId) {
    throw Error('No account ID found')
  }

  if (!secret.sourceNerdletId) {
    throw Error('No nerdlet ID found')
  }

  // This is done so we don't accidentally expose the secrets
  // info if the object is dumped to a log or to the screen. The properties
  // have to explicitly be referenced in code. Otherwise, something like
  // [apiKey getter] will be shown, not the value behind it.

  return {
    get apiKey() {
      return secret.apiKey
    },
    get accountId() {
      return secret.accountId
    },
    get sourceNerdletId() {
      return secret.sourceNerdletId
    },
  }
}

async function getSecretData() {
  const secretName = getEnv(SECRET_NAME_VAR)

  if (!secretName) {
    throw Error(`No secret name found in ${SECRET_NAME_VAR}`)
  }

  return makeSecretData(await getSecretAsJson(secretName))
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

async function pollAccount(
  apiKey,
  sourceNerdletId,
  accountId,
  backend,
) {
  try {
    const nerdstorage = new NerdstorageClient(
        apiKey,
        sourceNerdletId,
        accountId,
      ),
      nerdstorageRepo = new NerdstorageRepository(nerdstorage)

    await poll(accountId, nerdstorageRepo, backend)

    logger.trace('Recording job status...')

    newrelic.recordCustomEvent(
      'NrReportsSchedulerStatus',
      {
        accountId,
        error: false,
      },
    )
  } catch (err) {
    logger.error('Uncaught exception:')
    logger.error(err.message)

    // eslint-disable-next-line no-console
    console.error(err)

    newrelic.noticeError(err)

    logger.trace('Recording job status...')

    newrelic.recordCustomEvent(
      'NrReportsSchedulerStatus',
      {
        accountId,
        error: true,
        message: err.message,
      },
    )
  }
}

// eslint-disable-next-line no-unused-vars
async function handler(event) {
  try {
    const secretData = await getSecretData(),
      accountIds = requireAccountIds(secretData),
      eventBridgeBackend = new EventBridgeBackend()

    for (const accountId of accountIds) {
      await pollAccount(
        secretData.apiKey,
        secretData.sourceNerdletId,
        accountId,
        eventBridgeBackend,
      )
    }

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
      'NrReportsSchedulerStatus',
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
