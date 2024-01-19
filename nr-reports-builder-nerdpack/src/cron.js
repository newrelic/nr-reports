const ALL_WILDCARD = '*',
  ANY_WILDCARD = '?',
  LAST_WILDCARD = 'L',
  WEEKDAY_WILDCARD = 'W',
  INCLUDE_WILDCARD = ',',
  INSTANCE_WILDCARD = '#',
  INCREMENT_WILDCARD = '/',
  RANGE_WILDCARD = '-',
  MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  RANGE_MINUTES = [0, 59],
  RANGE_HOURS = [0, 23],
  RANGE_DAYS_OF_MONTH= [1, 31],
  RANGE_MONTHS = [1, 12],
  RANGE_DAYS_OF_WEEK = [1, 7],
  RANGE_WEEKS_IN_MONTH = [1, 5],
  RANGE_YEARS = [1970, 2199],
  MINUTES_FIELD = 0,
  HOURS_FIELD = 1,
  DAYS_OF_MONTH_FIELD = 2,
  MONTHS_FIELD = 3,
  DAYS_OF_WEEK_FIELD = 4,
  YEARS_FIELD = 5,
  DESER_RE = /((?:(?:[^,]+)[,])+(?:(?:[^,]+)))|(^([^-]+)[\-](.+)$)|(^([^\/]+)\/(.+)$)/u,
  SPLIT_INCLUDE_RE = new RegExp(`\\s*${INCLUDE_WILDCARD}\\s*`, 'u')

const ALL_WILDCARD_SYM = Symbol.for(ALL_WILDCARD)
const ANY_WILDCARD_SYM = Symbol.for(ANY_WILDCARD)
const LAST_WILDCARD_SYM = Symbol.for(LAST_WILDCARD)
const WEEKDAY_WILDCARD_SYM = Symbol.for(WEEKDAY_WILDCARD)
const INSTANCE_WILDCARD_SYM = Symbol.for(INSTANCE_WILDCARD)
const INCREMENT_WILDCARD_SYM = Symbol.for(INCREMENT_WILDCARD)
const RANGE_WILDCARD_SYM = Symbol.for(RANGE_WILDCARD)
const DAY_OF_WEEK_SYMS = DAYS_OF_WEEK.reduce((a, v) => (a[v] = Symbol.for(v), a), {})
const MONTH_SYMS = MONTHS.map(v => Symbol.for(v))

function isDefined(x) {
  return typeof x !== 'undefined'
}

function isNumber(x) {
  return typeof x === 'number'
}

function toNumber(val) {
  let v = val

  if (!isNumber(val)) {
    v = new Number(val)

    if (isNaN(v)) {
      throw new Error(`${v} is not a valid numeric value`)
    }

    return v.valueOf()
  }

  return v
}

function toNumberInRange(val, range) {
  const v = toNumber(val)

  if (v < range[0] || v > range[1]) {
    throw new Error(`${v} is not in the range ${range[0]}-${range[1]}`)
  }

  return v
}

function checkAndGetNumber(val) {
  if (!isNumber(val)) {
    throw new Error(`${val} is not a number`)
  }

  return val
}

function checkAndGetNumberInRange(val, range) {
  const v = checkAndGetNumber(val)

  if (v < range[0] || v > range[1]) {
    throw new Error(`${v} is not in the range ${range[0]}-${range[1]}`)
  }

  return v
}

function toSymbol(val, values) {
  if (typeof val === 'string' && values && values.length > 0) {
    const v = val.trim().toLocaleUpperCase(),
      u = values.find(d => d === v)

    return u ? Symbol.for(u) : null
  }

  return null
}

function toSymbolWithError(val, values) {
  const sym = toSymbol(val, values)

  if (!sym) {
    throw new Error(`${val} is not a valid symbolic name`)
  }

  return sym
}

function fromSymbol(val, values) {
  if (typeof val === 'symbol' && values && values.length > 0) {
    const u = values.find(s => s === val)

    return u ? Symbol.keyFor(u) : null
  }

  return null
}

function fromSymbolWithError(val, values) {
  const v = fromSymbol(val, values)

  if (!v) {
    throw new Error(`${v} is not a valid symbol`)
  }

  return v
}

function copy(arr, i, val) {
  if (i === 0) {
    return [].concat(val, arr.slice(1))
  }

  if (i === arr.length - 1) {
    return arr.slice(0, arr.length - 1).concat(val)
  }

  return arr.slice(0, i).concat(val, arr.slice(i + 1))
}

function cron(arr = ['', '', '', '', '', '']) {
  if (arr.length !== 5 && arr.length !== 6) {
    throw new Error(`unexpected cron array length ${arr.length}`)
  }

  return arr.length === 5 ? arr.concat(ALL_WILDCARD) : arr
}

function deserialize(
  val,
  range,
  values = [],
  allowIncrement = true,
) {
  if (val === ALL_WILDCARD) {
    return ALL_WILDCARD_SYM
  }

  const m = DESER_RE.exec(val)

  if (!m) {
    return toSymbol(val, values) || toNumberInRange(val, range)
  }

  if (m[1]) {
    const vals = val.split(SPLIT_INCLUDE_RE),
      sym = toSymbol(vals[0], values)

    return [vals.map(v => {
      if (sym) {
        return toSymbolWithError(v, values)
      }

      return toNumberInRange(v, range)
    })]
  }

  if (m[2]) {
    const sym = toSymbol(m[3], values)

    if (sym) {
      const sym2 = toSymbolWithError(m[4], values)

      return { x: sym, y: sym2, w: RANGE_WILDCARD_SYM}
    }

    return {
      x: toNumberInRange(m[3], range),
      y: toNumberInRange(m[4], range),
      w: RANGE_WILDCARD_SYM,
    }
  }

  if (allowIncrement && m[5]) {
    return {
      x: m[6] === ALL_WILDCARD ? ALL_WILDCARD_SYM : toNumberInRange(m[6], range),
      y: toNumber(m[7]),
      w: INCREMENT_WILDCARD_SYM,
    }
  }

  throw new Error('expected list, range, or increment')
}

function serialize(
  val,
  range,
  values = [],
  allowIncrement = true,
) {
  if (val === ALL_WILDCARD_SYM) {
    return ALL_WILDCARD
  }

  if (Array.isArray(val)) {
    if (val.length == 0) {
      throw new Error('list values must not empty')
    }

    const sym = fromSymbol(val[0], values)

    return val.map(v => {
      if (sym) {
        return fromSymbolWithError(v, values)
      }

      return `${checkAndGetNumberInRange(v, range)}`
    }).join(INCLUDE_WILDCARD)
  }

  const valType = typeof val

  if (valType === 'object' && isDefined(val.x)) {
     const { x, y, w } = val

     switch (w) {
      case RANGE_WILDCARD_SYM:
        const sym = fromSymbol(x, values)

        if (sym) {
          const sym2 = fromSymbolWithError(y, values)

          return `${sym}-${sym2}`
        }

        return `${checkAndGetNumberInRange(x, range)}-${checkAndGetNumberInRange(y, range)}`

      case INCREMENT_WILDCARD_SYM:
        if (allowIncrement && isDefined(y)) {
          const dx = (
              x === ALL_WILDCARD_SYM ? ALL_WILDCARD : checkAndGetNumberInRange(x, range)
            ),
            dy = checkAndGetNumber(y)

          return `${dx}${INCREMENT_WILDCARD}${dy}`
        }

        // Intentionally let this fall through to default

      default:
        throw new Error('expected range or increment')
     }
  }

  return fromSymbol(val, values) || checkAndGetNumberInRange(val, range)
}

function parseMinutes(cron) {
  return copy(cron, MINUTES_FIELD, deserialize(cron[MINUTES_FIELD], RANGE_MINUTES))
}

function minutesToString(cron) {
  return copy(cron, MINUTES_FIELD, serialize(cron[MINUTES_FIELD], RANGE_MINUTES))
}

function parseHours(cron) {
  return copy(cron, HOURS_FIELD, deserialize(cron[HOURS_FIELD], RANGE_HOURS))
}

function hoursToString(cron) {
  return copy(cron, HOURS_FIELD, serialize(cron[HOURS_FIELD], RANGE_HOURS))
}

function parseDaysOfMonth(cron) {
  const val = cron[DAYS_OF_MONTH_FIELD]

  if (val === ANY_WILDCARD) {
    return copy(cron, DAYS_OF_MONTH_FIELD, ANY_WILDCARD_SYM)
  }

  if (val === LAST_WILDCARD) {
    return copy(cron, DAYS_OF_MONTH_FIELD, LAST_WILDCARD_SYM)
  }

  if (val.length > 0 && val[val.length - 1] === WEEKDAY_WILDCARD) {
    return copy(cron, DAYS_OF_MONTH_FIELD, {
      x: toNumberInRange(val.slice(0, val.length - 1), RANGE_DAYS_OF_MONTH),
      w: WEEKDAY_WILDCARD_SYM,
    })
  }

  return copy(cron, DAYS_OF_MONTH_FIELD, deserialize(val, RANGE_DAYS_OF_MONTH))
}

function daysOfMonthToString(cron) {
  const val = cron[DAYS_OF_MONTH_FIELD]

  if (val === ANY_WILDCARD_SYM) {
    return copy(cron, DAYS_OF_MONTH_FIELD, ANY_WILDCARD)
  }

  if (val === LAST_WILDCARD_SYM) {
    return copy(cron, DAYS_OF_MONTH_FIELD, LAST_WILDCARD)
  }

  if (typeof val === 'object' && isDefined(val.x)) {
    const { x, w } = val

    if (w === WEEKDAY_WILDCARD_SYM) {
      return copy(cron, DAYS_OF_MONTH_FIELD, `${checkAndGetNumberInRange(x, RANGE_DAYS_OF_MONTH)}${WEEKDAY_WILDCARD}`)
    }
  }

  return copy(cron, DAYS_OF_MONTH_FIELD, serialize(val, RANGE_DAYS_OF_MONTH))
}

function parseMonths(cron) {
  return copy(cron, MONTHS_FIELD, deserialize(cron[MONTHS_FIELD], RANGE_MONTHS, MONTHS))
}

function monthsToString(cron) {
  return copy(cron, MONTHS_FIELD, serialize(cron[MONTHS_FIELD], RANGE_MONTHS, MONTH_SYMS))
}

function parseDaysOfWeek(cron) {
  const val = cron[DAYS_OF_WEEK_FIELD]

  if (val === ANY_WILDCARD) {
    return copy(cron, DAYS_OF_WEEK_FIELD, ANY_WILDCARD_SYM)
  }

  if (val === LAST_WILDCARD) {
    return copy(cron, DAYS_OF_WEEK_FIELD, LAST_WILDCARD_SYM)
  }

  if (val.length === 3 && val[1] === INSTANCE_WILDCARD) {
    return copy(cron, DAYS_OF_WEEK_FIELD, {
      x: toNumberInRange(val[0], RANGE_DAYS_OF_WEEK),
      y: toNumberInRange(val[2], RANGE_WEEKS_IN_MONTH),
      w: INSTANCE_WILDCARD_SYM,
    })
  }

  return copy(cron, DAYS_OF_WEEK_FIELD, deserialize(val, RANGE_DAYS_OF_WEEK, DAY_OF_WEEK_SYMS, false))
}

function daysOfWeekToString(cron) {
  const val = cron[DAYS_OF_WEEK_FIELD]

  if (val === ANY_WILDCARD_SYM) {
    return copy(cron, DAYS_OF_WEEK_FIELD, ANY_WILDCARD)
  }

  if (val === LAST_WILDCARD_SYM) {
    return copy(cron, DAYS_OF_WEEK_FIELD, LAST_WILDCARD)
  }

  if (typeof val === 'object' && isDefined(val.x)) {
    const { x, y, w } = val

    if (w === INSTANCE_WILDCARD_SYM) {
      return copy(cron, DAYS_OF_WEEK_FIELD, `${checkAndGetNumberInRange(x, RANGE_DAYS_OF_WEEK)}${INSTANCE_WILDCARD}${checkAndGetNumberInRange(y, RANGE_WEEKS_IN_MONTH)}`)
    }
  }

  return copy(cron, DAYS_OF_WEEK_FIELD, serialize(val, RANGE_DAYS_OF_WEEK, DAYS_OF_WEEK, false))
}

function parseYears(cron) {
  return copy(cron, YEARS_FIELD, deserialize(cron[YEARS_FIELD], RANGE_YEARS))
}

function yearsToString(cron) {
  return copy(cron, YEARS_FIELD, serialize(cron[YEARS_FIELD], RANGE_YEARS))
}

function parse(s) {
  let vals = cron(s.split(/[ ]+/u))

  if (
    vals[DAYS_OF_MONTH_FIELD] !== ANY_WILDCARD &&
    vals[DAYS_OF_WEEK_FIELD] !== ANY_WILDCARD
  ) {
    throw new Error('day of month and day of week cannot both be specified')
  }

  return parseYears(
    parseDaysOfWeek(
      parseMonths(
        parseDaysOfMonth(
          parseHours(
            parseMinutes(
              vals,
            )
          )
        )
      )
    )
  )
}

function stringify(
  minutes,
  hours,
  daysOfMonth,
  months,
  daysOfWeek,
  years,
) {
  const c = cron([
    typeof minutes !== 'undefined' ? minutes : ALL_WILDCARD_SYM,
    typeof hours !== 'undefined' ? hours : ALL_WILDCARD_SYM,
    daysOfMonth || ALL_WILDCARD_SYM,
    months || ALL_WILDCARD_SYM,
    daysOfWeek || (
      !daysOfMonth || daysOfMonth !== ANY_WILDCARD_SYM ? (
        ANY_WILDCARD_SYM
      ) : ALL_WILDCARD_SYM
    ),
    years || ALL_WILDCARD_SYM,
  ])

  if (
    c[DAYS_OF_MONTH_FIELD] !== ANY_WILDCARD_SYM &&
    c[DAYS_OF_WEEK_FIELD] !== ANY_WILDCARD_SYM
  ) {
    throw new Error('day of month and day of week cannot both be specified')
  }

  return (
    yearsToString(
      daysOfWeekToString(
        monthsToString(
          daysOfMonthToString(
            hoursToString(
              minutesToString(c)
            )
          )
        )
      )
    )
  ).join(' ')
}

module.exports = {
  ALL_WILDCARD_SYM,
  ANY_WILDCARD_SYM,
  MINUTES_FIELD,
  HOURS_FIELD,
  DAYS_OF_MONTH_FIELD,
  MONTHS_FIELD,
  DAYS_OF_WEEK_FIELD,
  YEARS_FIELD,
  LAST_WILDCARD_SYM,
  WEEKDAY_WILDCARD_SYM,
  INSTANCE_WILDCARD_SYM,
  INCREMENT_WILDCARD_SYM,
  RANGE_WILDCARD_SYM,
  DAY_OF_WEEK_SYMS,
  MONTH_SYMS,
  parse,
  stringify,
}
