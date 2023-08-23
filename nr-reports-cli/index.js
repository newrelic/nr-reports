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
    trimStringAndLower,
    DEFAULT_CHANNEL,
    DEFAULT_LOG_LEVEL,
  } = require('nr-reports-core')

const DEFAULT_DELAY_TIMEOUT_MS = 10000,
  logger = rootLogger

function configureLogger(argv) {
  const logLevel = trimStringAndLower(getEnv('LOG_LEVEL', DEFAULT_LOG_LEVEL)),
    useVerbose = getOption(argv, 'verbose', null, logLevel === 'verbose'),
    useDebug = getOption(argv, 'debug', null, logLevel === 'debug')

  if (useDebug) {
    setLogLevel(logger, 'trace')
  } else if (useVerbose) {
    setLogLevel(logger, 'debug')
  }
}

function configureOptions() {
  const y = yargs(getArgv())

  y.wrap(y.terminalWidth())
    .usage(`Usage:

$0 -f <manifest-file>
$0 -n <name> [-v <values-file>] [-p <template-path>] [-o <output-file>] [--skip-render] [--full-chrome] [-c <channel-ids>]
$0 -d <dashboard-ids> [-c <channel-ids>]
$0 -q <nrql-query> -a <account-id> [-o <output-file>] [-c <channel-ids>]`)
    .example('$0 -f manifest-file.json', 'run reports defined in manifest-file.json')
    .example('$0 -n template.html', 'run a template report using the template named template.html')
    .example('$0 -n template.html -v values.json', 'run a template report using the template named template.html with template parameters from the file values.json')
    .example('$0 -n template.html --skip-render -c email,s3', 'run a template report using the template named template.html but do not render it as a PDF and publish output to email and s3 channels')
    .example('$0 -q "SELECT count(*) FROM Transaction FACET appName" -a 12345 -o query.csv', 'run a query report for a count of transactions by application name for account 12345 and save the output to the file named query.csv')
    .option('n', {
      alias: 'template-name',
      type: 'string',
      describe: 'Run a template report using the template named <name>',
    })
    .option('v', {
      alias: 'values-file',
      type: 'string',
      describe: 'Run a template report with template parameters defined in <values-file>',
    })
    .option('c', {
      alias: 'channel-ids',
      type: 'string',
      describe: 'Publish report output to the channels listed in <channel-ids> (comma delimited)',
    })
    .option('f', {
      alias: 'manifest',
      type: 'string',
      describe: 'Run all reports defined in <manifest-file>',
    })
    .option('d', {
      alias: 'dashboard-ids',
      type: 'string',
      describe: 'Run a dashboard report with the dashboard GUIDs listed in <dashboard-ids> (comma delimited)',
    })
    .option('q', {
      alias: 'nrql-query',
      type: 'string',
      describe: 'Run a query report with the query <nrql-query>',
    })
    .option('a', {
      alias: 'account-id',
      type: 'string',
      describe: 'When running a query report, use account <account-id>',
    })
    .option('p', {
      alias: 'template-path',
      type: 'string',
      describe: 'When running a template report, include paths in <template-path> on the template search path (OS separator delimited)',
    })
    .option('o', {
      alias: 'output-file',
      type: 'string',
      describe: 'For channels which publish output to a file, use file name <output-file>',
    })
    .boolean('verbose')
    .describe('verbose', 'Enable verbose mode')
    .boolean('debug')
    .describe('debug', 'Enable debug mode (be very verbose)')
    .boolean('full-chrome')
    .default('full-chrome', false)
    .describe('full-chrome', 'Don\'t launch Chromium in headless mode (useful for testing templates)')
    .boolean('skip-render')
    .default('skip-render', false)
    .describe('skip-render', 'Skip template rendering')

  return y
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
        outputFileName: argv.o,
        noRender: argv.skipRender,
        // sourceBucket: null, // TODO
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
}

// Start a background transaction to track the CLI execution as a Non-Web
// transaction and delay termination after main execution to allow the agent
// data to settle before the agent harvests and sends it.

newrelic.startBackgroundTransaction(
  'runReports',
  () => (
    main()
      .catch(err => {
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
      })
      .finally(() => {
        processPendingData()
      })
  ),
)
