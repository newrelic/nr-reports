'use strict'

const nodemailer = require('nodemailer'),
  nunjucks = require('nunjucks'),
  { stringToBoolean } = require('../util')

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

async function sendEmail(channelConfig, files, reportParams) {
  const transporter = createSmtpTransport(),
    from = channelConfig.from || process.env.EMAIL_FROM,
    to = channelConfig.to || process.env.EMAIL_TO,
    subject = nunjucks.renderString(
      channelConfig.subject || process.env.EMAIL_SUBJECT || '',
      { ...channelConfig, ...reportParams },
    ),
    template = channelConfig.template || process.env.EMAIL_TEMPLATE || 'email-template.html',
    body = nunjucks.render(template, { ...channelConfig, ...reportParams })

  await transporter.sendMail({
    from,
    to,
    subject,
    html: body,
    attachments: files.map(file => ({ path: file })),
  })

  // @todo handle errors, log success
}

module.exports = sendEmail
