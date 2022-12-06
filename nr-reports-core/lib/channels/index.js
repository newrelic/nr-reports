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
  logger = createLogger('publisher')

async function publish(channels, files, parameters) {
  for (let index = 0; index < channels.length; index += 1) {
    const channel = channels[index],
      publisher = publishers[channel.type]

    if (!publisher) {
      throw new Error(`Invalid channel ${channel.type}`)
    }

    logger.verbose(`Publishing ${files.length} files to channel ${channel.type}...`)

    logger.debug((log, format) => {
      log(format('Channel:'))
      log(channel)
      log(format('Files:'))
      files.forEach(f => log(f))
    })

    try {
      await publisher(channel, files, parameters)
      logger.verbose(`${files.length} files published to channel ${channel.type}.`)
    } catch (err) {
      logger.error(`Publishing ${files.length} files to channel ${channel.type} failed with the following error. Publishing will continue with remaining channels.`)
      logger.error(err)
    }
  }
}

module.exports = publish
