'use strict'

const newrelic = require('newrelic')

const yargs = require('yargs/yargs'),
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
  logger = rootLogger,
  runnerId = getEnv('APP_NAME', 'nr-reports-cli'),
  runnerVersion = getEnv('APP_VERSION', '<unknown>')

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

$0 -f <manifest-file> [-r <report-ids>] [-u <publish-config-ids>]
$0 -d <dashboard-ids> [-c <channel-ids>]
$0 -q <nrql-query> -a <account-id> [-c <channel-ids>] [-o <output-file>]

Description:
The New Relic Reports CLI runs reports using the New Relic Reports engine. The
reports to run can be specified via the CLI options or environment variables.
When the engine starts, it resolves the set of reports to process in the
following order of precedence.

* The -f option or MANIFEST_FILE_PATH environment variable
* The -d option or DASHBOARD_IDS environment variable
* The -q option or NRQL_QUERY environment variable

If none of the options or environment variables are specified, the engine will
attempt to load a manifest file at the path "include/manifest.json".

Refer to the "Options" section or documentation for additional options and
details.`)
    .example('$0 -f manifest-file.json', 'run reports defined in manifest-file.json')
    .example('$0 -f manifest-file.json -r hello-world,dashboards', 'run the reports named hello-world and dashboards defined in manifest-file.json')
    .example('$0 -f manifest-file.json -p send-email,upload-s3', 'run the reports defined in manifest-file.json and use the first publish configuration that matches the IDs send-email, upload-s3, or default')
    .example('$0 -q "SELECT count(*) FROM Transaction FACET appName" -a 12345 -o query.csv', 'run a query report for a count of transactions by application name for account 12345 and save the output to the file named query.csv')
    .option('f', {
      alias: 'manifest',
      type: 'string',
      describe: `Run all reports defined in the manifest file \`<manifest-file>\`. Takes precedence over \`-n\`, \`-d\`, and \`-q\` and their corresponding environment variables.

    The \`MANIFEST_FILE_PATH\` environment variable may also be used to specify a manifest file. If both are specified, the \`-f\` option takes precedence.
    `,
    }).option('r', {
      alias: 'report-name',
      type: 'string',
      describe: `Run only the reports with report IDs listed in <report-ids>. Takes precedence over \`-n\`, \`-d\`, and \`-q\` and their corresponding environment variables. Ignored if a manifest file is not specified.

    The \`REPORT_IDS\` environment variable may also be used to specify report IDs. If both are specified, the \`-r\` option takes precedence.
    `,
    }).option('u', {
      alias: 'publish-config-ids',
      type: 'string',
      describe: `Publish report outputs using the first publish configuration with an ID that matches an ID in the list <publish-config-ids> for each report. If no match is found the publish configuration with the ID \`default\` is used. Ignored if a manifest file is not specified.

    The \`PUBLISH_CONFIG_IDS\` environment variable may also be used to specify publish configuration ids. If both are specified, the \`-u\` option takes precedence.
    `,
    })
    .option('d', {
      alias: 'dashboard-ids',
      type: 'string',
      describe: `Run a dashboard report with the dashboard GUIDs listed in \`<dashboard-ids>\`. Dashboard GUIDs are separated by commas. Takes precedence over \`-q\`. Ignored if a manifest file is specified.

    The \`DASHBOARD_IDS\` environment variable may also be used to specify the dashboard GUIDs. If both are specified, the \`-d\` option takes precedence.
  `,
    })
    .option('q', {
      alias: 'nrql-query',
      type: 'string',
      describe: `Run a query report with the NRQL query \`<nrql-query>\`. Requires \`-a\`. Ignored if a manifest file or a dashboard GUID string is specified.

    The \`NRQL_QUERY\` environment variable may also be used to specify the a NRQL query. If both are specified, the \`-q\` option takes precedence.
  `,
    })
    .option('a', {
      alias: 'account-id',
      type: 'string',
      describe: `Use the account \`<account-id>\` when running a query report with \`-q\`. Multiple account IDs can be specified separated by commas. Required with \`-q\`.
  `,
    })
    .option('c', {
      alias: 'channel-ids',
      type: 'string',
      describe: `Publish report output to the channels listed in \`<channel-ids>\`. Channel IDs are separated by commas. Ignored if a manifest file is specified.
  `,
    })
    .option('o', {
      alias: 'output-file',
      type: 'string',
      describe: `Use \`<output-file>\` as the file name when saving output to a file when running a query report with the \`file\` or \`s3\` channels. Ignored if a manifest file or dashboard GUID string is specified.
  `,
    })
    .boolean('verbose')
    .describe('verbose', 'Enable verbose mode.')
    .boolean('debug')
    .describe('debug', 'Enable debug mode (be very verbose).')

  return y
}

function getSecretData(accountId) {
  const apiKey = getEnv('NEW_RELIC_API_KEY')

  if (!apiKey) {
    throw Error('No api key found in NEW_RELIC_API_KEY')
  }

  // This is done so we don't accidentally expose the context.secrets
  // info when dumping the context to a log or to the screen. The properties
  // have to explicitly be referenced in code. Otherwise, something like
  // [apiKey getter] will be shown, not the value behind it.

  return {
    get apiKey() {
      return apiKey
    },
    get accountId() {
      return accountId
    },
  }
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
  const argv = configureOptions().argv

  configureLogger(argv)

  const options = {
      manifestFilePath: argv.f,
      reportIds: argv.r,
      publishConfigIds: argv.u,
      dashboardIds: argv.d,
      channelIds: argv.c,
      nrqlQuery: argv.q,
      outputFileName: argv.o,
    },
    engine = new Engine(
      newrelic,
      runnerId,
      runnerVersion,
      getSecretData(argv.a),
      DEFAULT_CHANNEL,
      {},
    )

  await engine.run(options)

  logger.trace('Recording job status...')

  newrelic.recordCustomEvent(
    'NrReportsStatus',
    {
      error: false,
      runnerId,
      runnerVersion,
      reportIds: options.reportIds,
      publishConfigIds: options.publishConfigIds,
      dashboardIds: options.dashboardIds,
      channelIds: options.channelIds,
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
            runnerId,
            runnerVersion,
            message: err.message,
          },
        )
      })
      .finally(() => {
        processPendingData()
      })
  ),
)
