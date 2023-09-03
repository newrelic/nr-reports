'use strict'

const fetch = require('node-fetch'),
  { raiseForStatus, getEnv } = require('../util'),
  { SLACK_WEBHOOK_URL } = require('../constants'),
  { createLogger, logTrace } = require('../logger')

const logger = createLogger('slack'),
  MRKDWN_ESCAPE_REGEX = /(\\&)|(\\<)|(\\>)/gui,
  MRKDWN_ESCAPE_REPLACEMENTS = ['&amp;', '&lt;', '&gt;']

function escapeMrkdwn(str) {
  return str.replace(
    MRKDWN_ESCAPE_REGEX,
    (s, ...args) => {
      for (let index = 0; index < args.length; index += 1) {
        if (args[index]) {
          return MRKDWN_ESCAPE_REPLACEMENTS[index]
        }
      }
      return s
    },
  )
}

function buildHeaders(headers = {}) {
  return {
    'Content-Type': 'application/json',
    ...headers,
  }
}

async function post(webhookUrl, message, options = { headers: {} }) {
  logTrace(logger, log => {
    log({ message }, 'Slack Request:')
  })

  const response = await fetch(webhookUrl, {
    headers: buildHeaders(options.headers),
    method: 'POST',
    body: message,
  })

  raiseForStatus(response)

  const responseText = await response.text()

  logTrace(logger, log => {
    log({ response: responseText }, 'Slack Response:')
  })

  if (responseText !== 'ok') {
    logger.error(
      `Slack Webhook post error: ${responseText}`,
    )
    throw new Error(
      `Slack Webhook post error: ${responseText}`,
      message,
      responseText,
    )
  }

  return responseText
}

async function buildMessage(context, report, channelConfig, output) {

  if (channelConfig.passThrough) {
    return await output.render(context, report, channelConfig)
  }

  /*
   * Set the message text to the rendered output with any special mrkdwn
   * characters escaped.
   */
  return JSON.stringify({
    text: escapeMrkdwn(
      await output.render(
        context,
        report,
        channelConfig,
      ),
    ),
  })
}

async function postToSlack(context, manifest, report, channelConfig, output) {

  /*
   * This channel only supports Slack webhooks, not the API. Files can not be
   * posted via the webhook so if this is a file, warn and exit.
   */
  if (output.isFile()) {
    logger.warn(
      `Skipping output for report ${report.name} because Slack webhook does not support file attachments.`,
    )
    return
  }

  /*
   * Check to ensure we have a Slack webhook URL. We only support getting this
   * from the environment because it has a key in it.
   */
  const webhookUrl = getEnv(SLACK_WEBHOOK_URL)

  if (!webhookUrl) {
    throw new Error('Missing Slack webhook URL')
  }

  /*
   * Post the message to the Slack webhook URL.
   */
  await post(
    webhookUrl,
    await buildMessage(
      context,
      report,
      channelConfig,
      output,
    ),
  )
}

module.exports = {
  publish: postToSlack,
  getChannelDefaults: () => ({}),
}
