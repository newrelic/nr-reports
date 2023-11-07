import {
  createContext,
  useMemo,
  useReducer,
} from 'react'
import cron, {
  ALL_WILDCARD_SYM,
  ANY_WILDCARD_SYM,
  DAYS_OF_MONTH_FIELD,
  DAYS_OF_WEEK_FIELD,
  HOURS_FIELD,
  INCREMENT_WILDCARD_SYM,
  INSTANCE_WILDCARD_SYM,
  MINUTES_FIELD,
  MONTHS_FIELD,
  YEARS_FIELD,
} from '../../cron'

const initialState = {
  basicFormState: {
    amPm: 'am',
    dayOfWeek: 1,
    daysOfWeek: [],
    frequency: 'daily',
    hour: -1,
    minute:  -1,
    period: 'day',
    timeZone: 'Etc/GMT',
    weekOfMonth: 1,
  },
  advancedFormState: {},
  expr: '* * * * ? *',
  model: [
    ALL_WILDCARD_SYM,
    ALL_WILDCARD_SYM,
    ALL_WILDCARD_SYM,
    ALL_WILDCARD_SYM,
    ANY_WILDCARD_SYM,
    ALL_WILDCARD_SYM,
  ],
  mode: 'basic',
  dirty: false,
}

function updateModelFromBasic(model, basicFormState) {
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
  } = basicFormState

  model[MINUTES_FIELD] = minute === -1 ? ALL_WILDCARD_SYM : minute
  model[HOURS_FIELD] = hour === -1 ? ALL_WILDCARD_SYM : (amPm === 'am' ? hour : hour + 12)

  switch (frequency) {
    case 'daily':
      if (period === 'day') {
        model[DAYS_OF_MONTH_FIELD] = {
          x: ALL_WILDCARD_SYM,
          y: 1,
          w: INCREMENT_WILDCARD_SYM,
        }
        model[DAYS_OF_WEEK_FIELD] = ANY_WILDCARD_SYM
      } else if (period === 'weekdays') {
        model[DAYS_OF_MONTH_FIELD] = ANY_WILDCARD_SYM
        model[DAYS_OF_WEEK_FIELD] = [2, 3, 4, 5, 6]
      } else if (period === 'weekends') {
        model[DAYS_OF_MONTH_FIELD] = ANY_WILDCARD_SYM
        model[DAYS_OF_WEEK_FIELD] = [1, 7]
      }
      break

    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        model[DAYS_OF_MONTH_FIELD] = ANY_WILDCARD_SYM
        model[DAYS_OF_WEEK_FIELD] = daysOfWeek.map(({ value }) => value)
      } else {
        model[DAYS_OF_MONTH_FIELD] = ANY_WILDCARD_SYM
        model[DAYS_OF_WEEK_FIELD] = ALL_WILDCARD_SYM
      }
      break

    case 'monthly':
      model[DAYS_OF_MONTH_FIELD] = ANY_WILDCARD_SYM
      model[DAYS_OF_WEEK_FIELD] = {
        x: dayOfWeek,
        y: weekOfMonth,
        w: INSTANCE_WILDCARD_SYM,
      }
      break
  }

  return model
}

export function modelToExpression(model) {
  const expr = cron.stringify(
    model[MINUTES_FIELD],
    model[HOURS_FIELD],
    model[DAYS_OF_MONTH_FIELD],
    model[MONTHS_FIELD],
    model[DAYS_OF_WEEK_FIELD],
    model[YEARS_FIELD],
  )

  return expr
}

function reducer(state, action) {
  const {
      type,
      ...rest
    } = action

  switch (action.type) {
    case 'modeChanged':
      return {
        ...state,
        mode: action.mode,
      }

    case 'basicFormStateUpdated':
      var newState = {
        ...state,
        basicFormState: {
          ...state.basicFormState,
          ...rest,
        },
        dirty: true,
      }

      newState.model = updateModelFromBasic(
        newState.model,
        newState.basicFormState,
      )

      return newState

    case 'advancedFormStateUpdated':
      return {
        ...state,
        advancedFormState: {
          ...state.advancedFormState,
          ...rest,
        },
        dirty: true,
      }

    case 'exprChanged':
      return {
        ...state,
        expr: action.expr,
      }
  }
}

function getInitialState(initialState, schedule, settings) {
  const {
      mode,
      formState,
    } = settings,
    initState = {
      ...initialState,
      expr: schedule,
      model: cron.parse(schedule),
      mode: mode || 'basic',
    }

  if (mode === 'basic') {
    initState.basicFormState = formState
  } else if (mode === 'advanced') {
    initState.advancedFormState = formState
  }

  console.log(initState)

  return initState
}

export const ScheduleBuilderContext = createContext(initialState)
export const ScheduleBuilderDispatchContext = createContext(null)

export default function ScheduleBuilderProvider({ schedule, settings, children }) {
  const initState = useMemo(() => (getInitialState(
      initialState,
      schedule,
      settings,
    )), [initialState, schedule, settings]),
    [builderState, dispatch] = useReducer(reducer, initState)

  return (
    <ScheduleBuilderContext.Provider value={builderState}>
      <ScheduleBuilderDispatchContext.Provider value={dispatch}>
        {children}
      </ScheduleBuilderDispatchContext.Provider>
    </ScheduleBuilderContext.Provider>
  )
}
