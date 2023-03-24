'use strict'

const email = require('./email'),
  file = require('./file'),
  s3 = require('./s3'),
  { createLogger, logTrace } = require('../logger')

const publishers = {
    email,
    file,
    s3,
  },
  logger = createLogger('publisher')

async function publish(context, manifest, report, files) {
  const { channels } = report

  logTrace(logger, log => {
    log(
      { channels },
      `Publishing ${files.length} files to the following channels:`,
    )
  })

  for (let index = 0; index < channels.length; index += 1) {
    const channel = channels[index],
      publisher = publishers[channel.type],
      publishContext = context.context({
        ...manifest.config[channel.type],
        ...report,
        ...channel,
      })

    if (!publisher) {
      throw new Error(`Invalid channel ${channel.type}`)
    }

    logTrace(logger, log => {
      log(
        { ...publishContext, ...channel },
        `Publishing ${files.length} files to channel ${channel.type}...`,
      )

      log('Files:')
      files.forEach(f => log(f))
    })

    try {
      await publisher.publish(publishContext, manifest, report, channel, files)
      logger.debug(`${files.length} files published to channel ${channel.type}.`)
    } catch (err) {
      logger.error(`Publishing ${files.length} files to channel ${channel.type} failed with the following error. Publishing will continue with remaining channels.`)
      logger.error(err)
    }
  }
}

function getChannelDefaults(type, options) {
  const publisher = publishers[type]

  if (!publisher) {
    throw new Error(`Invalid channel ${type}`)
  }

  return { type, ...publisher.getChannelDefaults(options) }
}

module.exports = {
  publish,
  getChannelDefaults,
}
