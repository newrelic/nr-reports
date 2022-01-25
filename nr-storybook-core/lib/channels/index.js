'use strict'

const email = require('./email'),
  s3 = require('./s3')

const channels = {
  email,
  s3,
}

async function publish(channelConfig, files, reportParams) {
  const channel = channels[channelConfig.type]

  if (!channel) {
    throw new Error(`Invalid channel ${channelConfig.type}`)
  }

  channel(channelConfig, files, reportParams)
}

module.exports = publish
