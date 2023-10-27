'use strict'

const { publish } = require('./channels'),
  {
    LOG_LEVEL_DEBUG,
    createLogger,
    logSafe,
    logTrace,
  } = require('./logger'),
  {
    withTempDir,
    shouldRender,
    getOption,
    Context,
  } = require('./util'),
  {
    discoverReports,
  } = require('./discovery'),
  {
    dashboard: dashboardGenerator,
    query: queryGenerator,
    template: templateGenerator,
  } = require('./generators')

const logger = createLogger('engine')

function getPublishConfig(options, report) {
  const publishConfigName = getOption(
    options,
    'publishConfigName',
    'PUBLISH_CONFIG_NAME',
    'default',
  )

  const { publishConfigs } = report

  if (publishConfigs && publishConfigs[publishConfigName]) {
    return publishConfigs[publishConfigName]
  }

  throw new Error(
    `No publish configuration found with publish configuration name ${publishConfigName}`,
  )
}


class Engine {
  constructor(secrets, defaultChannelType, callbacks) {
    this.context = new Context({ secrets, defaultChannelType })
    this.callbacks = callbacks
  }

  async run(options, params) {
    logSafe(logger, LOG_LEVEL_DEBUG, log => {
      log({ ...this.context, ...options }, 'Engine started.')
    })

    let browser

    try {
      const manifest = await discoverReports(
        this.context,
        options,
        params,
      )

      logTrace(logger, log => {
        log({ manifest }, 'Final manifest:')
      })

      if (!manifest || manifest.reports.length === 0) {
        // eslint-disable-next-line no-console
        console.error('No reports selected.')
        throw new Error('No reports selected.')
      }

      logger.debug(`Running ${manifest.reports.length} reports...`)

      logTrace(logger, log => {
        log({ reports: manifest.reports }, 'Reports:')
      })

      const reportIndex = manifest.reports.findIndex(shouldRender),
        templatePath = getOption(options, 'templatePath', 'TEMPLATE_PATH'),
        context = this.context.context({
          browser: null,
          templatePath,
          ...manifest.variables,
        })

      templateGenerator.init(context)
      queryGenerator.init(context)
      dashboardGenerator.init(context)

      if (reportIndex >= 0) {
        logger.trace('Found 1 or more PDF reports. Launching browser...')

        const puppetArgs = await this.callbacks.getPuppetArgs()

        logTrace(logger, log => {
          log(puppetArgs, 'Launching browser using the following args:')
        })

        context.browser = browser = await this.callbacks.openChrome(puppetArgs)
      }

      await withTempDir(async tempDir => {
        for (let index = 0; index < manifest.reports.length; index += 1) {
          const report = manifest.reports[index]

          let generator

          logger.debug(`Running report ${report.name || index}...`)

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

          const reportContext = context.context(report)

          logTrace(logger, log => {
            log(
              reportContext,
              'Invoking generator with the following report context:',
            )
          })

          const output = await generator.generate(
            reportContext,
            manifest,
            report,
            tempDir,
          )

          if (output) {

            // @TODO This needs some work. If there is more than report, should
            // we allow specifying a publish config name per report? Or is it
            // convenient to just specify one config as a common config across
            // many reports?

            const publishConfig = getPublishConfig(options, report)

            await publish(
              context,
              manifest,
              report,
              output,
              publishConfig,
              tempDir,
            )
          } else {
            logger.warn(`No output generated for report ${report.name || index}.`)
          }

          logger.debug(`Completed report ${report.name || index}.`)
        }
      })
    } finally {
      if (browser) {
        await this.callbacks.closeChrome(browser)
      }
    }
  }
}


module.exports = { Engine }
