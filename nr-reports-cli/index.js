'use strict'

const newrelic = require('newrelic')

const yargs = require('yargs/yargs'),
  puppeteer = require('puppeteer'),
  {
    rootLogger,
    setLogLevel,
    Engine,
    getArgv,
    getEnv,
    getOption,
    toNumber,
    strToLower,
    DEFAULT_CHANNEL,
  } = require('nr-reports-core')

const DEFAULT_DELAY_TIMEOUT_MS = 10000,
  logger = rootLogger

function configureLogger(argv) {
  const logLevel = strToLower(getEnv('LOG_LEVEL', 'info')),
    useVerbose = getOption(argv, 'verbose', null, logLevel === 'verbose'),
    useDebug = getOption(argv, 'debug', null, logLevel === 'debug')

  if (useDebug) {
    setLogLevel(logger, 'trace')
  } else if (useVerbose) {
    setLogLevel(logger, 'debug')
  }
}

function configureOptions() {
  return yargs(getArgv())
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
    .describe('verbose', 'Enable verbose mode')
    .boolean('debug')
    .describe('debug', 'Enable debug mode (be very verbose)')
    .boolean('full-chrome')
    .default('full-chrome', false)
    .describe('full-chrome', 'Don\'t launch Chromium in headless mode (useful for testing templates)')
}

function getApiKey() {
  const apiKey = getEnv('NEW_RELIC_API_KEY')

  if (!apiKey) {
    throw Error('No api key found in NEW_RELIC_API_KEY')
  }

  return apiKey
}

function processPendingData() {
  const exitDelay = toNumber(
    getEnv('DELAY_TIMEOUT_MS', DEFAULT_DELAY_TIMEOUT_MS),
  )

  logger.debug('Letting agent data settle...')
  setTimeout(() => {
    logger.debug('Processing pending New Relic data...')
    newrelic.shutdown({ collectPendingData: true }, () => {
      logger.debug('All done.')

      // Following Suggested by New Relic
      // eslint-disable-next-line node/no-process-exit
      process.exit()
    })
  }, exitDelay)
}

async function main() {
  const argv = configureOptions().argv,
    fullChrome = argv.fullChrome

  configureLogger(argv)

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

    logger.trace('Recording job status...')

    newrelic.recordCustomEvent(
      'NrReportsStatus',
      {
        error: false,
        ...values.options,
      },
    )
  } catch (err) {
    logger.error('Uncaught exception:')
    logger.error(err)

    newrelic.noticeError(err)

    logger.trace('Recording job status...')

    newrelic.recordCustomEvent(
      'NrReportsStatus',
      {
        error: true,
        message: err.message,
      },
    )
  }
}

// Start a background transaction to track the CLI execution as a Non-Web
// transaction and delay termination after main execution to allow the agent
// data to settle before the agent harvests and sends it.

newrelic.startBackgroundTransaction(
  'runReports',
  () => (
    main().then(() => {
      processPendingData()
    })
  ),
)
