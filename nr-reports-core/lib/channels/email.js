'use strict'

const nodemailer = require('nodemailer'),
  nunjucks = require('nunjucks'),
  { getProperty, stringToBoolean } = require('../util')

function createSmtpTransport() {
  const smtpConfig = {
    host: process.env.EMAIL_SMTP_SERVER,
    port: process.env.EMAIL_SMTP_PORT ? (
      parseInt(process.env.EMAIL_SMTP_PORT, 10)
    ) : 587,
    secure: typeof process.env.EMAIL_SMTP_SECURE === 'undefined' ? (
      true
    ) : stringToBoolean(process.env.EMAIL_SMTP_SECURE),
  }

  if (process.env.EMAIL_SMTP_USER) {
    smtpConfig.auth = {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS,
    }
  }

  return nodemailer.createTransport(smtpConfig)
}

async function sendEmail(manifest, report, channelConfig, files) {
  const { parameters } = report,
    manifestConfig = manifest.config.email,
    renderContext = {
      ...manifestConfig,
      ...manifest.variables,
      ...channelConfig,
      ...parameters,
    },
    transporter = createSmtpTransport(),
    from = getProperty(
      'from',
      'EMAIL_FROM',
      null,
      channelConfig,
      manifestConfig,
    ),
    to = getProperty('to', 'EMAIL_TO', null, channelConfig, manifestConfig),
    subject = nunjucks.renderString(
      getProperty(
        'subject',
        'EMAIL_SUBJECT',
        '',
        channelConfig,
        manifestConfig,
      ),
      renderContext,
    ),
    template = getProperty(
      'template',
      'EMAIL_TEMPLATE',
      'email/message.html',
      channelConfig,
      manifestConfig,
    ),
    body = nunjucks.render(template, renderContext)

  await transporter.sendMail({
    from,
    to,
    subject,
    html: body,
    attachments: files.map(file => ({ path: file })),
  })

  // @todo handle errors, log success
}

module.exports = {
  publish: sendEmail,
  getChannelDefaults: () => ({}),
}
