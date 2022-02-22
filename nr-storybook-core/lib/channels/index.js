'use strict'

const email = require('./email'),
  s3 = require('./s3')

const publishers = {
  email,
  s3,
}

async function publish(channels, files, parameters) {
  for (let index = 0; index < channels.length; index += 1) {
    const channel = channels[index],
      publisher = publishers[channel.type]

    if (!publisher) {
      throw new Error(`Invalid channel ${channel.type}`)
    }

    await publisher(channel, files, parameters)
  }
}

module.exports = publish
