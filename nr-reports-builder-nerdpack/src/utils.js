import { SYMBOLS, UI_CONTENT } from "./constants"

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.'

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export function pad(number, length) {
  let str = `${number}`

  while (str.length < length) {
    str = `0${str}`
  }

  return str
}

const idMaps = {}

export function getObjectId(name, object) {
  const idMap = idMaps[name]

  if (!idMap) {
    idMap = { count: 1, idMap: new WeakMap() }
    idMaps[name] = idMap
  }

  const objectId = idMap.get(object)

  if (objectId === undefined) {
    idMap.count += 1
    idMap.idMap.set(object, count)

    return count
  }

  return objectId
}

export function getReportType(report) {
  if (report.query) {
    return SYMBOLS.REPORT_TYPES.QUERY
  }

  return SYMBOLS.REPORT_TYPES.DASHBOARD
}

function dayToLabel(day) {
  switch (day) {
    case 1:
      return UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_SUNDAY

    case 2:
      return UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_MONDAY

    case 3:
      return UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_TUESDAY

    case 4:
      return UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_WEDNESDAY

    case 5:
      return UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_THURSDAY

    case 6:
      return UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_FRIDAY

    case 7:
      return UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_SATURDAY
  }

  return 'an unknown day'
}

function generateBasicScheduleDetails(settings) {
  const {
    amPm,
    dayOfWeek,
    daysOfWeek,
    frequency,
    hour,
    minute,
    period,
    timeZone,
    weekOfMonth,
  } = settings
  let frequencyLabel,
    periodLabel

  // @TODO $$NON-NLS$$

  switch (frequency) {
    case 'daily':
      switch (period) {
        case 'day':
          periodLabel = 'every day'
          break

        case 'weekdays':
          periodLabel = 'every weekday'
          break

        case 'weekends':
          periodLabel = 'every Saturday and Sunday'
          break
      }
      break;

    case 'weekly':
      periodLabel = daysOfWeek.reduce((acc, day, index) => {
        if (index > 0) {
          acc += ', '
          if (index + 1 === daysOfWeek.length) {
            acc += 'and '
          }
        }

        return `${acc}${dayToLabel(day.value)}`
      }, 'every week on ')
      break

    case 'monthly':
      periodLabel = `every month on ${dayToLabel(dayOfWeek)} of week ${weekOfMonth}`
      break
  }

  const amPmLabel = amPm === 'am' ? 'AM' : 'PM',
    tz = timeZone ? timeZone.abbrev : 'UTC',
    hourLabel = hour === -1 ? 'every hour' : `the hour ${hour} ${amPmLabel} ${tz}`,
    minuteLabel = minute === -1 ? 'every minute' : `minute ${minute}`


  return `Run this report ${periodLabel} on ${minuteLabel} of ${hourLabel}.`
}

function generateShortBasicScheduleDetails(settings) {
  const {
    amPm,
    dayOfWeek,
    daysOfWeek,
    frequency,
    hour,
    minute,
    period,
    timeZone,
    weekOfMonth,
  } = settings
  let frequencyLabel,
    periodLabel

  // @TODO $$NON-NLS$$

  switch (frequency) {
    case 'daily':
      switch (period) {
        case 'day':
          periodLabel = 'Every day'
          break

        case 'weekdays':
          periodLabel = 'Every weekday'
          break

        case 'weekends':
          periodLabel = 'Every weekend'
          break
      }
      break;

    case 'weekly':
      periodLabel = daysOfWeek.reduce((acc, day, index) => {
        if (index > 0) {
          acc += ', '
          if (index + 1 === daysOfWeek.length) {
            acc += 'and '
          }
        }

        return `${acc}${dayToLabel(day.value).slice(0, 3)}`
      }, 'Every week on ')
      break

    case 'monthly':
      periodLabel = `Every month on ${dayToLabel(dayOfWeek)} of week ${weekOfMonth}`
      break
  }

  const amPmLabel = amPm === 'am' ? ' AM' : ' PM',
    tz = timeZone ? timeZone.abbrev : 'UTC',
    hourLabel = hour === -1 ? '*' : pad(hour, 2),
    minuteLabel = minute === -1 ? '*' : `${pad(minute, 2)}${hour !== -1 ? amPmLabel : ''}`,
    tzLabel = hour !== -1 ? ` ${tz}` : ''


  return `${periodLabel} at ${hourLabel}:${minuteLabel}${tzLabel}`
}

export function generateFullScheduleDetails(schedule, settings) {
  if (!schedule) {
    return 'No schedule defined'
  }

  if (!settings || !settings.mode || settings.mode === 'manual') {
    return `This report will run as specified by the custom CRON expression "${schedule}".`
  }

  return generateBasicScheduleDetails(settings)
}

export function generateShortScheduleDetails(schedule, settings) {
  if (!schedule) {
    return 'No schedule defined'
  }

  if (!settings || settings.mode === 'manual') {
    return `Custom: ${schedule}`
  }

  return generateShortBasicScheduleDetails(settings)
}

export function generateRandomString(len) {
  const charsLength = CHARS.length
  let chars = ''

  for (let index = 0; index < len; index += 1) {
    chars += CHARS.charAt(Math.floor(Math.random() * charsLength))
  }

  return chars
}

export function formatDateTimeForMillis(millis) {
  const date = new Date(millis)

  if (
    typeof Intl !== 'undefined' &&
    typeof Intl.DateTimeFormat !== 'undefined'
  ) {
    return Intl.DateTimeFormat(undefined, {
      timeZone: 'UTC',
      timeZoneName: 'short',
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    }).format(date)
  }

  return date.toLocaleString()
}

export function splitStringAndTrim(str, delimiter = ',') {
  return str.split(delimiter).map(s => s.trim())
}

export function resolvePublishConfig(metaPublishConfigs, publishConfig) {
  if (publishConfig.ref) {
    const realPublishConfig = (
      metaPublishConfigs?.publishConfigs.find(
        pc => pc.id === publishConfig.ref
      )
    )

    if (!realPublishConfig) {
      throw new Error(`Missing publish config ${publishConfig.ref}`)
    }

    return realPublishConfig
  }

  return publishConfig
}

export function resolveChannel(metaChannels, channel) {
  if (channel.ref) {
    const realChannel = (
      metaChannels?.channels.find(
        c => c.id === channel.ref
      )
    )

    if (!realChannel) {
      throw new Error(`Missing channel ${channel.ref}`)
    }

    return realChannel
  }

  return channel
}

export function sortByNumber(a, b) {
  if (a < b) {
    return -1
  }

  if (a > b) {
    return 1
  }

  return 0
}
