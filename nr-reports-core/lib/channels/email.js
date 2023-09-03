'use strict'

const fs = require('fs'),
  nodemailer = require('nodemailer'),
  { createLogger, logTrace } = require('../logger'),
  {
    getEnv,
    getOption,
    isUndefined,
    toBoolean,
    toNumber,
    withTempFile,
    trimStringAndLower,
  } = require('../util'),
  {
    EMAIL_SMTP_SERVER_VAR,
    EMAIL_SMTP_PORT_VAR,
    EMAIL_SMTP_SECURE_VAR,
    EMAIL_SMTP_USER_VAR,
    EMAIL_SMTP_PASS_VAR,
    EMAIL_FROM_VAR,
    EMAIL_TO_VAR,
    EMAIL_SUBJECT_VAR,
    EMAIL_TEMPLATE_VAR,
    EMAIL_SMTP_PORT_DEFAULT,
    EMAIL_TEMPLATE_DEFAULT,
    EMAIL_ATTACHMENTS_TEMPLATE_DEFAULT,
    EMAIL_FROM_KEY,
    EMAIL_TO_KEY,
    EMAIL_SUBJECT_KEY,
    EMAIL_TEMPLATE_NAME_KEY,
  } = require('../constants'),
  { FileOutput } = require('../output'),
  { renderTemplate } = require('../template-engines')

const logger = createLogger('email'),
  { writeFile } = fs.promises

function createSmtpTransport() {
  const server = getEnv(EMAIL_SMTP_SERVER_VAR)

  if (!server) {
    throw new Error('Missing SMTP server')
  }

  const port = getEnv(EMAIL_SMTP_PORT_VAR),
    secure = getEnv(EMAIL_SMTP_SECURE_VAR),
    smtpConfig = {
      host: server,
      port: port ? toNumber(port) : EMAIL_SMTP_PORT_DEFAULT,
      secure: isUndefined(secure) ? true : toBoolean(secure),
      logger,
    },
    user = getEnv(EMAIL_SMTP_USER_VAR)

  if (user) {
    smtpConfig.auth = {
      user: getEnv(EMAIL_SMTP_USER_VAR),
      pass: getEnv(EMAIL_SMTP_PASS_VAR),
    }
  }

  return nodemailer.createTransport(smtpConfig)
}

function resolveEmailTemplate(
  channelConfig,
  defaultTemplate = null,
) {
  return getOption(
    channelConfig,
    EMAIL_TEMPLATE_NAME_KEY,
    EMAIL_TEMPLATE_VAR,
    defaultTemplate,
  )
}

async function makeMessage(context, report) {
  const message = {
    from: context.get(EMAIL_FROM_KEY, EMAIL_FROM_VAR),
    to: context.get(EMAIL_TO_KEY, EMAIL_TO_VAR),
    subject: await renderTemplate(
      context,
      report,
      null,
      context.get(EMAIL_SUBJECT_KEY, EMAIL_SUBJECT_VAR, ''),
    ),
  }

  return message
}

async function send(message) {
  const transporter = createSmtpTransport()

  logTrace(logger, log => {
    log({ ...message, from: '[REDACTED]', to: '[REDACTED]' }, 'Message:')
  })

  await transporter.sendMail(message)
}

async function sendMailWithBody(
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
  await send(message)
}

async function sendMailWithAttachments(
  context,
  report,
  channelConfig,
  output,
  message,
) {

  /*
   * Add the attachments to the message.
   */
  message.attachments = output.files.map(file => ({ path: file }))

  /*
   * Render the email body from a template specified in the channel config,
   * environment variable, or using the default,
   * `email/message-attachments.html`
   */
  const body = await renderTemplate(
    context,
    report,
    resolveEmailTemplate(
      channelConfig,
      EMAIL_ATTACHMENTS_TEMPLATE_DEFAULT,
    ),
  )

  /*
   * Send the message with the rendered body.
   */
  await sendMailWithBody(channelConfig, message, body)
}

async function renderOutputAndSendMailWithAttachments(
  context,
  report,
  channelConfig,
  output,
  message,
  tempDir,
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
      channelConfig,
      new FileOutput([tempFile]),
      message,
    )
  }, tempDir, output.getOutputFileName(context, report))
}

async function sendMail(
  context,
  report,
  channelConfig,
  output,
  message,
  tempDir,
) {

  /*
   * If `attachOutput` was specified, the output data will first be rendered.
   * The data will then be written to a temp file. The _body_ of the email will
   * be built as it would as if a file was passed directly by calling
   * `sendMessageWithAttachments`.
   */
  if (channelConfig.attachOutput) {
    await renderOutputAndSendMailWithAttachments(
      context,
      report,
      channelConfig,
      output,
      message,
      tempDir,
    )
    return
  }

  const text = await output.render(
      context,
      report,
      channelConfig,
    )

  /*
   * If no email template was specified, the email body will be rendered using
   * the default email template or, if the `passThrough` property is set in the
   * channel configuration, the email body will be set directly from the
   * rendered output.
   *
   * Otherwise, the email body will be rendered using the template.
   */
  await sendMailWithBody(
    channelConfig,
    message,
    channelConfig.passThrough ? text : (
      await renderTemplate(
        context.context({ result: text }),
        report,
        resolveEmailTemplate(channelConfig, EMAIL_TEMPLATE_DEFAULT),
      )
    ),
  )
}

async function sendEmail(
  context,
  manifest,
  report,
  channelConfig,
  output,
  tempDir,
) {

  /*
   * Initialize the message object from context/report settings.
   */
  const message = await makeMessage(context, report)

  /*
   * If the output is a file, send an email with the file as an attachment.
   * In this case, the email body will be built from a template and the file
   * will be attached to it.
   */
  if (output.isFile()) {
    await sendMailWithAttachments(
      context,
      report,
      channelConfig,
      output,
      message,
    )
    return
  }

  /*
   * Otherwise, an email will be sent with a body generated by rendering a
   * template. The output will be passed to the template.
   */
  await sendMail(
    context,
    report,
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
