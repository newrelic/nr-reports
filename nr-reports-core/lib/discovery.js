'use strict'

const path = require('path'),
  { getChannelDefaults } = require('./channels'),
  { createLogger, logTrace } = require('./logger'),
  {
    DEFAULT_CHANNEL,
    loadFile,
    normalizeManifest,
    parseJaml,
    getOption,
    requireAccountId,
    splitStringAndTrim,
    isUndefined,
  } = require('./util'),
  {
    getS3ObjectAsString,
  } = require('./aws-util'),
  {
    CHANNEL_IDS_OPTION,
    CHANNEL_IDS_VAR,
    MANIFEST_FILE_PATH_OPTION,
    MANIFEST_FILE_PATH_VAR,
    REPORT_IDS_OPTION,
    REPORT_IDS_VAR,
    DEFAULT_MANIFEST_FILE_NAME,
    TEMPLATE_NAME_OPTION,
    TEMPLATE_NAME_VAR,
    VALUES_FILE_PATH_OPTION,
    VALUES_FILE_PATH_VAR,
    OUTPUT_FILE_NAME_OPTION,
    NO_RENDER_OPTION,
    DASHBOARD_IDS_OPTION,
    DASHBOARD_IDS_VAR,
    DEFAULT_DASHBOARD_REPORT_ID,
    COMBINE_PDFS_KEY,
    NRQL_QUERY_OPTION,
    NRQL_QUERY_VAR,
    DEFAULT_QUERY_REPORT_ID,
    DEFAULT_MANIFEST_FILE_PATH,
    S3_SOURCE_BUCKET_KEY,
    S3_SOURCE_BUCKET_VAR,
    SOURCE_NERDLET_ID_OPTION,
    SOURCE_NERDLET_ID_VAR,
    MANIFESTS_COLLECTION_NAME,
    DEFAULT_PUBLISH_CONFIG_ID,
  } = require('./constants')

const { NerdstorageClient } = require('./nerdstorage')

const logger = createLogger('discovery')

function makeChannel(type, options) {
  return getChannelDefaults(type || DEFAULT_CHANNEL, options)
}

function parseChannels(options, channels) {
  logTrace(logger, log => {
    log({ channels }, 'Parsing channels:')
  })

  const data = channels.split(/[\s]*,[\s]*/u).map(
    type => makeChannel(type, options),
  )

  logTrace(logger, log => {
    log({ channels: data }, 'Parsed channels:')
  })

  return data
}

function getChannels(defaultChannelType, options) {
  const channels = getOption(options, CHANNEL_IDS_OPTION, CHANNEL_IDS_VAR)

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

function prepareManifest(
  options,
  data,
  defaultChannel,
  params,
  extras,
) {
  const manifest = normalizeManifest(data, defaultChannel),
    reportIdsOpt = getOption(options, REPORT_IDS_OPTION, REPORT_IDS_VAR)

  if (reportIdsOpt) {
    logger.trace(`Found report ids ${reportIdsOpt}.`)

    const reportIds = splitStringAndTrim(reportIdsOpt)

    manifest.reports = manifest.reports.filter(
      r => reportIds.includes(r.id),
    )
  }

  manifest.reports = manifest.reports.filter((report, index) => {
    const enabled = isUndefined(report.enabled) || report.enabled

    if (!enabled) {
      const reportName = report.name || report.id || index

      logger.trace(`Excluding ${reportName} because it is not enabled.`)
    }

    return enabled
  }).map(report => {
    if (report.templateName) {
      if (params && params[report.id]) {
        return {
          ...report,
          parameters: {
            ...report.parameters,
            ...params[report.id],
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

async function loadManifest(
  options,
  fileLoader,
  manifestFile,
  defaultChannel,
  params,
  extras,
) {
  return prepareManifest(
    options,
    parseJaml(manifestFile, await fileLoader(manifestFile)),
    defaultChannel,
    params,
    extras,
  )
}

async function loadManifestFromNerdstorage(
  context,
  options,
  params,
  nerdletPackageId,
) {
  const accountId = requireAccountId(context),
    manifestFile = getOption(
      options,
      MANIFEST_FILE_PATH_OPTION,
      MANIFEST_FILE_PATH_VAR,
      DEFAULT_MANIFEST_FILE_NAME,
    ),
    nerdstorage = new NerdstorageClient(
      context.secrets.apiKey,
      nerdletPackageId,
      accountId,
    )

  logger.trace(`Loading manifest ${manifestFile} from nerdstorage.`)

  const doc = await nerdstorage.readDocument(
    MANIFESTS_COLLECTION_NAME,
    manifestFile,
  )

  if (!doc) {
    throw new Error(`Document with ID ${manifestFile} does not exist in nerdstorage for nerdlet ${nerdletPackageId}.`)
  }

  return prepareManifest(
    options,
    doc,
    () => makeChannel(context.defaultChannelType, options),
    params,
  )
}

async function discoverReportsHelper(
  context,
  options,
  params,
  fileLoader,
  defaultChannel,
  defaultChannelType,
  extras,
) {
  const manifestFile = getOption(
    options,
    MANIFEST_FILE_PATH_OPTION,
    MANIFEST_FILE_PATH_VAR,
  )

  // Name of manifest file
  if (manifestFile) {
    logger.trace(`Found manifest file ${manifestFile}.`)

    return await loadManifest(
      options,
      fileLoader,
      manifestFile,
      defaultChannel,
      params,
      extras,
    )
  }

  const templateName = getOption(
    options,
    TEMPLATE_NAME_OPTION,
    TEMPLATE_NAME_VAR,
  )

  // Name of template file
  if (templateName) {
    logger.trace(`Found template name ${templateName}.`)

    const valuesFile = getOption(
        options,
        VALUES_FILE_PATH_OPTION,
        VALUES_FILE_PATH_VAR,
      ),
      channels = getChannels(defaultChannelType, options),
      reportId = path.parse(templateName).name,
      outputFileName = getOption(options, OUTPUT_FILE_NAME_OPTION),
      noRender = getOption(options, NO_RENDER_OPTION, null, false)

    if (valuesFile) {

      const valuesFileParams = parseJaml(
        valuesFile,
        await fileLoader(valuesFile),
      )

      return {
        config: {},
        variables: {},
        reports: [{
          id: reportId,
          templateName,
          render: !noRender,
          outputFileName,
          parameters: { ...valuesFileParams, ...params },
          publishConfigs: [
            {
              id: DEFAULT_PUBLISH_CONFIG_ID,
              channels,
            },
          ],
          ...extras,
        }],
      }
    }

    return {
      config: {},
      variables: {},
      reports: [{
        id: reportId,
        templateName,
        render: !noRender,
        outputFileName,
        parameters: params || {},
        publishConfigs: [
          {
            id: DEFAULT_PUBLISH_CONFIG_ID,
            channels,
          },
        ],
        ...extras,
      }],
    }
  }

  const dashboards = getOption(
      options,
      DASHBOARD_IDS_OPTION,
      DASHBOARD_IDS_VAR,
    ),
    combinePdfs = getOption(options, COMBINE_PDFS_KEY)

  // Array or comma-delimited list of dashboard GUIDs
  if (dashboards) {
    logger.trace(`Found dashboards ${dashboards}.`)

    const dashboardGuids = (
        Array.isArray(dashboards) ? dashboards : dashboards.split(/[\s]*,[\s]*/u)
      ),
      channels = getChannels(defaultChannelType, options)

    return {
      config: {},
      variables: {},
      reports: [{
        id: DEFAULT_DASHBOARD_REPORT_ID,
        dashboards: dashboardGuids,
        combinePdfs,
        publishConfigs: [
          {
            id: DEFAULT_PUBLISH_CONFIG_ID,
            channels,
          },
        ],
        ...extras,
      }],
    }
  }

  const query = getOption(options, NRQL_QUERY_OPTION, NRQL_QUERY_VAR)

  // NRQL query
  if (query) {
    logger.trace(`Found query ${query}.`)

    const channels = getChannels(defaultChannelType, options),
      outputFileName = getOption(options, OUTPUT_FILE_NAME_OPTION)

    return {
      config: {},
      variables: {},
      reports: [{
        id: DEFAULT_QUERY_REPORT_ID,
        query,
        outputFileName,
        publishConfigs: [
          {
            id: DEFAULT_PUBLISH_CONFIG_ID,
            channels,
          },
        ],
        ...extras,
      }],
    }
  }

  logger.trace('Using default manifest.')

  // Try to load a default manifest from local storage
  return await loadManifest(
    options,
    async filePath => await loadFile(filePath),
    DEFAULT_MANIFEST_FILE_PATH,
    defaultChannel,
    params,
    extras,
  )
}

async function discoverReports(context, options, params) {
  if (Array.isArray(options)) {
    logger.trace('Options object is an array of reports.')

    return prepareManifest(
      {},
      options,
      () => makeChannel(context.defaultChannelType, {}),
      params,
    )
  }

  const sourceBucket = getOption(
    options,
    S3_SOURCE_BUCKET_KEY,
    S3_SOURCE_BUCKET_VAR,
  )

  if (sourceBucket) {
    logger.trace(`Found sourceBucket ${sourceBucket}.`)

    return await discoverReportsHelper(
      context,
      options,
      params,
      async filePath => await getS3ObjectAsString(sourceBucket, filePath),
      () => makeChannel('s3', options),
      's3',
      { S3Bucket: sourceBucket },
    )
  }

  logger.trace('No sourceBucket found.')

  const sourceNerdletId = getOption(
    context.secrets,
    SOURCE_NERDLET_ID_OPTION,
    SOURCE_NERDLET_ID_VAR,
  )

  if (sourceNerdletId) {
    logger.trace(`Found sourceNerdletId ${sourceNerdletId}.`)

    return await loadManifestFromNerdstorage(
      context,
      options,
      params,
      sourceNerdletId,
    )
  }

  logger.trace('No sourceNerdletId found.')

  return await discoverReportsHelper(
    context,
    options,
    params,
    async filePath => await loadFile(filePath),
    () => makeChannel(context.defaultChannelType, options),
    context.defaultChannelType,
  )
}

module.exports = {
  discoverReports,
}
