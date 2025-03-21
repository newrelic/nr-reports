'use strict'

const fs = require('fs'),
  nodemailer = require('nodemailer'),
  { createLogger, logTrace } = require('../logger'),
  {
    getOption,
    isUndefined,
    toBoolean,
    toNumber,
    withTempFile,
    trimStringAndLower,
    getEnvNs,
    channelFormatter,
  } = require('../util'),
  {
    EMAIL_SMTP_SERVER_KEY,
    EMAIL_SMTP_SERVER_VAR,
    EMAIL_SMTP_PORT_KEY,
    EMAIL_SMTP_PORT_VAR,
    EMAIL_SMTP_SECURE_KEY,
    EMAIL_SMTP_SECURE_VAR,
    EMAIL_SMTP_USER_VAR,
    EMAIL_SMTP_PASS_VAR,
    EMAIL_FROM_VAR,
    EMAIL_TO_VAR,
    EMAIL_CC_VAR,
    EMAIL_SUBJECT_VAR,
    EMAIL_SMTP_PORT_DEFAULT,
    EMAIL_FROM_KEY,
    EMAIL_TO_KEY,
    EMAIL_CC_KEY,
    EMAIL_SUBJECT_KEY,
    EMAIL_BODY_KEY,
    EMAIL_FORMATTER_FROM_KEY,
    EMAIL_FORMATTER_TO_KEY,
    EMAIL_FORMATTER_CC_KEY,
    EMAIL_FORMATTER_SUBJECT_KEY,
    OUTPUT_FORMAT_HTML,
  } = require('../constants'),
  { FileOutput } = require('../output')

const logger = createLogger('email'),
  { writeFile } = fs.promises,
  EMAIL_BODY = `
<!doctype html>
<html class="no-js" lang="">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<body>
  <main>
    <h1>{{ REPORT_NAME }}</h1>
    <div>
      {{ RESULTS }}
    </div>
  </main>
</body>

</html>
`,
  EMAIL_ATTACHMENTS_BODY = `
<!doctype html>
<html class="no-js" lang="">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<body>
  <main>
    <h1>{{ REPORT_NAME }}</h1>
    <p>See attached reports.</p>
  </main>
</body>

</html>`


function createSmtpTransport(context) {
  const server = context.getWithEnvNs(
    EMAIL_SMTP_SERVER_KEY,
    EMAIL_SMTP_SERVER_VAR,
  )

  if (!server) {
    throw new Error('Missing SMTP server')
  }

  const port = context.getWithEnvNs(EMAIL_SMTP_PORT_KEY, EMAIL_SMTP_PORT_VAR),
    secure = context.getWithEnvNs(EMAIL_SMTP_SECURE_KEY, EMAIL_SMTP_SECURE_VAR),
    smtpConfig = {
      host: server,
      port: port ? toNumber(port) : EMAIL_SMTP_PORT_DEFAULT,
      secure: isUndefined(secure) ? true : toBoolean(secure),
      logger,
    },
    user = getEnvNs(context, EMAIL_SMTP_USER_VAR)

  if (user) {
    smtpConfig.auth = {
      user,
      pass: getEnvNs(context, EMAIL_SMTP_PASS_VAR),
    }
  }

  return nodemailer.createTransport(smtpConfig)
}

function formatText(
  context,
  message,
  report,
  publishConfig,
  channelConfig,
  renderResult,
  text,
) {
  const replacements = {
    [EMAIL_FORMATTER_FROM_KEY]: message.from,
    [EMAIL_FORMATTER_TO_KEY]: message.to,
    [EMAIL_FORMATTER_CC_KEY]: message.cc,
    [EMAIL_FORMATTER_SUBJECT_KEY]: message.subject || '',
  }

  return channelFormatter(
    context,
    report,
    publishConfig,
    channelConfig,
    renderResult,
    replacements,
  )(text)
}

function formatBody(
  context,
  message,
  report,
  publishConfig,
  channelConfig,
  renderResult,
  defaultBody,
) {
  const body = getOption(channelConfig, EMAIL_BODY_KEY)

  return formatText(
    context,
    message,
    report,
    publishConfig,
    channelConfig,
    renderResult,
    body || defaultBody,
  )
}

async function makeMessage(
  context,
  report,
  publishConfig,
  channelConfig,
) {
  const message = {
    from: context.get(EMAIL_FROM_KEY, EMAIL_FROM_VAR),
    to: context.get(EMAIL_TO_KEY, EMAIL_TO_VAR),
    cc: context.get(EMAIL_CC_KEY, EMAIL_CC_VAR),
  }

  message.subject = formatText(
    context,
    message,
    report,
    publishConfig,
    channelConfig,
    null,
    context.get(EMAIL_SUBJECT_KEY, EMAIL_SUBJECT_VAR, ''),
  )

  return message
}

async function send(context, message) {
  const transporter = createSmtpTransport(context)

  logTrace(logger, log => {
    log({ ...message, from: '[REDACTED]', to: '[REDACTED]' }, 'Message:')
  })

  await transporter.sendMail(message)
}

async function sendMailWithBody(
  context,
  channelConfig,
  message,
  body,
) {

  /*
   * Set the message body either as html or text.
   */
  const format = trimStringAndLower(
    channelConfig.format,
    'html',
  )

  switch (format) {
  case 'html':
    message.html = body
    break

  case 'text':
    message.text = body
    break

  default:
    throw new Error(`Invalid format ${format}`)
  }

  /*
   * Finally, send the completely built message.
   */
  await send(context, message)
}

async function sendMailWithAttachments(
  context,
  report,
  publishConfig,
  channelConfig,
  output,
  message,
  body = null,
) {

  /*
   * Add the attachments to the message.
   */
  message.attachments = output.files.map(file => ({ path: file }))

  /*
   * Send the message with the passed body or, if no body is specified,
   * format the body specified in the channel config or use the default
   * attachments body.
   */
  await sendMailWithBody(
    context,
    channelConfig,
    message,
    body || (
      formatBody(
        context,
        message,
        report,
        publishConfig,
        channelConfig,
        null,
        EMAIL_ATTACHMENTS_BODY,
      )
    ),
  )
}

async function renderOutputAndSendMailWithAttachments(
  context,
  report,
  publishConfig,
  channelConfig,
  output,
  message,
  tempDir,
  body,
) {
  await withTempFile(async tempFile => {

    /*
     * Render the output data and write it to a temporary file.
     */
    await writeFile(
      tempFile,
      await output.render(
        context,
        report,
        channelConfig,
      ),
    )

    /*
     * Now send a message with the file as an attachment just as if the output
     * was a FileOutput to begin with.
     */
    await sendMailWithAttachments(
      context,
      report,
      publishConfig,
      channelConfig,
      new FileOutput([tempFile]),
      message,
      body,
    )
  }, tempDir, output.getOutputFileName(context, report))
}

async function sendMail(
  context,
  report,
  publishConfig,
  channelConfig,
  output,
  message,
  tempDir,
) {

  /*
   * If `attachOutput` was specified, the output data will first be rendered.
   * The data will then be written to a temp file. The _body_ of the email will
   * be built as it would as if a file was passed directly by calling
   * `sendMailWithAttachments`.
   */
  if (channelConfig.attachOutput) {
    await renderOutputAndSendMailWithAttachments(
      context,
      report,
      publishConfig,
      channelConfig,
      output,
      message,
      tempDir,
      channelConfig.passThrough ? (
        await output.render(
          context,
          report,
          channelConfig,
          OUTPUT_FORMAT_HTML,
        )
      ) : null,
    )
    return
  }

  const renderResult = await output.render(
    context,
    report,
    channelConfig,
    channelConfig.passThrough ? OUTPUT_FORMAT_HTML : null,
  )

  /*
   * If the `passThrough` property is set in the channel configuration, the
   * email body will be set to the render result.
   *
   * Otherwise, the email body will be formatted using the body specified in the
   * channel config or the default body.
   */
  await sendMailWithBody(
    context,
    channelConfig,
    message,
    channelConfig.passThrough ? renderResult : (
      formatBody(
        context,
        message,
        report,
        publishConfig,
        channelConfig,
        renderResult,
        EMAIL_BODY,
      )
    ),
  )
}

async function sendEmail(
  context,
  manifest,
  report,
  publishConfig,
  channelConfig,
  output,
  tempDir,
) {

  /*
   * Initialize the message object from the settings in the context, report,
   * publishConfig, and channelConfig.
   */
  const message = await makeMessage(
    context,
    report,
    publishConfig,
    channelConfig,
  )

  /*
   * If the output is a file, send an email with the file as an attachment.
   * In this case, the email body will be built by formatting the body specified
   * in the channel config or the default attachments body.
   */
  if (output.isFile()) {
    await sendMailWithAttachments(
      context,
      report,
      publishConfig,
      channelConfig,
      output,
      message,
    )
    return
  }

  /*
   * Otherwise, an email will be sent with a body built by passing through the
   * rendered output result, using the body specified in the channel config, or
   * using the default attachments body (when attachOutput is true) or the
   * default body.
   */
  await sendMail(
    context,
    report,
    publishConfig,
    channelConfig,
    output,
    message,
    tempDir,
  )
}

module.exports = {
  publish: sendEmail,
  getChannelDefaults: () => ({}),
}
