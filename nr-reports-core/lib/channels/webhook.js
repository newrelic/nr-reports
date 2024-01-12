'use strict'

const fetch = require('node-fetch'),
  {
    format,
    getFormattedDateTime,
    raiseForStatus,
    splitStringAndTrim,
    getEnvNs,
  } = require('../util'),
  {
    WEBHOOK_URL_VAR,
    WEBHOOK_URL_KEY,
    WEBHOOK_HTTP_METHOD_VAR,
    WEBHOOK_HTTP_METHOD_KEY,
    WEBHOOK_HTTP_BASIC_USER_VAR,
    WEBHOOK_HTTP_BASIC_PASS_VAR,
    WEBHOOK_HEADER_KEY,
    WEBHOOK_HEADER_VAR,
    WEBHOOK_PAYLOAD_REPORT_ID_KEY,
    WEBHOOK_PAYLOAD_REPORT_NAME_KEY,
    WEBHOOK_PAYLOAD_PUBLISH_CONFIG_ID_KEY,
    WEBHOOK_PAYLOAD_PUBLISH_CONFIG_NAME_KEY,
    WEBHOOK_PAYLOAD_CHANNEL_ID_KEY,
    WEBHOOK_PAYLOAD_CHANNEL_NAME_KEY,
    WEBHOOK_PAYLOAD_TIMESTAMP_KEY,
    WEBHOOK_PAYLOAD_DATETIME_KEY,
    WEBHOOK_PAYLOAD_RESULTS_KEY,
    WEBHOOK_HTTP_METHOD_DEFAULT,
  } = require('../constants'),
  { createLogger, logTrace } = require('../logger')

const logger = createLogger('webhook')

function getReplacements(
  context,
  report,
  publishConfig,
  channelConfig,
  output = null,
) {
  const m = {
    [WEBHOOK_PAYLOAD_REPORT_ID_KEY]: report.id,
    [WEBHOOK_PAYLOAD_REPORT_NAME_KEY]: report.name,
    [WEBHOOK_PAYLOAD_PUBLISH_CONFIG_ID_KEY]: publishConfig.id,
    [WEBHOOK_PAYLOAD_PUBLISH_CONFIG_NAME_KEY]: publishConfig.name,
    [WEBHOOK_PAYLOAD_CHANNEL_ID_KEY]: channelConfig.id,
    [WEBHOOK_PAYLOAD_CHANNEL_NAME_KEY]: channelConfig.name,
    [WEBHOOK_PAYLOAD_TIMESTAMP_KEY]: new Date().getTime(),
    [WEBHOOK_PAYLOAD_DATETIME_KEY]: getFormattedDateTime(),
  }

  if (channelConfig.contextVars) {
    channelConfig.contextVars.forEach(
      key => (
        m[key] = context.get(context, key)
      ),
    )
  }

  if (channelConfig.envVars) {
    channelConfig.envVars.forEach(
      key => (
        m[key] = getEnvNs(context, key)
      ),
    )
  }

  if (output) {
    m[WEBHOOK_PAYLOAD_RESULTS_KEY] = output
  }

  return m
}

function buildHeaders(
  context,
  report,
  publishConfig,
  channelConfig,
) {
  const httpHeaders = {
      'Content-Type': 'application/json',
    },
    replacements = getReplacements(
      context,
      report,
      publishConfig,
      channelConfig,
    ),
    basicUser = getEnvNs(context, WEBHOOK_HTTP_BASIC_USER_VAR),
    basicPass = getEnvNs(context, WEBHOOK_HTTP_BASIC_PASS_VAR)

  if (basicUser && basicPass) {
    httpHeaders.Authorization = (
      `Basic ${Buffer.from(`${basicUser}:${basicPass}`).toString('base64')}`
    )
  }

  for (let index = 0; index < 5; index += 1) {
    const header = context.getWithEnvNs(
      `${WEBHOOK_HEADER_KEY}${index + 1}`,
      `${WEBHOOK_HEADER_VAR}_${index + 1}`,
    )

    if (header) {
      const kv = splitStringAndTrim(header, ':')

      if (Array.isArray(kv) && kv.length === 2) {
        const key = kv[0],
          value = kv[1]

        if (key.length > 0 && value.length > 0) {
          httpHeaders[key] = format(value, replacements)
        }
      }
    }
  }

  return httpHeaders
}

async function send(
  context,
  report,
  publishConfig,
  channelConfig,
  webhookUrl,
  message,
) {
  logTrace(logger, log => {
    log({ message }, 'Webhook request payload:')
  })

  const httpMethod = context.getWithEnvNs(
      WEBHOOK_HTTP_METHOD_KEY,
      WEBHOOK_HTTP_METHOD_VAR,
      WEBHOOK_HTTP_METHOD_DEFAULT,
    ),

    response = await fetch(webhookUrl, {
      headers: buildHeaders(
        context,
        report,
        publishConfig,
        channelConfig,
      ),
      method: httpMethod,
      body: message,
    })

  raiseForStatus(response)

  const responseText = await response.text()

  logTrace(logger, log => {
    log({ response: responseText }, 'Webhook response:')
  })

  return responseText
}

async function buildMessage(
  context,
  report,
  publishConfig,
  channelConfig,
  output,
) {

  if (channelConfig.passThrough) {
    return await output.render(context, report, channelConfig)
  }

  /*
   * Build the JSON payload to post to the webhook URL.
   */

  return format(
    channelConfig.payload,
    getReplacements(
      context,
      report,
      publishConfig,
      channelConfig,
      JSON.stringify(
        await output.render(
          context,
          report,
          channelConfig,
        ),
      ),
    ),
  )
}

async function invokeWebhook(
  context,
  manifest,
  report,
  publishConfig,
  channelConfig,
  output,
) {
  const reportName = report.name || report.id

  /*
   * The Webhook channel does not support sending file attachments so if this is
   * a file, warn and exit.
   */
  if (output.isFile()) {
    logger.warn(
      `Skipping output for report ${reportName} because sending files via the Webhook channel is not currently supported.`,
    )
    return
  }

  /*
   * Check to ensure we have a Webhook URL.
   */
  const webhookUrl = context.getWithEnvNs(WEBHOOK_URL_KEY, WEBHOOK_URL_VAR)

  if (!webhookUrl) {
    throw new Error(`Missing Webhook URL for report ${reportName}.`)
  }

  /*
   * Post the message to the Slack webhook URL.
   */
  await send(
    context,
    report,
    publishConfig,
    channelConfig,
    webhookUrl,
    await buildMessage(
      context,
      report,
      publishConfig,
      channelConfig,
      output,
    ),
  )
}

module.exports = {
  publish: invokeWebhook,
  getChannelDefaults: () => ({}),
}
