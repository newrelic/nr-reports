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
    EMAIL_TEMPLATE_VAR,
    EMAIL_SMTP_PORT_DEFAULT,
    EMAIL_TEMPLATE_DEFAULT,
    EMAIL_ATTACHMENTS_TEMPLATE_DEFAULT,
    EMAIL_FROM_KEY,
    EMAIL_TO_KEY,
    EMAIL_CC_KEY,
    EMAIL_SUBJECT_KEY,
    EMAIL_TEMPLATE_NAME_KEY,
    EMAIL_TEMPLATE_KEY,
    OUTPUT_FORMAT_HTML,
  } = require('../constants'),
  { FileOutput } = require('../output'),
  { renderTemplate } = require('../template-engines')

const logger = createLogger('email'),
  { writeFile } = fs.promises

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

async function renderEmailTemplate(
  context,
  report,
  channelConfig,
  defaultTemplate = null,
) {
  const emailTemplate = getOption(channelConfig, EMAIL_TEMPLATE_KEY)

  if (emailTemplate) {
    return await renderTemplate(context, report, null, emailTemplate)
  }

  const emailTemplateName = getOption(
    channelConfig,
    EMAIL_TEMPLATE_NAME_KEY,
    EMAIL_TEMPLATE_VAR,
    defaultTemplate,
  )

  return await renderTemplate(
    context,
    report,
    emailTemplateName,
  )
}

async function makeMessage(context, report) {
  const message = {
    from: context.get(EMAIL_FROM_KEY, EMAIL_FROM_VAR),
    to: context.get(EMAIL_TO_KEY, EMAIL_TO_VAR),
    cc: context.get(EMAIL_CC_KEY, EMAIL_CC_VAR),
    subject: await renderTemplate(
      context,
      report,
      null,
      context.get(EMAIL_SUBJECT_KEY, EMAIL_SUBJECT_VAR, ''),
    ),
  }

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
   * render the body from the template specified in the channel config,
   * environment variable, or using the default,
   * `email/message-attachments.html`.
   */
  await sendMailWithBody(
    context,
    channelConfig,
    message,
    body || (
      await renderEmailTemplate(
        context,
        report,
        channelConfig,
        EMAIL_ATTACHMENTS_TEMPLATE_DEFAULT,
      )
    ),
  )
}

async function renderOutputAndSendMailWithAttachments(
  context,
  report,
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

  const text = await output.render(
    context,
    report,
    channelConfig,
    channelConfig.passThrough ? OUTPUT_FORMAT_HTML : null,
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
    context,
    channelConfig,
    message,
    channelConfig.passThrough ? text : (
      await renderEmailTemplate(
        context.context({ result: text }),
        report,
        channelConfig,
        EMAIL_TEMPLATE_DEFAULT,
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
