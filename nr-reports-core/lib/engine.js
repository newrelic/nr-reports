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

class Engine {
  constructor(apiKey, defaultChannelType, callbacks) {
    this.context = new Context({ apiKey, defaultChannelType })
    this.callbacks = callbacks
  }

  async run(args) {
    logSafe(logger, LOG_LEVEL_DEBUG, log => {
      log({ ...this.context, ...args.options }, 'Engine started.')
    })

    let browser

    try {
      const manifest = await discoverReports(
        args,
        this.context.defaultChannelType,
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
        templatePath = getOption(args.options, 'templatePath', 'TEMPLATE_PATH')

      templateGenerator.configureNunjucks(
        this.context.apiKey,
        templatePath,
      )

      const context = this.context.context({
        browser: null,
        ...manifest.variables,
      })

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

          const outputs = await generator.generate(
            reportContext,
            manifest,
            report,
            tempDir,
          )

          if (Array.isArray(outputs) && outputs.length > 0) {
            await publish(
              context,
              manifest,
              report,
              outputs,
            )
          } else {
            logger.warn(`No outputs generated for report ${report.name || index}.`)
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
