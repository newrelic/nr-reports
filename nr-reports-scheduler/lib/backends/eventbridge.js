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
  RUN_SCHEDULER_SCHEDULE_NAME = 'RunScheduler',
  SCHEDULE_GROUP_NAME_VAR = 'SCHEDULE_GROUP_NAME',
  REPORTS_LAMBDA_ARN_VAR = 'REPORTS_LAMBDA_ARN',
  REPORTS_LAMBDA_ROLE_ARN_VAR = 'REPORTS_LAMBDA_ROLE_ARN'


function scheduleExpressionFromCronExpression(report) {
  const schedule = report.schedule,
    parts = schedule.trim().split(/[\s]+/u)

  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression "${schedule}" for report "${report.name}".`)
  }

  if (parts[2] !== '*') {
    parts[4] = '?'
  } else if (parts[4] !== '*') {
    parts[2] = '?'
  } else {
    parts[4] = '?'
  }

  parts.push('*')

  return `cron(${parts.join(' ')})`
}

class EventBridgeBackend {
  constructor() {
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
      .filter(s => s.Name !== RUN_SCHEDULER_SCHEDULE_NAME)
      .map(s => s.Name)
  }

  async createSchedule(manifestFile, report) {
    await createSchedule(
      this.scheduleGroupName,
      report.name,
      scheduleExpressionFromCronExpression(report),
      this.reportsLamdbaArn,
      this.reportsLamdbaRoleArn,
      JSON.stringify({
        options: {
          manifestFilePath: manifestFile,
          reportNames: report.name,
        },
      }),
    )
  }

  async updateSchedule(scheduleName, report) {
    const schedule = await getSchedule(this.scheduleGroupName, scheduleName)

    if (!schedule) {
      throw new Error(
        `Missing schedule with group name ${this.scheduleGroupName} and name ${scheduleName}.`,
      )
    }

    schedule.ScheduleExpression = scheduleExpressionFromCronExpression(report)

    await updateSchedule(schedule)
  }

  async deleteSchedule(scheduleName) {
    await deleteSchedule(this.scheduleGroupName, scheduleName)
  }
}

module.exports = {
  EventBridgeBackend,
}
