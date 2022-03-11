'use strict'

const email = require('./email'),
  file = require('./file'),
  s3 = require('./s3'),
  { createLogger } = require('../logger')

const publishers = {
    email,
    file,
    s3,
  },
  logger = createLogger('engine')

async function publish(channels, files, parameters) {
  for (let index = 0; index < channels.length; index += 1) {
    const channel = channels[index],
      publisher = publishers[channel.type]

    if (!publisher) {
      throw new Error(`Invalid channel ${channel.type}`)
    }

    logger.debug((log, format) => {
      log(format(`Publishing ${files.length} files to channel ${channel.type}...`))
      log(format('Channel:'))
      log(channel)
      log(format('Files:'))
      files.forEach(f => log(format(f)))
    })

    await publisher(channel, files, parameters)
  }
}

module.exports = publish
