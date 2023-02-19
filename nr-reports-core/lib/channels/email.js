'use strict'

const nodemailer = require('nodemailer'),
  nunjucks = require('nunjucks'),
  { toBoolean, toNumber } = require('../util')

function createSmtpTransport() {
  const smtpConfig = {
    host: process.env.EMAIL_SMTP_SERVER,
    port: process.env.EMAIL_SMTP_PORT ? (
      toNumber(process.env.EMAIL_SMTP_PORT)
    ) : 587,
    secure: typeof process.env.EMAIL_SMTP_SECURE === 'undefined' ? (
      true
    ) : toBoolean(process.env.EMAIL_SMTP_SECURE),
  }

  if (process.env.EMAIL_SMTP_USER) {
    smtpConfig.auth = {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS,
    }
  }

  return nodemailer.createTransport(smtpConfig)
}

async function sendEmail(context, manifest, report, channelConfig, files) {
  const { parameters } = report,
    renderContext = context.context(parameters),
    transporter = createSmtpTransport(),
    from = context.get('from', 'EMAIL_FROM'),
    to = context.get('to', 'EMAIL_TO'),
    subject = nunjucks.renderString(
      context.get('subject', 'EMAIL_SUBJECT', ''),
      renderContext,
    ),
    template = context.get('template', 'EMAIL_TEMPLATE', 'email/message.html'),
    body = nunjucks.render(template, renderContext)

  await transporter.sendMail({
    from,
    to,
    subject,
    html: body,
    attachments: files.map(file => ({ path: file })),
  })
}

module.exports = {
  publish: sendEmail,
  getChannelDefaults: () => ({}),
}
