'use strict'

const {
  CORE_CONSTANTS,
  createLogger,
  logTrace,
} = require('nr-reports-core')

const logger = createLogger('scheduler'),
  { DEFAULT_MANIFEST_FILE_NAME } = CORE_CONSTANTS

function getSchedule(report) {
  if (typeof report.schedule !== 'string') {
    return null
  }

  const s = report.schedule.trim()

  return s.length > 0 ? s : null
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
    const schedules = await this.backend.getScheduleNames()

    const reports = manifest.reports.filter(r => getSchedule(r)),
      schedulesToDelete = [],
      schedulesToUpdate = []

    logger.trace(`Processing ${schedules.length} schedules...`)

    schedules.forEach(scheduleName => {
      const index = reports.findIndex(r => r.name === scheduleName)

      if (index >= 0) {
        const report = reports.splice(index, 1)[0]

        if (report.lastModifiedDate < lastPolledDate) {
          return
        }

        schedulesToUpdate.push({ scheduleName, report })
        return
      }

      schedulesToDelete.push(scheduleName)
    })

    const schedulesToCreate = reports.filter(r => getSchedule(r))

    logTrace(logger, log => {
      log(`Schedules to create: ${schedulesToCreate.length}`)
      log(`Schedules to update: ${schedulesToUpdate.length}`)
      log(`Schedules to delete: ${schedulesToDelete.length}`)
    })

    if (schedulesToCreate.length > 0) {
      for (let index = 0; index < schedulesToCreate.length; index += 1) {
        await this.backend.createSchedule(
          DEFAULT_MANIFEST_FILE_NAME,
          schedulesToCreate[index],
        )
      }
    }

    if (schedulesToUpdate.length > 0) {
      for (let index = 0; index < schedulesToUpdate.length; index += 1) {
        const { scheduleName, report } = schedulesToUpdate[index]

        await this.backend.updateSchedule(
          scheduleName,
          report,
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
