'use strict'

const yargs = require('yargs/yargs'),
  { rootLogger } = require('./core/logger'),
  { getApiKey, parseManifest, parseParams } = require('./core/util'),
  chromium = require('chrome-aws-lambda'),
  Engine = require('./core/engine')

async function main() {
  const args = process.argv.slice(2),
    log = rootLogger

  const yarggles = yargs(args)
      .usage('Usage: [-m manifest-file] | [-f file -p params-file -o output-file -c channels] [-d] [-v])')
      .option('f', {
        alias: 'file',
        type: 'string',
        describe: 'Template file',
      })
      .option('p', {
        alias: 'params-file',
        type: 'string',
        describe: 'Parameters file',
      })
      .option('o', {
        alias: 'output',
        type: 'string',
        describe: 'Output file',
      })
      .option('c', {
        alias: 'channels',
        type: 'string',
        describe: 'Comma-delimited string of channels',
        default: 'email',
      })
      .option('m', {
        alias: 'manifest',
        type: 'string',
        describe: 'Manifest file',
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
    channels = argv.c,
    manifestFile = argv.m,
    verbose = argv.v,
    debug = argv.d
  let reports

  log.isVerbose = verbose
  log.isDebug = debug

  if (manifestFile) {
    reports = parseManifest(manifestFile)
  } else if (!file) {
    reports = parseManifest('manifest.json')
  } else if (file) {
    let parameters = {}

    if (paramFile) {
      parameters = parseParams(paramFile)
    }

    reports = [{
      template: file,
      parameters,
      output: outputFile || 'report.pdf',
      channels: channels ? channels.split(/[\s]*,[\s]*/u) : [],
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
      await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true,
        ignoreHTTPSErrors: true,
      })
    )

    const engine = new Engine({
      apiKey: getApiKey(),
      templatesPath: ['.', 'templates'],
      browser,
    })

    for (let index = 0; index < reports.length; index += 1) {
      const { template, parameters, output, channels } = reports[index]

      await engine.runReport(template, parameters, output)
    }
  } catch (err) {
    log.error(err)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

main()
