'use strict'

const nunjucks = require('nunjucks'),
  { publish, getChannelDefaults } = require('./channels'),
  { createLogger } = require('./logger'),
  NrqlExtension = require('./extensions/nrql-extension'),
  ChartExtension = require('./extensions/chart-extension'),
  DumpContextExtension = require('./extensions/dump-context-extension'),
  {
    loadFile,
    parseManifest,
    parseJaml,
    withTempDir,
    getOption,
    DEFAULT_CHANNEL,
    splitPaths,
    shouldRender,
  } = require('./util'),
  {
    getS3ObjectAsString,
  } = require('./aws-util'),
  {
    dashboard: dashboardGenerator,
    query: queryGenerator,
    template: templateGenerator,
  } = require('./generators')

const logger = createLogger('engine')

function buildTemplatePath(args) {
  const templatePath = getOption(args.options, 'templatePath', 'TEMPLATE_PATH'),
    templatesPath = ['.', 'include', 'templates']

  return templatePath ? (
    templatesPath.concat(splitPaths(templatePath))
  ) : templatesPath
}

function makeChannel(type, options) {
  return getChannelDefaults(type || DEFAULT_CHANNEL, options)
}

function parseChannels(options, channels) {
  logger.debug((log, format) => {
    log(format('Parsing channels:'))
    log(channels)
  })

  const data = channels.split(/[\s]*,[\s]*/u).map(
    type => makeChannel(type, options),
  )

  logger.debug((log, format) => {
    log(format('Parsed channels:'))
    log(JSON.stringify(data, null, 2))
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
  const manifestFile = getOption(options, 'manifestFilePath', 'MANIFEST_FILE_PATH')

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

async function discoverReports(context, args) {
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
      {
        S3Bucket: sourceBucket,
      },
    )
  }

  logger.debug('No sourceBucket found.')

  return await discoverReportsHelper(
    options,
    values,
    async filePath => await loadFile(filePath),
    () => makeChannel(context.defaultChannelType, options),
  )
}

function configureNunjucks(context, args) {
  logger.verbose('Configuring Nunjucks...')

  const templatesPath = buildTemplatePath(args)

  logger.debug((log, format) => {
    log(format('Final template path:'))
    log(templatesPath)
  })

  const env = nunjucks.configure(templatesPath)

  env.addExtension('NrqlExtension', new NrqlExtension(context.apiKey))
  env.addExtension('ChartExtension', new ChartExtension(context.apiKey))
  env.addExtension('DumpContextExtension', new DumpContextExtension())

  return env
}

class Engine {
  constructor(context) {
    this.context = context
  }

  async run(args) {
    logger.debug((log, format) => {
      log(format('Invoked with context:'))
      log({ ...this.context, apiKey: '[REDACTED]' })

      log(format('Invoked with arguments:'))
      log(args)

      log(format('Invoked with environment:'))
      log(process.env)
    })

    let browser

    try {
      const manifest = await discoverReports(this.context, args)

      logger.debug((log, format) => {
        log(format('Final manifest:'))
        log(manifest)
      })

      if (!manifest || manifest.reports.length === 0) {
        // eslint-disable-next-line no-console
        console.error('No reports selected.')
        throw new Error('No reports selected.')
      }

      logger.verbose(`Running ${manifest.reports.length} reports...`)

      logger.debug((log, format) => {
        log(format('Reports:'))
        log(manifest.reports)
      })

      const reportIndex = manifest.reports.findIndex(shouldRender),
        engineOptions = {
          apiKey: this.context.apiKey,
          browser: null,
        }

      this.context.env = configureNunjucks(this.context, args)

      if (reportIndex >= 0) {
        logger.debug('Found 1 or more PDF reports. Launching browser...')

        const puppetArgs = await this.context.getPuppetArgs()

        logger.debug((log, format) => {
          log(format('Launching browser using the following args:'))
          log(puppetArgs)
        })

        engineOptions.browser = browser = (
          await this.context.openChrome(puppetArgs)
        )
      }

      await withTempDir(async tempDir => {
        for (let index = 0; index < manifest.reports.length; index += 1) {
          const report = manifest.reports[index]

          let generator

          logger.verbose(`Running report ${report.name || index}...`)

          if (report.templateName) {
            generator = templateGenerator
          } else if (report.dashboards) {
            generator = dashboardGenerator
          } else if (report.query) {
            generator = queryGenerator
          }

          if (!generator) {
            logger.warn(`Unrecognized report schema or missing required properties for report ${report.name || index}. Ignoring.`)
            continue
          }

          const outputs = await generator.generate(
            engineOptions,
            manifest,
            report,
            tempDir,
          )

          if (Array.isArray(outputs) && outputs.length > 0) {
            await publish(
              manifest,
              report,
              outputs,
            )
          }
        }
      })
    } finally {
      if (browser) {
        await this.context.closeChrome(browser)
      }
    }
  }
}


module.exports = { Engine }
