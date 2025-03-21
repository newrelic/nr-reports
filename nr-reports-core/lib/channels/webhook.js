'use strict'

const fetch = require('node-fetch'),
  {
    channelFormatter,
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
    WEBHOOK_HTTP_METHOD_DEFAULT,
  } = require('../constants'),
  { createLogger } = require('../logger')

const logger = createLogger('webhook')

function buildHeaders(
  context,
  report,
  publishConfig,
  channelConfig,
) {
  const httpHeaders = {
      'Content-Type': 'application/json',
    },
    format = channelFormatter(
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
          httpHeaders[key] = format(value)
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

  return channelFormatter(
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
  )(channelConfig.payload)
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
   * Check to ensure we have a Webhook payload.
   */
  if (!channelConfig.passThrough && !channelConfig.payload) {
    throw new Error(`Missing Webhook payload for report ${reportName}.`)
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
