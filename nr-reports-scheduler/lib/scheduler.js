'use strict'

const {
  CORE_CONSTANTS,
  createLogger,
  logTrace,
} = require('nr-reports-core')

const logger = createLogger('scheduler'),
  { DEFAULT_MANIFEST_FILE_NAME } = CORE_CONSTANTS

function getSchedules(reports) {
  if (!reports || reports.length <= 0) {
    return null
  }

  return reports.reduce((acc, r) => {
    const { name, publishConfigs } = r

    Object.keys(publishConfigs).filter(k => (
      typeof publishConfigs[k].schedule === 'string' &&
      publishConfigs[k].schedule.trim().length > 0
    )).forEach(publishConfigName => acc.push({
      report: r,
      publishConfigName,
      scheduleName: `${name}_${publishConfigName}`,
    }))

    return acc
  }, [])
}

class Scheduler {
  constructor(repository, backend) {
    this.repository = repository
    this.backend = backend
  }

  async poll() {
    logger.debug('Starting poll...')

    const manifestFile = DEFAULT_MANIFEST_FILE_NAME,
      metadata = await this.repository.getMetadata(),
      {
        lastPolledDate,
        lastModifiedDate,
      } = metadata

    if (lastModifiedDate < lastPolledDate) {
      logger.debug('Last modified is less than last polled, exiting.')
      return
    }

    logger.trace(`Retrieving manifest ${manifestFile} from nerdstorage...`)
    const manifest = await this.repository.getManifest(manifestFile)

    logger.trace('Retrieving schedule names...')
    const scheduleNames = await this.backend.getScheduleNames()

    const schedules = getSchedules(manifest.reports)

    if (!schedules) {
      logger.debug('No schedules to process.')
      return
    }

    const schedulesToDelete = [],
      schedulesToUpdate = []

    logger.trace(`Processing ${scheduleNames.length} schedules...`)

    scheduleNames.forEach(scheduleName => {
      const index = schedules.findIndex(s => s.scheduleName === scheduleName)

      if (index >= 0) {
        const schedule = schedules.splice(index, 1)

        if (schedule.report.lastModifiedDate < lastPolledDate) {
          return
        }

        schedulesToUpdate.push(schedule)
        return
      }

      schedulesToDelete.push(scheduleName)
    })

    const schedulesToCreate = schedules

    logTrace(logger, log => {
      log(`Schedules to create: ${schedulesToCreate.length}`)
      log(`Schedules to update: ${schedulesToUpdate.length}`)
      log(`Schedules to delete: ${schedulesToDelete.length}`)
    })

    if (schedulesToCreate.length > 0) {
      for (let index = 0; index < schedulesToCreate.length; index += 1) {
        const {
          scheduleName,
          report,
          publishConfigName,
        } = schedulesToCreate[index]

        await this.backend.createSchedule(
          scheduleName,
          report,
          DEFAULT_MANIFEST_FILE_NAME,
          publishConfigName,
        )
      }
    }

    if (schedulesToUpdate.length > 0) {
      for (let index = 0; index < schedulesToUpdate.length; index += 1) {
        const {
          scheduleName,
          report,
          publishConfigName,
        } = schedulesToUpdate[index]

        await this.backend.updateSchedule(
          scheduleName,
          report,
          publishConfigName,
        )
      }
    }

    if (schedulesToDelete.length > 0) {
      for (let index = 0; index < schedulesToDelete.length; index += 1) {
        await this.backend.deleteSchedule(
          schedulesToDelete[index],
        )
      }
    }

    metadata.lastPolledDate = new Date().getTime()

    await this.repository.updateMetadata(metadata)
  }
}

module.exports = {
  Scheduler,
}
