'use strict'

const {
  createLogger,
  createSchedule,
  listSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  getEnv,
} = require('nr-reports-core')

const logger = createLogger('eventbridge'),
  RUN_SCHEDULER_SCHEDULE_NAME_VAR = 'RUN_SCHEDULER_SCHEDULE_NAME',
  SCHEDULE_GROUP_NAME_VAR = 'SCHEDULE_GROUP_NAME',
  REPORTS_LAMBDA_ARN_VAR = 'REPORTS_LAMBDA_ARN',
  REPORTS_LAMBDA_ROLE_ARN_VAR = 'REPORTS_LAMBDA_ROLE_ARN'

function scheduleExpressionFromCronExpression(report, publishConfigId) {
  const { publishConfigs } = report,
    publishConfig = publishConfigs.find(
      p => p.id === publishConfigId,
    )

  if (!publishConfig) {
    throw new Error(`Publish configuration with ID "${publishConfigId}" for report "${report.name}" could not be found.`)
  }

  const schedule = publishConfig.schedule,
    parts = schedule.trim().split(/[\s]+/u)

  if (parts.length === 5) {

    // Push a year field if it's only a 5 field expression
    parts.push('*')
  } else if (parts.length !== 6) {
    throw new Error(`Invalid cron expression "${schedule}" for report "${report.name}".`)
  } else if (parts[2] !== '?' && parts[4] !== '?') {
    throw new Error(`Invalid cron expression "${schedule}" for report "${report.name}".`)
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
    await createSchedule(
      this.scheduleGroupName,
      scheduleName,
      scheduleExpressionFromCronExpression(report, publishConfigId),
      this.reportsLamdbaArn,
      this.reportsLamdbaRoleArn,
      JSON.stringify({
        options: {
          manifestFilePath: manifestFile,
          reportIds: report.id,
          publishConfigIds: publishConfigId,
        },
      }),
    )
  }

  async updateSchedule(scheduleName, report, publishConfigName) {
    const schedule = await getSchedule(this.scheduleGroupName, scheduleName)

    if (!schedule) {
      throw new Error(
        `Missing schedule with group name ${this.scheduleGroupName} and name ${scheduleName}.`,
      )
    }

    schedule.ScheduleExpression = scheduleExpressionFromCronExpression(
      report,
      publishConfigName,
    )

    await updateSchedule(schedule)
  }

  async deleteSchedule(scheduleName) {
    await deleteSchedule(this.scheduleGroupName, scheduleName)
  }
}

module.exports = {
  EventBridgeBackend,
}
