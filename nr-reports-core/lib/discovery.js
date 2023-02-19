'use strict'

const { getChannelDefaults } = require('./channels'),
  { createLogger } = require('./logger'),
  {
    DEFAULT_CHANNEL,
    loadFile,
    parseManifest,
    parseJaml,
    getOption,
    requireAccountId,
  } = require('./util'),
  {
    getS3ObjectAsString,
  } = require('./aws-util')

const logger = createLogger('discovery')

function makeChannel(type, options) {
  return getChannelDefaults(type || DEFAULT_CHANNEL, options)
}

function parseChannels(options, channels) {
  logger.debug((log, format) => {
    log(format('Parsing channels:'))
    log(format(channels))
  })

  const data = channels.split(/[\s]*,[\s]*/u).map(
    type => makeChannel(type, options),
  )

  logger.debug((log, format) => {
    log(format('Parsed channels:'))
    log(format(data))
  })

  return data
}

function getChannels(defaultChannelType, options) {
  const channels = getOption(options, 'channelIds', 'CHANNEL_IDS')

  if (!channels) {
    return [makeChannel(defaultChannelType, options)]
  }

  if (Array.isArray(channels)) {
    return channels.length === 0 ? (
      [makeChannel(defaultChannelType, options)]
    ) : channels
  }

  const data = parseChannels(options, channels)

  return data.length !== 0 ? data : [makeChannel(defaultChannelType, options)]
}

async function loadManifest(
  fileLoader,
  manifestFile,
  defaultChannel,
  values,
  extras,
) {
  const manifest = parseManifest(
    manifestFile,
    await fileLoader(manifestFile),
    defaultChannel,
  )

  manifest.reports = manifest.reports.map(report => {
    if (report.templateName) {
      if (values && values[report.name]) {
        return {
          ...report,
          parameters: {
            ...report.parameters,
            ...values[report.name],
          },
          ...extras,
        }
      }
    }

    if (extras) {
      return { ...report, ...extras }
    }

    return report
  })

  return manifest
}

async function discoverReportsHelper(
  options,
  values,
  fileLoader,
  defaultChannel,
  defaultChannelType,
  extras,
) {
  const manifestFile = getOption(
    options,
    'manifestFilePath',
    'MANIFEST_FILE_PATH',
  )

  // Name of manifest file
  if (manifestFile) {
    logger.debug(`Found manifest file ${manifestFile}.`)

    return await loadManifest(
      fileLoader,
      manifestFile,
      defaultChannel,
      values,
      extras,
    )
  }

  const templateName = getOption(options, 'templateName', 'TEMPLATE_NAME')

  // Name of template file
  if (templateName) {
    logger.debug(`Found template name ${templateName}.`)

    const valuesFile = getOption(options, 'valuesFilePath', 'VALUES_FILE_PATH'),
      channels = getChannels(defaultChannelType, options)

    if (valuesFile) {

      // Do not allow values file to override options
      // eslint-disable-next-line no-unused-vars
      const { options: ignore, ...rest } = parseJaml(
        valuesFile,
        await fileLoader(valuesFile),
      )

      return {
        config: {},
        variables: {},
        reports: [{
          name: `report-${templateName}`,
          templateName,
          parameters: { ...rest, ...values },
          channels,
          ...extras,
        }],
      }
    }

    return {
      config: {},
      variables: {},
      reports: [{
        name: `report-${templateName}`,
        templateName,
        parameters: values || {},
        channels,
        ...extras,
      }],
    }
  }

  const dashboards = getOption(options, 'dashboardIds', 'DASHBOARD_IDS')

  // Array or comma-delimited list of dashboard GUIDs
  if (dashboards) {
    logger.debug(`Found dashboards ${dashboards}.`)

    const dashboardGuids = (
        Array.isArray(dashboards) ? dashboards : dashboards.split(/[\s]*,[\s]*/u)
      ),
      channels = getChannels(defaultChannelType, options)

    return {
      config: {},
      variables: {},
      reports: [{
        dashboards: dashboardGuids,
        channels,
        ...extras,
      }],
    }
  }

  const query = getOption(options, 'nrqlQuery', 'NRQL_QUERY')

  // NRQL query
  if (query) {
    logger.debug(`Found query ${query}.`)

    const accountId = requireAccountId(options),
      channels = getChannels(defaultChannelType, options)

    return {
      config: {},
      variables: {},
      reports: [{
        accountId,
        query,
        channels,
        ...extras,
      }],
    }
  }

  logger.debug('Using default manifest.')

  // Try to load a default manifest from local storage
  return await loadManifest(
    async filePath => await loadFile(filePath),
    'include/manifest.json',
    defaultChannel,
    values,
    extras,
  )
}

async function discoverReports(args, defaultChannelType) {
  if (Array.isArray(args)) {
    logger.debug('Args is an array of reports.')
    return args
  }

  const {
      options,
      ...values
    } = args,
    sourceBucket = getOption(options, 'sourceBucket', 'S3_SOURCE_BUCKET')

  if (sourceBucket) {
    logger.debug(`Found sourceBucket ${sourceBucket}.`)

    return await discoverReportsHelper(
      options,
      values,
      async filePath => await getS3ObjectAsString(sourceBucket, filePath),
      () => makeChannel('s3', options),
      's3',
      { S3Bucket: sourceBucket },
    )
  }

  logger.debug('No sourceBucket found.')

  return await discoverReportsHelper(
    options,
    values,
    async filePath => await loadFile(filePath),
    () => makeChannel(defaultChannelType, options),
    defaultChannelType,
  )
}

module.exports = {
  discoverReports,
}
