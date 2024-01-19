'use strict'

// The newrelic module is provided by the Lambda layer.
// eslint-disable-next-line node/no-missing-require
const newrelic = require('newrelic')

const {
  CORE_CONSTANTS,
  createLogger,
  logTrace,
} = require('nr-reports-core')

const logger = createLogger('scheduler'),
  { DEFAULT_MANIFEST_FILE_NAME } = CORE_CONSTANTS

function getPublishConfigurationItems(reports) {
  if (!reports || reports.length <= 0) {
    return null
  }

  return reports.reduce((acc, r) => {
    const { name, id, publishConfigs } = r,
      reportName = name || id

    publishConfigs.filter((publishConfig, index) => {
      if (!publishConfig.id) {
        logger.warn(`Ignoring publish configuration with index ${index} for report ${reportName} because it does not have an 'id' property`)
        return false
      }

      if (
        typeof publishConfig.schedule !== 'string' ||
        publishConfig.schedule.trim().length <= 0
      ) {
        logger.warn(`Ignoring publish configuration with index ${index} for report ${reportName} because it has a missing or empty 'schedule' property`)
        return false
      }

      return true
    }).forEach(publishConfig => acc.push({
      scheduleName: `${id}.${publishConfig.id}`,
      report: r,
      publishConfigId: publishConfig.id,
    }))

    return acc
  }, [])
}

async function createSchedules(backend, schedulesToCreate) {
  for (let index = 0; index < schedulesToCreate.length; index += 1) {
    const {
        scheduleName,
        report,
        publishConfigId,
      } = schedulesToCreate[index],
      reportName = report.name || report.id

    try {
      await backend.createSchedule(
        scheduleName,
        report,
        DEFAULT_MANIFEST_FILE_NAME,
        publishConfigId,
      )
    } catch (err) {
      logger.error(`An error occurred creating schedule ${scheduleName} for report ${reportName} and publish configuration ${publishConfigId}`)
      logger.error(err.message)

      // eslint-disable-next-line no-console
      console.error(err)

      newrelic.noticeError(err)
    }
  }
}

async function updateSchedules(backend, schedulesToUpdate) {
  for (let index = 0; index < schedulesToUpdate.length; index += 1) {
    const {
        scheduleName,
        report,
        publishConfigId,
      } = schedulesToUpdate[index],
      reportName = report.name || report.id

    try {
      await backend.updateSchedule(scheduleName, report, publishConfigId)
    } catch (err) {
      logger.error(`An error occurred updating schedule ${scheduleName} for report ${reportName} and publish configuration ${publishConfigId}`)
      logger.error(err.message)

      // eslint-disable-next-line no-console
      console.error(err)

      newrelic.noticeError(err)
    }
  }
}

async function deleteSchedules(backend, schedulesToDelete) {
  for (let index = 0; index < schedulesToDelete.length; index += 1) {
    const scheduleName = schedulesToDelete[index]

    try {
      await backend.deleteSchedule(scheduleName)
    } catch (err) {
      logger.error(`An error occurred deleting schedule ${scheduleName}`)
      logger.error(err.message)

      // eslint-disable-next-line no-console
      console.error(err)

      newrelic.noticeError(err)
    }
  }
}

async function applyChangeSet(
  backend,
  schedulesToCreate,
  schedulesToUpdate,
  schedulesToDelete,
) {
  logTrace(logger, log => {
    log(`Schedules to create: ${schedulesToCreate.length}`)
    log(`Schedules to update: ${schedulesToUpdate.length}`)
    log(`Schedules to delete: ${schedulesToDelete.length}`)
  })

  if (schedulesToCreate.length > 0) {
    await createSchedules(backend, schedulesToCreate)
  }

  if (schedulesToUpdate.length > 0) {
    await updateSchedules(backend, schedulesToUpdate)
  }

  if (schedulesToDelete.length > 0) {
    await deleteSchedules(backend, schedulesToDelete)
  }

}

async function calculateAndApplyChangeSet(
  backend,
  lastPolledDate,
  scheduleNames,
  publishConfigItems,
) {
  logger.trace(`Processing ${scheduleNames.length} schedules...`)

  const schedulesToCreate = [],
    schedulesToDelete = [],
    schedulesToUpdate = []

  if (!publishConfigItems) {
    logger.debug('No publish configuration items to process.')

    if (scheduleNames.length > 0) {
      schedulesToDelete.splice(0, 0, ...scheduleNames)
    }
  } else {
    logTrace(logger, log => {
      log({ publishConfigItems }, 'Publish configuration items to process:')
    })

    scheduleNames.forEach(scheduleName => {
      logger.trace(`Searching for a publish configuration item matching schedule ${scheduleName}...`)

      const index = publishConfigItems.findIndex(
        s => s.scheduleName === scheduleName,
      )

      if (index >= 0) {
        const publishConfigItem = publishConfigItems.splice(index, 1)[0],
          {
            report,
            publishConfigId,
          } = publishConfigItem,
          reportName = report.name || report.id

        logger.trace(`Publish configuration item for publish configuration ${publishConfigId} for report ${reportName} matches schedule ${scheduleName}`)

        if (report.lastModifiedDate < lastPolledDate) {
          logger.trace(`Ignoring publish configuration item for publish configuration ${publishConfigId} for report ${reportName} because report has not changed since last polled date`)
          return
        }

        logger.trace(`Adding publish configuration item for publish configuration ${publishConfigId} for report ${reportName} to update list`)

        schedulesToUpdate.push(publishConfigItem)
        return
      }

      logger.trace(`Adding schedule ${scheduleName} to delete list because no matching publish configuration items were found`)

      schedulesToDelete.push(scheduleName)
    })

    schedulesToCreate.splice(0, 0, ...publishConfigItems)
  }

  await applyChangeSet(
    backend,
    schedulesToCreate,
    schedulesToUpdate,
    schedulesToDelete,
  )
}

async function poll(repository, backend) {
  logger.debug('Starting poll...')

  const manifestFile = DEFAULT_MANIFEST_FILE_NAME,
    metadata = await repository.getMetadata(),
    {
      lastPolledDate,
      lastModifiedDate,
    } = metadata

  if (lastModifiedDate < lastPolledDate) {
    logger.debug('Last modified is less than last polled, exiting.')
    return
  }

  logger.trace(`Retrieving manifest ${manifestFile} from nerdstorage...`)
  const manifest = await repository.getManifest(manifestFile)

  logger.trace('Retrieving schedule names...')
  const scheduleNames = await backend.getScheduleNames()

  logger.trace('Building publish configuration list...')
  const publishConfigItems = getPublishConfigurationItems(manifest.reports)

  await calculateAndApplyChangeSet(
    backend,
    lastPolledDate,
    scheduleNames,
    publishConfigItems,
  )

  metadata.lastPolledDate = new Date().getTime()

  await repository.updateMetadata(metadata)
}

module.exports = {
  poll,
}
