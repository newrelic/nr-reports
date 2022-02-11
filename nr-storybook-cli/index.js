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
      .usage('Usage: [-f manifest-file] | [-n name -v values-file -o output-file -c channels] [-p template-path] [--verbose] [--debug] [--no-headless])')
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
      .option('o', {
        alias: 'output',
        type: 'string',
        describe: 'Write output to <output-file> ',
      })
      .option('c', {
        alias: 'channels',
        type: 'string',
        describe: 'Send the rendered output to the channels listed in <channels> (comma delimited)',
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
      .boolean('verbose')
      .default('verbose', false)
      .describe('verbose', 'Enable verbose mode')
      .boolean('debug')
      .default('debug', false)
      .describe('debug', 'Enable debug mode (be very verbose)')
      .boolean('no-headless')
      .default('no-headless', false)
      .describe('no-headless', 'Don\'t launch Chromium in headless mode (useful for testing templates)'),
    argv = yarggles.argv,
    templateName = argv.n,
    valuesFile = argv.v,
    outputFile = argv.o,
    channels = argv.c,
    templatePath = argv.p,
    manifestFile = argv.f,
    verbose = argv.verbose,
    debug = argv.debug,
    noHeadless = argv.noHeadless
  let reports

  log.isVerbose = verbose
  log.isDebug = debug

  if (manifestFile) {
    reports = parseManifest(manifestFile)
  } else if (!templateName) {
    reports = parseManifest('manifest.json')
  } else if (templateName) {
    let parameters = {}

    if (valuesFile) {
      parameters = parseParams(valuesFile)
    }

    reports = [{
      template: templateName,
      parameters,
      output: outputFile || 'report.pdf',
      channels: channels ? channels.split(/[\s]*,[\s]*/u).map(
        channel => ({ type: channel }),
      ) : [{ type: 'email' }],
    }]
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
        headless: !noHeadless,
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
      const { template, parameters, output, channels: channelConfigs } = reports[index]

      await engine.runReport(template, parameters, output, channelConfigs)
    }
  } catch (err) {
    log.error(err)
  } finally {
    if (browser && !noHeadless) {
      await browser.close()
    }
  }
}

main()
