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
import {
  ScheduleBuilderContext,
  ScheduleBuilderDispatchContext,
} from '../schedule-builder/context'
import { pad } from '../../utils'
import { UI_CONTENT } from '../../constants'

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

for (let i = 0; i <= 11; i += 1) { HOURS.push(i) }
for (let i = 0; i < 59; i += 1) { if (i % 5 === 0) { MINUTES.push(i) } }

export default function BasicScheduleForm() {
  const { basicFormState } = useContext(ScheduleBuilderContext),
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
    } = basicFormState,
    dispatch = useContext(ScheduleBuilderDispatchContext),
    //{ options, parseTimezone } = useTimezoneSelect({ labelStyle: 'original', timezones: TIMEZONES }),
    handleChangeFrequency = useCallback((_, v) => {
      dispatch({
        type: 'basicFormStateUpdated',
        frequency: v,
        period: v === 'daily' ? 'day' : (v === 'weekly' ? 1 : 1)
      })
    }, [dispatch]),
    handleChangePeriod = useCallback((_, v) => {
      dispatch({
        type: 'basicFormStateUpdated',
        period: v,
      })
    }, [dispatch]),
    handleChangeDaysOfWeek = useCallback(items => {
      dispatch({
        type: 'basicFormStateUpdated',
        daysOfWeek: items,
      })
    }, [dispatch]),
    handleChangeDayOfWeek = useCallback((_, v) => {
      dispatch({
        type: 'basicFormStateUpdated',
        dayOfWeek: v,
      })
    }, [dispatch]),
    handleChangeHour = useCallback((_, v) => {
      dispatch({
        type: 'basicFormStateUpdated',
        hour: v,
      })
    }, [dispatch]),
    handleChangeMinute = useCallback((_, v) => {
      dispatch({
        type: 'basicFormStateUpdated',
        minute: v,
      })
    }, [dispatch]),
    handleChangeAmPm = useCallback((_, v) => {
      dispatch({
        type: 'basicFormStateUpdated',
        amPm: v,
      })
    }, [dispatch]),
    /*
    handleChangeTimezone = useCallback((_, v) => {
      dispatch({
        type: 'basicFormStateUpdated',
        timeZone: v,
      })
    }, [dispatch]),
    */
    handleChangeWeekOfMonth = useCallback((_, v) => {
      dispatch({
        type: 'basicFormStateUpdated',
        weekOfMonth: v,
      })
    }, [dispatch])

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
