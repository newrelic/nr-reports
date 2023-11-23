'use strict'

const {
  createLogger,
  createSchedule,
  listSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  getEnv,
  isUndefined,
} = require('nr-reports-core')

const logger = createLogger('eventbridge'),
  RUN_SCHEDULER_SCHEDULE_NAME_VAR = 'RUN_SCHEDULER_SCHEDULE_NAME',
  SCHEDULE_GROUP_NAME_VAR = 'SCHEDULE_GROUP_NAME',
  REPORTS_LAMBDA_ARN_VAR = 'REPORTS_LAMBDA_ARN',
  REPORTS_LAMBDA_ROLE_ARN_VAR = 'REPORTS_LAMBDA_ROLE_ARN'

function isPublishConfigEnabled(report, publishConfig) {
  return (
    (isUndefined(report.enabled) || report.enabled) &&
    (isUndefined(publishConfig.enabled) || publishConfig.enabled)
  )
}

function getPublishConfig(report, publishConfigId) {
  const reportName = report.name || report.id,
    { publishConfigs } = report,
    publishConfig = publishConfigs.find(
      p => p.id === publishConfigId,
    )

  if (!publishConfig) {
    throw new Error(`Publish configuration with ID "${publishConfigId}" for report "${reportName}" could not be found.`)
  }

  return publishConfig
}

function scheduleExpressionFromCronExpression(report, publishConfig) {
  const reportName = report.name || report.id,
    schedule = publishConfig.schedule,
    parts = schedule.trim().split(/[\s]+/u)

  if (parts.length === 5) {

    // Push a year field if it's only a 5 field expression
    parts.push('*')
  } else if (parts.length !== 6) {
    throw new Error(`Invalid cron expression "${schedule}" for report "${reportName}": Expected 6 parts in CRON expression but found ${parts.length}.`)
  } else if (parts[2] !== '?' && parts[4] !== '?') {
    throw new Error(`Invalid cron expression "${schedule}" for report "${reportName}": Day of month and day of week cannot both be specified.`)
  }

  return `cron(${parts.join(' ')})`
}

class EventBridgeBackend {
  constructor() {
    this.runSchedulerScheduleName = getEnv(RUN_SCHEDULER_SCHEDULE_NAME_VAR)
    if (!this.runSchedulerScheduleName) {
      throw new Error('Missing run scheduler schedule name.')
    }

    this.scheduleGroupName = getEnv(SCHEDULE_GROUP_NAME_VAR)
    if (!this.scheduleGroupName) {
      throw new Error('Missing schedule group name.')
    }

    this.reportsLamdbaArn = getEnv(REPORTS_LAMBDA_ARN_VAR)
    if (!this.reportsLamdbaArn) {
      throw new Error('Missing reports lambda ARN.')
    }

    this.reportsLamdbaRoleArn = getEnv(REPORTS_LAMBDA_ROLE_ARN_VAR)
    if (!this.reportsLamdbaRoleArn) {
      throw new Error('Missing reports lambda role ARN.')
    }
  }

  async getScheduleNames() {
    const schedules = await listSchedules(this.scheduleGroupName)

    return schedules
      .filter(s => s.Name !== this.runSchedulerScheduleName)
      .map(s => s.Name)
  }

  async createSchedule(scheduleName, report, manifestFile, publishConfigId) {
    const publishConfig = getPublishConfig(report, publishConfigId),
      reportName = report.name || report.id,
      publishConfigName = publishConfig.name || publishConfig.id,
      enabled = isPublishConfigEnabled(report, publishConfig)

    await createSchedule(
      this.scheduleGroupName,
      scheduleName,
      scheduleExpressionFromCronExpression(report, publishConfig),
      this.reportsLamdbaArn,
      this.reportsLamdbaRoleArn,
      JSON.stringify({
        options: {
          manifestFilePath: manifestFile,
          reportIds: report.id,
          publishConfigIds: publishConfigId,
        },
      }),
      `Schedule for report ${reportName} and publish configuration ${publishConfigName}`,
      enabled,
    )
  }

  async updateSchedule(scheduleName, report, publishConfigId) {
    const schedule = await getSchedule(this.scheduleGroupName, scheduleName)

    if (!schedule) {
      throw new Error(
        `Missing schedule with group name ${this.scheduleGroupName} and name ${scheduleName}.`,
      )
    }

    const publishConfig = getPublishConfig(report, publishConfigId),
      enabled = isPublishConfigEnabled(report, publishConfig)

    schedule.ScheduleExpression = scheduleExpressionFromCronExpression(
      report,
      publishConfig,
    )
    schedule.State = enabled ? 'ENABLED' : 'DISABLED'

    await updateSchedule(schedule)
  }

  async deleteSchedule(scheduleName) {
    await deleteSchedule(this.scheduleGroupName, scheduleName)
  }
}

module.exports = {
  EventBridgeBackend,
}
