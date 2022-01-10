'use strict'

const yargs = require('yargs/yargs'),
  { rootLogger } = require('./lib/logger'),
  { getApiKey } = require('./lib/util'),
  chromium = require('chrome-aws-lambda'),
  Engine = require('./lib/engine')

async function main() {
  const args = process.argv.slice(2),
    log = rootLogger

  log.log(args)

  const yarggles = yargs(args)
      .usage('Usage: -f file -p params-file -o output-file [-d] [-v])')
      .option('f', {
        alias: 'file',
        type: 'string',
        describe: 'Read template from file',
        demandOption: true,
      })
      .option('o', {
        alias: 'output',
        type: 'string',
        describe: 'Output file',
        demandOption: true,
      })
      .option('p', {
        alias: 'params-file',
        type: 'string',
        describe: 'Parameters file',
        demandOption: true,
      })
      .option('v', {
        alias: 'verbose',
        type: 'boolean',
        describe: 'Verbose mode',
        default: false,
      })
      .option('d', {
        alias: 'debug',
        type: 'boolean',
        describe: 'Debug mode',
        default: false,
      }),
    argv = yarggles.argv,
    file = argv.f,
    paramFile = argv.p,
    outputFile = argv.o,
    verbose = argv.v,
    debug = argv.d

  log.isVerbose = verbose
  log.isDebug = debug

  try {
    const engine = new Engine({
      apiKey: getApiKey(),
      templatesPath: ['.', 'templates'],
      browser: (
        await chromium.puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: true,
          ignoreHTTPSErrors: true,
        })
      ),
    })

    await engine.runReport(file, paramFile, outputFile)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err.message)
  }
}

main()
