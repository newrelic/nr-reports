'use strict'

const email = require('./email'),
  file = require('./file'),
  s3 = require('./s3'),
  slack = require('./slack'),
  webhook = require('./webhook'),
  { createLogger, logTrace } = require('../logger'),
  { getOption, splitStringAndTrim, isUndefined } = require('../util'),
  {
    PUBLISH_CONFIG_IDS_OPTION,
    PUBLISH_CONFIG_IDS_VAR,
    DEFAULT_PUBLISH_CONFIG_ID,
  } = require('../constants')

const publishers = {
    email,
    file,
    s3,
    slack,
    webhook,
  },
  logger = createLogger('publisher')

function getPublishConfigIds(options) {
  const publishConfigIdsOpt = getOption(
    options,
    PUBLISH_CONFIG_IDS_OPTION,
    PUBLISH_CONFIG_IDS_VAR,
    DEFAULT_PUBLISH_CONFIG_ID,
  )

  logger.trace(`Found publish config ids ${publishConfigIdsOpt}.`)

  const publishConfigIds = splitStringAndTrim(publishConfigIdsOpt),
    defaultIndex = publishConfigIds.findIndex(
      id => id === DEFAULT_PUBLISH_CONFIG_ID,
    )

  if (defaultIndex === -1) {
    publishConfigIds.push(DEFAULT_PUBLISH_CONFIG_ID)
  }

  return publishConfigIds
}

function getPublishConfig(context, report) {
  const { publishConfigIds } = context,
    { publishConfigs } = report

  if (publishConfigs) {
    for (let index = 0; index < publishConfigIds.length; index += 1) {
      const publishConfigId = publishConfigIds[index],
        publishConfig = publishConfigs.find(
          p => p.id === publishConfigId && (
            isUndefined(p.enabled) || p.enabled
          ),
        )

      if (publishConfig) {
        return publishConfig
      }
    }
  }

  return null
}


async function publish(
  context,
  manifest,
  report,
  output,
  tempDir,
) {
  const reportName = report.name || report.id,
    publishConfig = getPublishConfig(context, report)

  if (!publishConfig) {
    logger.warn(
      {
        publishConfigIds: context.publishConfigIds,
      },
      `Not publishing output for report "${reportName}" because no publish configuration found that is enabled and matches the specified configuration IDs.`,
    )
    return
  }

  const { channels } = publishConfig,
    publishConfigName = publishConfig.name || publishConfig.id,
    publishContext = context.contextNs(
      publishConfig.id,
      { ...publishConfig },
    )

  logTrace(logger, log => {
    log(
      { channels },
      `Publishing output for report "${reportName}" using publish config "${publishConfigName}" to the following channels:`,
    )
  })

  for (let index = 0; index < channels.length; index += 1) {
    const channel = channels[index],
      publisher = publishers[channel.type],
      channelName = channel.name || channel.id,
      channelContext = publishContext.contextNs(
        channel.id,
        { ...channel },
      )

    if (!publisher) {
      throw new Error(`Invalid channel "${channel.type}" for channel "${channelName}" for publish config "${publishConfigName}" and report "${reportName}"`)
    }

    logTrace(logger, log => {
      log(
        { ...channelContext },
        `Publishing output for report "${reportName}" and publish config "${publishConfigName}" to channel "${channelName}" with type "${channel.type}"...`,
      )
    })

    try {
      await publisher.publish(channelContext, manifest, report, publishConfig, channel, output, tempDir)
      logger.trace(`Output for report "${reportName}" and publish config "${publishConfigName}" published to channel "${channelName}" with type "${channel.type}".`)
    } catch (err) {
      logger.error(`Publishing output for report "${reportName}" and publish config "${publishConfigName}" to channel "${channelName}" with type "${channel.type}" failed with the following error. Publishing will continue with remaining channels.`)
      logger.error(err)
    }
  }
}

function getChannelDefaults(type, options) {
  const publisher = publishers[type]

  if (!publisher) {
    throw new Error(`Invalid channel ${type}`)
  }

  return publisher.getChannelDefaults(options)
}

module.exports = {
  publish,
  getChannelDefaults,
  getPublishConfigIds,
}
