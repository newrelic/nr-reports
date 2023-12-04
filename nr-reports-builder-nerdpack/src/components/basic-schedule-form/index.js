import { useCallback, useContext } from 'react'
import {
  Form,
  Icon,
  Select,
  SelectItem,
  Stack,
  StackItem,
} from 'nr1'
import { useTimezoneSelect, allTimezones } from 'react-timezone-select'
import CustomField from '../custom-field'
import MultiSelect2 from '../multi-select-2'
import { pad } from '../../utils'
import { UI_CONTENT } from '../../constants'
import { FormContext } from '../../contexts/form'
import {
  ALL_WILDCARD_SYM,
  ANY_WILDCARD_SYM,
  DAYS_OF_MONTH_FIELD,
  DAYS_OF_WEEK_FIELD,
  HOURS_FIELD,
  INCREMENT_WILDCARD_SYM,
  INSTANCE_WILDCARD_SYM,
  MINUTES_FIELD,
} from '../../cron'

const HOURS = [-1],
  MINUTES = [-1],
  DAYS_OF_WEEK = [
    { value: 1, label: UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_SUNDAY },
    { value: 2, label: UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_MONDAY },
    { value: 3, label: UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_TUESDAY },
    { value: 4, label: UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_WEDNESDAY },
    { value: 5, label: UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_THURSDAY },
    { value: 6, label: UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_FRIDAY },
    { value: 7, label: UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_SATURDAY },
  ],
  WEEKS_OF_MONTH = [
    { value: 1, label: UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_WEEK_ONE },
    { value: 2, label: UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_WEEK_TWO },
    { value: 3, label: UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_WEEK_THREE },
    { value: 4, label: UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_WEEK_FOUR },
  ],
  TIMEZONES = { ...allTimezones }

for (let i = 1; i <= 12; i += 1) { HOURS.push(i) }
for (let i = 0; i < 59; i += 1) { if (i % 5 === 0) { MINUTES.push(i) } }

function updateModelFromBasic(formState) {
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
    model,
  } = formState

  model[MINUTES_FIELD] = minute === -1 ? ALL_WILDCARD_SYM : minute
  model[HOURS_FIELD] = hour === -1 ? ALL_WILDCARD_SYM : (
    amPm === 'am' ? hour % 12 : 12 + (hour % 12)
  )

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

export default function BasicScheduleForm() {
  const {
      formState,
      updateFormState,
    } = useContext(FormContext),
    {
      amPm,
      dayOfWeek,
      daysOfWeek,
      frequency,
      hour,
      minute,
      period,
      //timeZone,
      weekOfMonth,
    } = formState,
    //{ options, parseTimezone } = useTimezoneSelect({ labelStyle: 'original', timezones: TIMEZONES }),
    updateModel = useCallback(newFormState => {
      newFormState.model = updateModelFromBasic(newFormState)
    }, []),
    update = useCallback(updates => {
      updateFormState(updates, updateModel)
    }, [updateFormState, updateModel]),
    handleChangeFrequency = useCallback((_, v) => {
      update({
        frequency: v,
        period: v === 'daily' ? 'day' : (v === 'weekly' ? 1 : 1)
      })
    }, [update]),
    handleChangePeriod = useCallback((_, v) => {
      update({ period: v })
    }, [update]),
    handleChangeDaysOfWeek = useCallback(items => {
      update({ daysOfWeek: items })
    }, [update]),
    handleChangeDayOfWeek = useCallback((_, v) => {
      update({ dayOfWeek: v })
    }, [update]),
    handleChangeHour = useCallback((_, v) => {
      update({ hour: v })
    }, [update]),
    handleChangeMinute = useCallback((_, v) => {
      update({ minute: v })
    }, [update]),
    handleChangeAmPm = useCallback((_, v) => {
      update({ amPm: v })
    }, [update]),
    /*
    handleChangeTimezone = useCallback((_, v) => {
      dispatch({
        type: 'basicFormStateUpdated',
        timeZone: v,
      })
    }, [dispatch]),
    */
    handleChangeWeekOfMonth = useCallback((_, v) => {
      update({ weekOfMonth: v })
    }, [update]),
    dayOfWeekMenuLabeler = useCallback((item, index, items) => (
      `${items.length} day${items.length > 1 ? 's' : ''}`
    ), [])

  return (
    <Form
      className="basic-schedule-form"
      spacingType={[Form.SPACING_TYPE.LARGE]}
    >
      <Select
        label={UI_CONTENT.BASIC_SCHEDULE_FORM.FIELD_LABEL_FREQUENCY}
        onChange={handleChangeFrequency}
        value={frequency}
      >
        <SelectItem value={UI_CONTENT.BASIC_SCHEDULE_FORM.FREQUENCY_VALUE_DAILY}>
          {UI_CONTENT.BASIC_SCHEDULE_FORM.FREQUENCY_LABEL_DAILY}
        </SelectItem>
        <SelectItem value={UI_CONTENT.BASIC_SCHEDULE_FORM.FREQUENCY_VALUE_WEEKLY}>
          {UI_CONTENT.BASIC_SCHEDULE_FORM.FREQUENCY_LABEL_WEEKLY}
        </SelectItem>
        <SelectItem value={UI_CONTENT.BASIC_SCHEDULE_FORM.FREQUENCY_VALUE_MONTHLY}>
          {UI_CONTENT.BASIC_SCHEDULE_FORM.FREQUENCY_LABEL_MONTHLY}
        </SelectItem>
      </Select>

      {
        frequency === 'daily' && (
          <Select
            label={UI_CONTENT.BASIC_SCHEDULE_FORM.FIELD_LABEL_PERIOD}
            onChange={handleChangePeriod}
            value={period}
          >
            <SelectItem value={UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_VALUE_EVERYDAY}>
              {UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_DAY}
            </SelectItem>
            <SelectItem value={UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_VALUE_WEEKDAYS}>
              {UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_WEEKDAYS}
            </SelectItem>
            <SelectItem value={UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_VALUE_WEEKENDS}>
              {UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_WEEKENDS}
            </SelectItem>
          </Select>
        )
      }

      {
        frequency === 'weekly' && (
          <CustomField
            label={UI_CONTENT.BASIC_SCHEDULE_FORM.FIELD_LABEL_PERIOD}
          >
            <MultiSelect2
              showChips={false}
              items={DAYS_OF_WEEK}
              value={daysOfWeek}
              icon={Icon.TYPE.INTERFACE__CHEVRON__CHEVRON_BOTTOM}
              placeholderText={UI_CONTENT.BASIC_SCHEDULE_FORM.DAYS_OF_WEEK_FIELD_PLACEHOLDER}
              onChange={handleChangeDaysOfWeek}
              labeler={dayOfWeekMenuLabeler}
            />
          </CustomField>
        )
      }

      {
        frequency === 'monthly' && (
          <Stack
            verticalType={Stack.VERTICAL_TYPE.CENTER}
            horizontalType={Stack.HORIZONTAL_TYPE.CENTER}
            directionType={Stack.DIRECTION_TYPE.HORIZONTAL}
            spacingType={[Stack.SPACING_TYPE.OMIT, Stack.SPACING_TYPE.NONE]}
          >
            <StackItem>
              <Select
                label={UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_DAY_OF_WEEK}
                onChange={handleChangeDayOfWeek}
                value={dayOfWeek}
              >
                {
                  DAYS_OF_WEEK.map(item => (
                    <SelectItem value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))
                }
              </Select>
            </StackItem>
            <StackItem>
              <Select
                label={UI_CONTENT.BASIC_SCHEDULE_FORM.PERIOD_LABEL_WEEK_OF_MONTH}
                onChange={handleChangeWeekOfMonth}
                value={weekOfMonth}
              >
                {
                  WEEKS_OF_MONTH.map(item => (
                    <SelectItem value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))
                }
              </Select>
            </StackItem>
          </Stack>
        )
      }

      <CustomField
        label={UI_CONTENT.BASIC_SCHEDULE_FORM.FIELD_LABEL_TIME_OF_DAY}
      >
        <div className='time-select'>
          <Select
            label=''
            onChange={handleChangeHour}
            value={hour}
          >
            {
              HOURS.map(hour => (
                <SelectItem key={hour} value={hour}>{hour === -1 ? 'Every hour' : pad(hour, 2)}</SelectItem>
              ))
            }
          </Select>
          <div className='colon'>:</div>
          <Select
            label=''
            onChange={handleChangeMinute}
            value={minute}
          >
            {
              MINUTES.map(minute => (
                <SelectItem key={minute} value={minute}>{minute === -1 ? 'Every minute' : pad(minute, 2)}</SelectItem>
              ))
            }
          </Select>
          <Select
            disabled={hour === -1}
            label=''
            onChange={handleChangeAmPm}
            value={amPm}
          >
            <SelectItem value='am'>AM</SelectItem>
            <SelectItem value='pm'>PM</SelectItem>
          </Select>
          {/*
          <Select
            label=''
            onChange={handleChangeTimezone}
            value={timeZone}
          >
            {
              options.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))
            }
          </Select>
          */}
        </div>
      </CustomField>
    </Form>
  )
}
