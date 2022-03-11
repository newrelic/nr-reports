'use strict'

const yargs = require('yargs/yargs'),
  puppeteer = require('puppeteer'),
  {
    rootLogger,
    parseManifest,
    parseParams,
    splitPaths,
    Engine,
  } = require('nr-storybook-core')

function getApiKey() {
  // eslint-disable-next-line dot-notation
  const apiKey = process.env.NEW_RELIC_API_KEY

  if (!apiKey) {
    throw Error('No api key found in NEW_RELIC_API_KEY')
  }

  return apiKey
}

async function main() {
  const args = process.argv.slice(2),
    log = rootLogger

  const yarggles = yargs(args)
      .usage('Usage: node index.js ([-f manifest-file] | [-n name -v values-file] [-p template-path] | [-d dashboards]) [-c channels] [--verbose] [--debug] [--full-chrome])')
      .option('n', {
        alias: 'template-name',
        type: 'string',
        describe: 'Render using the template named <name>',
      })
      .option('v', {
        alias: 'values-file',
        type: 'string',
        describe: 'Render the template with the parameter values defined in the JSON <values-file>',
      })
      .option('c', {
        alias: 'channels',
        type: 'string',
        describe: 'Send report output files to the channels listed in <channels> (comma delimited)',
      })
      .option('p', {
        alias: 'template-path',
        type: 'string',
        describe: 'Include all paths in <template-path> on the template path (OS separator delimited)',
        default: 'reports',
      })
      .option('f', {
        alias: 'manifest',
        type: 'string',
        describe: 'Render all reports defined in the JSON <manifest-file>',
      })
      .option('d', {
        alias: 'dashboards',
        type: 'string',
        describe: 'Download dashboard snapshots for all dashboard GUIDs listed in <dashboards> (comma delimited)',
      })
      .boolean('verbose')
      .default('verbose', false)
      .describe('verbose', 'Enable verbose mode')
      .boolean('debug')
      .default('debug', false)
      .describe('debug', 'Enable debug mode (be very verbose)')
      .boolean('full-chrome')
      .default('full-chrome', false)
      .describe('full-chrome', 'Don\'t launch Chromium in headless mode (useful for testing templates)'),
    argv = yarggles.argv,
    templateName = argv.n,
    valuesFile = argv.v,
    channels = argv.c,
    templatePath = argv.p,
    manifestFile = argv.f,
    dashboardGuids = argv.d,
    verbose = argv.verbose,
    debug = argv.debug,
    fullChrome = argv.fullChrome
  let reports

  log.isVerbose = verbose
  log.isDebug = debug

  if (manifestFile) {
    reports = parseManifest(manifestFile)
  } else if (templateName) {
    let parameters = {}

    if (valuesFile) {
      parameters = parseParams(valuesFile)
    }

    reports = [{
      template: templateName,
      parameters,
      channels: channels ? channels.split(/[\s]*,[\s]*/u).map(
        channel => ({ type: channel }),
      ) : [{ type: 'file' }],
    }]
  } else if (dashboardGuids) {
    reports = [{
      dashboards: dashboardGuids.split(/[\s]*,[\s]*/u),
      channels: channels ? channels.split(/[\s]*,[\s]*/u).map(
        channel => ({ type: channel }),
      ) : [{ type: 'file' }],
    }]
  } else {
    reports = parseManifest('manifest.json')
  }

  if (!reports || reports.length === 0) {
    // eslint-disable-next-line no-console
    console.error('No reports selected')
    yarggles.showHelp()
    return
  }

  let browser

  try {
    browser = (
      await puppeteer.launch({
        args: ['--disable-dev-shm-usage'],
        headless: !fullChrome,
        ignoreHTTPSErrors: true,
      })
    )

    const paths = templatePath ? splitPaths(templatePath) : [],
      engine = new Engine({
        apiKey: getApiKey(),
        templatesPath: ['.'].concat(paths).concat(['templates']),
        browser,
      })

    for (let index = 0; index < reports.length; index += 1) {
      if (reports[index].template) {
        await engine.runReport(reports[index])
        continue
      } else if (reports[index].dashboards) {
        await engine.runDashboardReport(reports[index])
        continue
      }

      log.warn(`Unrecognized report schema or missing required properties for report #${index}. Ignoring.`)
    }
  } catch (err) {
    log.error(err)
  } finally {
    if (browser && !fullChrome) {
      await browser.close()
    }
  }
}

main()
