'use strict'

const { publish } = require('./channels'),
  { createLogger } = require('./logger'),
  {
    withTempDir,
    shouldRender,
    getOption,
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
        templatePath = getOption(args.options, 'templatePath', 'TEMPLATE_PATH'),
        engineOptions = {
          apiKey: this.context.apiKey,
          browser: null,
        }

      this.context.env = templateGenerator.configureNunjucks(
        this.context.apiKey,
        templatePath,
      )

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
