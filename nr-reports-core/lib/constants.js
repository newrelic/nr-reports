'use strict'

// Email channel constants
const EMAIL_SMTP_SERVER_VAR = 'EMAIL_SMTP_SERVER',
  EMAIL_SMTP_PORT_VAR = 'EMAIL_SMTP_PORT',
  EMAIL_SMTP_SECURE_VAR = 'EMAIL_SMTP_SECURE',
  EMAIL_SMTP_USER_VAR = 'EMAIL_SMTP_USER',
  EMAIL_SMTP_PASS_VAR = 'EMAIL_SMTP_PASS',
  EMAIL_FROM_VAR = 'EMAIL_FROM',
  EMAIL_TO_VAR = 'EMAIL_TO',
  EMAIL_SUBJECT_VAR = 'EMAIL_SUBJECT',
  EMAIL_TEMPLATE_NAME_KEY = 'emailTemplateName',
  EMAIL_TEMPLATE_VAR = 'EMAIL_TEMPLATE',
  EMAIL_FILE_TEMPLATE_VAR = 'EMAIL_FILE_TEMPLATE',
  EMAIL_SMTP_PORT_DEFAULT = 587,
  EMAIL_FROM_KEY = 'from',
  EMAIL_TO_KEY = 'to',
  EMAIL_SUBJECT_KEY = 'subject',
  EMAIL_TEMPLATE_DEFAULT = 'email/message.html',
  EMAIL_ATTACHMENTS_TEMPLATE_DEFAULT = 'email/message-attachments.html'

// File channel constants
const FILE_DEST_DIR_VAR = 'FILE_DEST_DIR',
  FILE_TEMPLATE_VAR = 'FILE_TEMPLATE',
  FILE_DEST_DIR_KEY = 'destDir',
  FILE_TEMPLATE_NAME_KEY = 'fileTemplateName',
  FILE_DEST_DIR_DEFAULT = '.'

// S3 channel constants
const S3_DEST_BUCKET_VAR = 'S3_DEST_BUCKET',
  S3_DEST_BUCKET_KEY = 'bucket',
  S3_SOURCE_BUCKET_VAR = 'S3_SOURCE_BUCKET',
  S3_SOURCE_BUCKET_KEY = 'sourceBucket'

// Slack channel constants
const SLACK_WEBHOOK_URL = 'SLACK_WEBHOOK_URL'

// Common attribute keys
const TEMPLATE_NAME_KEY = 'templateName'

module.exports = {

  // Email channel constants
  EMAIL_SMTP_SERVER_VAR,
  EMAIL_SMTP_PORT_VAR,
  EMAIL_SMTP_SECURE_VAR,
  EMAIL_SMTP_USER_VAR,
  EMAIL_SMTP_PASS_VAR,
  EMAIL_FROM_VAR,
  EMAIL_TO_VAR,
  EMAIL_SUBJECT_VAR,
  EMAIL_TEMPLATE_NAME_KEY,
  EMAIL_TEMPLATE_VAR,
  EMAIL_FILE_TEMPLATE_VAR,
  EMAIL_SMTP_PORT_DEFAULT,
  EMAIL_TEMPLATE_DEFAULT,
  EMAIL_ATTACHMENTS_TEMPLATE_DEFAULT,
  EMAIL_FROM_KEY,
  EMAIL_TO_KEY,
  EMAIL_SUBJECT_KEY,

  // File channel constants
  FILE_DEST_DIR_VAR,
  FILE_TEMPLATE_VAR,
  FILE_DEST_DIR_KEY,
  FILE_TEMPLATE_NAME_KEY,
  FILE_DEST_DIR_DEFAULT,

  // S3 channel constants
  S3_DEST_BUCKET_VAR,
  S3_DEST_BUCKET_KEY,
  S3_SOURCE_BUCKET_VAR,
  S3_SOURCE_BUCKET_KEY,

  // Slack channel constants
  SLACK_WEBHOOK_URL,

  // Common attribute keys
  TEMPLATE_NAME_KEY,
}