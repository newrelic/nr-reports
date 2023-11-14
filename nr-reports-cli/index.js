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

$0 -f <manifest-file> [-r <report-ids>] [-u <publish-config-ids>]
$0 -n <name> [-v <values-file>] [-p <template-path>] [-c <channel-ids>] [-o <output-file>] [--skip-render] [--full-chrome]
$0 -d <dashboard-ids> [-c <channel-ids>]
$0 -q <nrql-query> -a <account-id> [-c <channel-ids>] [-o <output-file>]

Description:
The New Relic Reports CLI runs reports using the New Relic Reports engine. The
reports to run can be specified via the CLI options or environment variables.
When the engine starts, it resolves the set of reports to process in the
following order of precedence.

* The -f option or MANIFEST_FILE_PATH environment variable
* The -n option or TEMPLATE_NAME environment variable
* The -d option or DASHBOARD_IDS environment variable
* The -q option or NRQL_QUERY environment variable

If none of the options or environment variables are specified, the engine will
attempt to load a manifest file at the path "include/manifest.json".

Refer to the "Options" section or documentation for additional options and
details.`)
    .example('$0 -f manifest-file.json', 'run reports defined in manifest-file.json')
    .example('$0 -f manifest-file.json -r hello-world,dashboards', 'run the reports named hello-world and dashboards defined in manifest-file.json')
    .example('$0 -f manifest-file.json -p send-email,upload-s3', 'run the reports defined in manifest-file.json and use the first publish configuration that matches the IDs send-email, upload-s3, or default')
    .example('$0 -n template.html', 'run a template report using the template named template.html')
    .example('$0 -n template.html -v values.json', 'run a template report using the template named template.html with template parameters from the file values.json')
    .example('$0 -n template.html --skip-render -c email,s3', 'run a template report using the template named template.html but do not render it as a PDF and publish output to email and s3 channels')
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
      describe: `Run only the reports with report names listed in <report-names>. Takes precedence over \`-n\`, \`-d\`, and \`-q\` and their corresponding environment variables. Ignored if a manifest file is not specified.

    The \`REPORT_NAMES\` environment variable may also be used to specify report names. If both are specified, the \`-r\` option takes precedence.
    `,
    }).option('u', {
      alias: 'publish-config-ids',
      type: 'string',
      describe: `Publish report outputs using the first publish configuration with an ID that matches an ID in the list <publish-config-ids> for each report. If no match is found the publish configuration with the ID \`default\` is used. Ignored if a manifest file is not specified.

    The \`PUBLISH_CONFIG_IDS\` environment variable may also be used to specify publish configuration ids. If both are specified, the \`-u\` option takes precedence.
    `,
    })
    .option('n', {
      alias: 'template-name',
      type: 'string',
      describe: `Run a template report using the template named \`<name>\`. Takes precedence over \`-d\` and \`-a\` and their corresponding environment variables. Ignored if a manifest file is specified.

    The \`TEMPLATE_NAME\` environment variable may also be used to specify a template name. If both are specified, the \`-n\` option takes precedence.
  `,
    })
    .option('v', {
      alias: 'values-file',
      type: 'string',
      describe: `Use the template parameters defined in \`<values-file>\` when running a template report.

    The \`VALUES_FILE_PATH\` environment variable may also be used to specify a values file.
  `,
    })
    .option('p', {
      alias: 'template-path',
      type: 'string',
      describe: `Include paths in \`<template-path>\` on the template search path when running a template report. Multiple paths are separated by the OS path separator character.

    The \`TEMPLATE_PATH\` environment variable may also be used to specify the template search path.
  `,
    })
    .boolean('skip-render')
    .default('skip-render', false)
    .describe('skip-render', `Skip template rendering when running a template report.

    When specified, the raw output of the template report will be passed through to the channels. The engine will not launch a headless Chrome instance and will not render a PDF using the browser.
  `)
    .option('d', {
      alias: 'dashboard-ids',
      type: 'string',
      describe: `Run a dashboard report with the dashboard GUIDs listed in \`<dashboard-ids>\`. Dashboard GUIDs are separated by commas. Takes precedence over \`-q\`. Ignored if a manifest file or a template name is specified.

    The \`DASHBOARD_IDS\` environment variable may also be used to specify the dashboard GUIDs. If both are specified, the \`-d\` option takes precedence.
  `,
    })
    .option('q', {
      alias: 'nrql-query',
      type: 'string',
      describe: `Run a query report with the NRQL query \`<nrql-query>\`. Requires \`-a\`. Ignored if a manifest file, template name, or a dashboard GUID string is specified.

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
      describe: `Use \`<output-file>\` as the name of the PDF file when running a template report and \`--skip-render\` is not specified or when saving output to a file when using the \`file\` or \`s3\` channels. Ignored if a manifest file or dashbuard GUID string is specified.
  `,
    })
    .boolean('verbose')
    .describe('verbose', 'Enable verbose mode.')
    .boolean('debug')
    .describe('debug', 'Enable debug mode (be very verbose).')
    .boolean('full-chrome')
    .default('full-chrome', false)
    .describe('full-chrome', 'Don\'t launch Chromium in headless mode. Use only for testing purposes when rendering a template report.')

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
  const argv = configureOptions().argv,
    fullChrome = argv.fullChrome

  configureLogger(argv)

  const options = {
      manifestFilePath: argv.f,
      reportIds: argv.r,
      publishConfigIds: argv.u,
      templateName: argv.n,
      templatePath: argv.p,
      valuesFilePath: argv.v,
      dashboardIds: argv.d,
      channelIds: argv.c,
      nrqlQuery: argv.q,
      outputFileName: argv.o,
      noRender: argv.skipRender,
    },
    engine = new Engine(
      getSecretData(argv.a),
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
    )

  await engine.run(options)

  logger.trace('Recording job status...')

  newrelic.recordCustomEvent(
    'NrReportsStatus',
    {
      error: false,
      ...options,
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
