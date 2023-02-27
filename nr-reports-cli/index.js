'use strict'

const yargs = require('yargs/yargs'),
  puppeteer = require('puppeteer'),
  {
    rootLogger,
    Engine,
    getArgv,
    getEnv,
    getOption,
    DEFAULT_CHANNEL,
  } = require('nr-reports-core')

function getApiKey() {
  // eslint-disable-next-line dot-notation
  const apiKey = getEnv('NEW_RELIC_API_KEY')

  if (!apiKey) {
    throw Error('No api key found in NEW_RELIC_API_KEY')
  }

  return apiKey
}

async function main() {
  const logger = rootLogger,
    yarggles = yargs(getArgv())
      .usage('Usage: node index.js ([-f manifest-file] | ([-n name -v values-file] [-p template-path] | [-d dashboard-ids] | [-a account-id -q nrql-query]) [-c channel-ids]) [--verbose] [--debug] [--full-chrome])')
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
        alias: 'channel-ids',
        type: 'string',
        describe: 'Send report output files to the channels listed in <channel-ids> (comma delimited)',
      })
      .option('f', {
        alias: 'manifest',
        type: 'string',
        describe: 'Render all reports defined in the JSON <manifest-file>',
      })
      .option('d', {
        alias: 'dashboard-ids',
        type: 'string',
        describe: 'Download dashboard snapshots for all dashboard GUIDs listed in <dashboard-ids> (comma delimited)',
      })
      .option('a', {
        alias: 'account-id',
        type: 'string',
        describe: 'Account ID to use with <nrql-query>',
      })
      .option('q', {
        alias: 'nrql-query',
        type: 'string',
        describe: 'Export results of <nrql-query> as a CSV',
      })
      .option('p', {
        alias: 'template-path',
        type: 'string',
        describe: 'Include all paths in <template-path> on the template path (OS separator delimited)',
        default: 'reports',
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
    fullChrome = argv.fullChrome,
    logLevel = getEnv('LOG_LEVEL', 'info'),
    useVerbose = getOption(argv, 'verbose', null, logLevel === 'verbose'),
    useDebug = getOption(argv, 'debug', null, logLevel === 'DEBUG')

  if (useDebug) {
    rootLogger.level = 'trace'
  } else if (useVerbose) {
    rootLogger.level = 'debug'
  }

  rootLogger.debug(log => {
    log(`CLI args: ${process.argv.slice(2).join(' ')}`)
    log('Yargs argv:')
    log(argv)
  })

  try {
    const engine = new Engine(
        getApiKey(),
        DEFAULT_CHANNEL,
        {
          getPuppetArgs: async () => ({
            args: ['--disable-dev-shm-usage'],
            headless: !fullChrome,
            ignoreHTTPSErrors: true,
          }),
          openChrome: async puppetArgs => (
            await puppeteer.launch(puppetArgs)
          ),
          closeChrome: async browser => {
            if (!fullChrome) {
              await browser.close()
            }
          },
        },
      ),
      values = {
        options: {
          manifestFilePath: argv.f,
          templateName: argv.n,
          templatePath: argv.p,
          valuesFilePath: argv.v,
          dashboardIds: argv.d,
          channelIds: argv.c,
          accountId: argv.a,
          nrqlQuery: argv.q,
          sourceBucket: null, // TODO
        },
      }

    await engine.run(values)
  } catch (err) {
    logger.error('Uncaught exception:')
    logger.error(err)
  }
}

main()
