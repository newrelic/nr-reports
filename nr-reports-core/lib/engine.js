'use strict'

const {
    publish,
    getPublishConfigIds,
  } = require('./channels'),
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
        publishConfigIds = getPublishConfigIds(options),
        context = this.context.context({
          browser: null,
          templatePath,
          publishConfigIds,
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
          const report = manifest.reports[index],
            reportName = report.name || report.id || index

          let generator

          logger.debug(`Running report ${reportName}...`)

          if (report.templateName) {
            generator = templateGenerator
          } else if (report.dashboards) {
            generator = dashboardGenerator
          } else if (report.query) {
            generator = queryGenerator
          }

          if (!generator) {
            logger.warn(`Unrecognized report schema or missing required properties for report ${reportName}. Ignoring.`)
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
            await publish(
              context,
              manifest,
              report,
              output,
              tempDir,
            )
          } else {
            logger.warn(`No output generated for report ${reportName}.`)
          }

          logger.debug(`Completed report ${reportName}.`)
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
