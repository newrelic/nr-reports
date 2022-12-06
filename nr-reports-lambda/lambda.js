'use strict'

const chromium = require('chrome-aws-lambda'),
  {
    rootLogger,
    FileHandler,
    Engine,
    getS3ObjectAsString,
    getSecretValue,
    loadManifest,
    parseManifest,
    loadParams,
    parseParams,
    withTempDir,
  } = require('nr-reports-core')

async function getApiKey() {
  const apiKey = process.env.USER_API_KEY,
    apiKeySecret = process.env.USER_API_KEY_SECRET,
    apiKeySecretKey = process.env.USER_API_KEY_SECRET_KEY || 'UserApiKey'

  if (!apiKeySecret) {
    return apiKey
  }

  const secret = await getSecretValue(apiKeySecret, apiKeySecretKey)

  if (!secret) {
    return apiKey
  }

  return secret
}

function lambdaResponse(
  statusCode,
  success = false,
  payload = null,
  message = '',
  mimeType = 'application/json',
) {
  const body = { success }

  if (!success) {
    body.message = message
  } else if (payload) {
    body.payload = payload
  }

  return {
    statusCode,
    headers: {
      'Content-Type': mimeType,
    },
    body: JSON.stringify(body),
  }
}

function getDefaultChannel(sourceBucket = null) {
  if (sourceBucket) {
    return { type: 's3', bucket: process.env.S3_DEST_BUCKET || sourceBucket }
  }

  return { type: 's3' }
}

function getOption(payload, paramName, envName = null) {
  if (
    payload &&
    parameters.options &&
    typeof parameters.options[paramName] !== 'undefined'
  ) {
    return parameters.options[paramName]
  }

  return envName && process.env[envName]
}

function getChannels(parameters, sourceBucket = null) {
  let channels = getOption(parameters, 'channels')

  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    channels = process.env.CHANNELS ? (
      process.env.CHANNELS.split(/[\s]*,[\s]*/u).map(
        channel => (channel === 's3' ? (
          getDefaultChannel(channel, sourceBucket)
        ) : (
          { type: channel })
        ),
      )
    ) : (
      [getDefaultChannel(sourceBucket)]
    )
  }

  return channels
}

function buildReport(report, sourceBucket) {
  if (!report.parameters) {
    report.parameters = {}
  }

}

async function loadAManifest(manifestFile, sourceBucket, parameters) {
  let reports

  if (sourceBucket) {
    reports = parseManifest(
      await getS3ObjectAsString(sourceBucket, manifestFile),
      getDefaultChannel(sourceBucket),
    )
  } else {
    reports = loadManifest(manifestFile, getDefaultChannel())
  }

  if (reports && parameters) {
    reports.forEach(report => {
      if (parameters[report.name]) {
        report.parameters = Object.assign(report.parameters, parameters)
      }
    })
  }

  return reports
}

async function handler(event) {
  const logger = rootLogger,
    logLevel = process.env.LOG_LEVEL || 'INFO'

  if (logLevel === 'VERBOSE') {
    logger.isVerbose = true
  }

  if (logLevel === 'DEBUG') {
    logger.isDebug = true
  }

  if (process.env.LOG_FILE) {
    logger.handlers = new FileHandler(process.env.LOG_FILE)
  }

  logger.debug((log, format) => {
    log(format('Invoked with event:'))
    log(event)

    log(format('Invoked with environment:'))
    log(process.env)
  })

  try {
    let payload = event.body ? event.body : event,
      reports,
      //manifestFile,
      //sourceBucket,
      parameters

    if (Array.isArray(payload)) {
      logger.debug('Found array of reports in event payload')
      reports = payload
    } else if (payload && payload.manifestFile) {
      reports = loadAManifest(
        payload.manifestFile,
        payload.sourceBucket || process.env.S3_SOURCE_BUCKET,
        payload.parameters,
      )
    } else if (process.env.MANIFEST_FILE) {
      reports = loadAManifest(
        process.env.MANIFEST_FILE,
        (payload && payload.sourceBucket) || process.env.S3_SOURCE_BUCKET,
        payload && payload.parameters,
      )
    } else if (payload && payload.templateName) {
      reports = [buildReport(
        payload,
        payload.sourceBucket || process.env.S3_SOURCE_BUCKET,
      )]
    } else if (process.env.TEMPLATE_NAME) {
      reports = [buildReport(
        {
          templateName: process.env.TEMPLATE_NAME,
          parameters: payload && payload.parameters,
        },
        process.env.S3_SOURCE_BUCKET,
      )]
    } else {
      let report

      if (payload) {
        report = payload
      }

      /*
      else if (process.env.VALUES_FILE) {
        logger.debug(`Found values file ${process.env.VALUES_FILE}`)
        if (process.env.S3_SOURCE_BUCKET) {
          logger.debug(
            `Loading ${process.env.VALUES_FILE} from source bucket ${process.env.S3_SOURCE_BUCKET}...`,
          )
          parameters = parseParams(
            await getS3ObjectAsString(
              process.env.S3_SOURCE_BUCKET,
              process.env.VALUES_FILE,
            ),
          )
        } else {
          logger.debug(`Loading ${process.env.VALUES_FILE} from file system...`)
          parameters = loadParams(process.env.VALUES_FILE)
        }
      } else if (process.env.TEMPLATE_PARAMS) {
        parameters = JSON.parse(process.env.TEMPLATE_PARAMS)
      }
      */
    }

    const sourceBucket = getOption(
        parameters, 'sourceBucket', 'S3_SOURCE_BUCKET',
      ),
      templateName = getOption(
        parameters, 'templateName', 'TEMPLATE_NAME',
      ),
      manifestFile = getOption(
        parameters, 'manifestFile', 'MANIFEST_FILE',
      )

    if (sourceBucket) {
      logger.debug(`A sourceBucket ${sourceBucket} is present`)

      if (manifestFile) {
        reports = parseManifest(
          await getS3ObjectAsString(sourceBucket, manifestFile),
          getDefaultChannel(sourceBucket),
        )
      } else if (templateName) {
        reports = [{
          templateName,
          S3Bucket: sourceBucket,
          parameters: {},
          channels: getChannels(parameters, sourceBucket),
        }]
      } else {
        const dashboardGuids = (
          (parameters && parameters.dashboards) || (
            process.env.DASHBOARDS && (
              process.env.DASHBOARDS.split(/[\s]*,[\s]*/u)
            )
          )
        )

        if (dashboardGuids) {
          reports = [{
            dashboards: dashboardGuids,
            channels: getChannels(parameters, sourceBucket),
          }]
        } else {
          reports = parseManifest(
            await getS3ObjectAsString(sourceBucket, 'manifest.json'),
            getDefaultChannel(sourceBucket),
          )
        }
      }
    } else {
      logger.debug('No sourceBucket is present')

      if (manifestFile) {
        reports = loadManifest(manifestFile, getDefaultChannel())
      } else if (templateName) {
        reports = [{
          templateName,
          parameters: {},
          channels: getChannels(parameters),
        }]
      } else {
        const dashboardGuids = (
          (parameters && parameters.dashboards) || (
            process.env.DASHBOARDS && (
              process.env.DASHBOARDS.split(/[\s]*,[\s]*/u)
            )
          )
        )

        if (dashboardGuids) {
          reports = [{
            dashboards: dashboardGuids,
            channels: getChannels(parameters),
          }]
        } else {
          reports = loadManifest('manifest.json', getDefaultChannel())
        }
      }
    }

    if (!reports || reports.length === 0) {
      // eslint-disable-next-line no-console
      console.error('No reports selected.')
      return lambdaResponse(
        500,
        false,
        null,
        'No reports selected.',
      )
    }

    logger.verbose(`Running ${reports.length} reports...`)

    logger.debug((log, format) => {
      log(format('Reports:'))
      log(reports)
    })

    const reportIndex = reports.findIndex(report => (
      report.templateName && (!report.type || report.type === 'text/html')
    ))

    let browser

    if (reportIndex >= 0) {
      const puppetArgs = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      }

      logger.debug((log, format) => {
        log(format('Launching browser using the following args:'))
        log(puppetArgs)
      })

      browser = await chromium.puppeteer.launch(puppetArgs)
    }

    const engine = new Engine({
      apiKey: await getApiKey(),
      templatesPath: 'templates',
      browser,
    })

    await withTempDir(async tempDir => {
      for (let index = 0; index < reports.length; index += 1) {
        const report = reports[index]

        logger.verbose(`Running report ${report.name || index}...`)

        if (report.templateName) {
          report.parameters = report.parameters ? (
            Object.assign({}, report.parameters, parameters)
          ) : parameters

          if (report.S3Bucket) {
            const template = await getS3ObjectAsString(
              report.S3Bucket,
              report.templateName,
            )

            await engine.runTemplateReportWithContent(
              report,
              template,
              tempDir,
            )
            continue
          }

          await engine.runTemplateReport(report, tempDir)
          continue
        } else if (report.dashboards) {
          await engine.runDashboardReport(report, tempDir)
          continue
        }

        logger.warn(`Unrecognized report schema or missing required properties for report ${report.name || index}. Ignoring.`)
      }
    })

    return lambdaResponse(
      200,
      true,
    )
  } catch (err) {
    logger.error('Uncaught exception:')
    logger.error(err)
    return lambdaResponse(
      500,
      false,
      null,
      err.message,
    )
  }
}

module.exports.handler = handler
