'use strict'

const { publish } = require('./channels'),
  { createLogger } = require('./logger'),
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
    logger.debug((log, format) => {
      this.context.dump('Invoked with context:')

      log(format('Invoked with arguments:'))
      log(args)

      log(format('Invoked with environment:'))
      log(process.env)
    })

    let browser

    try {
      const manifest = await discoverReports(
        args,
        this.context.defaultChannelType,
      )

      logger.debug((log, format) => {
        log(format('Final manifest:'))
        log(format(manifest))
      })

      if (!manifest || manifest.reports.length === 0) {
        // eslint-disable-next-line no-console
        console.error('No reports selected.')
        throw new Error('No reports selected.')
      }

      logger.verbose(`Running ${manifest.reports.length} reports...`)

      logger.debug((log, format) => {
        log(format('Reports:'))
        log(format(manifest.reports))
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
        logger.debug('Found 1 or more PDF reports. Launching browser...')

        const puppetArgs = await this.callbacks.getPuppetArgs()

        logger.debug((log, format) => {
          log(format('Launching browser using the following args:'))
          log(format(puppetArgs))
        })

        context.browser = browser = await this.callbacks.openChrome(puppetArgs)
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

          const reportContext = context.context(report)

          logger.debug(() => {
            reportContext.dump('Report context:')
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

          logger.verbose(`Completed report ${report.name || index}.`)
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
