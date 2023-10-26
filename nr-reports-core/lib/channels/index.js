'use strict'

const email = require('./email'),
  file = require('./file'),
  s3 = require('./s3'),
  slack = require('./slack'),
  { getOption } = require('../util'),
  { createLogger, logTrace } = require('../logger')

const publishers = {
    email,
    file,
    s3,
    slack,
  },
  logger = createLogger('publisher')

function getPublishConfig(context, report) {
  const publishConfigName = getOption(
    context,
    'publishConfigName',
    'PUBLISH_CONFIG_NAME',
    'default',
  )

  const { publishConfigs } = report

  if (publishConfigs && publishConfigs[publishConfigName]) {
    return {
      publishConfigName,
      publishConfig: publishConfigs[publishConfigName],
    }
  }

  throw new Error(
    `No publish configuration found with publish configuration name ${publishConfigName}`,
  )
}

async function publish(context, manifest, report, output, tempDir) {
  const {
      publishConfigName,
      publishConfig,
    } = getPublishConfig(context, report),
    { channels } = publishConfig

  logTrace(logger, log => {
    log(
      { channels },
      `Publishing output for report ${report.name} using publish config ${publishConfigName} to the following channels:`,
    )
  })

  for (let index = 0; index < channels.length; index += 1) {
    const channel = channels[index],
      publisher = publishers[channel.type],
      publishContext = context.context({
        ...manifest.config[channel.type],
        ...report,
        ...publishConfig,
        ...channel,
      })

    if (!publisher) {
      throw new Error(`Invalid channel ${channel.type}`)
    }

    logTrace(logger, log => {
      log(
        { ...publishContext, ...channel },
        `Publishing output for report ${report.name} to channel ${channel.type}...`,
      )
    })

    try {
      await publisher.publish(publishContext, manifest, report, channel, output, tempDir)
      logger.trace(`Output for report ${report.name} published to channel ${channel.type}.`)
    } catch (err) {
      logger.error(`Publishing output for report ${report.name} to channel ${channel.type} failed with the following error. Publishing will continue with remaining channels.`)
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
