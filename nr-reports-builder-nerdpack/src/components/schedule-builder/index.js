import { useCallback, useContext, useState } from 'react'
import {
  Button,
  Form,
  HeadingText,
  Modal,
  SegmentedControl,
  SegmentedControlItem,
  Stack,
  StackItem,
  TextField,
} from 'nr1'
import BasicScheduleForm from '../basic-schedule-form'
import { UI_CONTENT } from '../../constants'
import { FormContext, Validation, withFormContext } from '../../contexts/form'
import cron, {
  ALL_WILDCARD_SYM,
  ANY_WILDCARD_SYM,
  DAYS_OF_MONTH_FIELD,
  DAYS_OF_WEEK_FIELD,
  HOURS_FIELD,
  MINUTES_FIELD,
  MONTHS_FIELD,
  YEARS_FIELD,
  parse,
} from '../../cron'
import { cronExprIsValid } from '../validations'

function modelToExpression(model) {
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

function ScheduleBuilder({
  open,
  onSubmit,
  onClose,
}) {
  const {
      formState,
      updateFormState,
      validateFormState,
    } = useContext(FormContext),
    {
      mode,
      expr,
      validations,
    } = formState,
    submit = useCallback(formState => {
      const {
        mode,
        expr,
        model,
        ...rest
      } = formState

      onSubmit({
        schedule: mode === 'manual' ? expr : modelToExpression(model),
        settings: { mode, ...rest },
      })
    }, [onSubmit]),
    handleChangeMode = useCallback((_, v) => {
      updateFormState({ mode: v })
    }, [updateFormState]),
    handleChangeExpr = useCallback(e => {
      updateFormState({ expr: e.target.value })
    }, [updateFormState]),
    handleClose = useCallback(() => {
      onClose()
    }, [onClose]),
    handleSubmit = useCallback(() => {
      validateFormState(submit)
    }, [validateFormState, submit])

  return (
    <Modal hidden={!open} onClose={handleClose}>
      <Form className="schedule-builder">
        <HeadingText type={HeadingText.TYPE.HEADING_3}>
          Edit schedule
        </HeadingText>

        <Stack
          directionType={Stack.DIRECTION_TYPE.VERTICAL}
          horizontalType={Stack.HORIZONTAL_TYPE.FILL}
          spacingType={[
            Stack.SPACING_TYPE.LARGE,
            Stack.SPACING_TYPE.NONE,
          ]}
          fullWidth
          fullHeight
        >
          <StackItem>
            <SegmentedControl
              value={mode}
              onChange={handleChangeMode}
            >
              <SegmentedControlItem
                hint="Create a basic schedule"
                value="basic"
                label="Basic"
              />
              {/*
              <SegmentedControlItem
                hint="Create a schedule using advanced scheduling options"
                value="advanced"
                label="Advanced"
              />
              */}
              <SegmentedControlItem
                hint="Manually enter a CRON expression"
                value="manual"
                label="Manual"
              />
            </SegmentedControl>
          </StackItem>
          <StackItem>
            { mode === 'basic' && (
              <BasicScheduleForm />
            )}
            { mode === 'manual' && (
              <Validation
                name="expr"
                validation={cronExprIsValid}
              >
                <TextField
                  placeholder={
                    UI_CONTENT.SCHEDULE_FIELD.SCHEDULE_FIELD_PLACEHOLDER
                  }
                  label={UI_CONTENT.SCHEDULE_FIELD.FIELD_LABEL_SCHEDULE}
                  value={expr}
                  onChange={handleChangeExpr}
                  invalid={validations?.expr}
                />
              </Validation>
            )}
          </StackItem>

          <StackItem>
            <Button
              onClick={handleSubmit}
              type={Button.TYPE.PRIMARY}
              spacingType={[
                Button.SPACING_TYPE.NONE,
                Button.SPACING_TYPE.SMALL,
                Button.SPACING_TYPE.NONE,
                Button.SPACING_TYPE.NONE,
              ]}
            >
              {UI_CONTENT.GLOBAL.ACTION_LABEL_OK}
            </Button>
            <Button
                onClick={handleClose}
                type={Button.TYPE.PLAIN}
                spacingType={[
                  Button.SPACING_TYPE.NONE,
                  Button.SPACING_TYPE.SMALL,
                  Button.SPACING_TYPE.NONE,
                  Button.SPACING_TYPE.NONE,
                ]}
              >
              {UI_CONTENT.GLOBAL.ACTION_LABEL_CANCEL}
            </Button>
          </StackItem>
        </Stack>
      </Form>
    </Modal>
  )
}

export default function ScheduleBuilderWrapper({
  schedule,
  settings,
  ...rest
}) {
  const initFormState = useCallback(() => {
    const initialState = {
        amPm: 'am',
        dayOfWeek: 1,
        daysOfWeek: [],
        frequency: 'daily',
        hour: -1,
        minute:  -1,
        period: 'day',
        timeZone: null,
        timeZoneValue: 'Etc/GMT',
        weekOfMonth: 1,
        expr: '* * * * ? *',
        model: [
          ALL_WILDCARD_SYM,
          ALL_WILDCARD_SYM,
          ALL_WILDCARD_SYM,
          ALL_WILDCARD_SYM,
          ANY_WILDCARD_SYM,
          ALL_WILDCARD_SYM,
        ],
        mode: settings?.mode || 'basic',
        ...settings,
        dirty: false,
        valid: true,
      }

    if (schedule) {
      initialState.expr = schedule,
      initialState.model = parse(schedule)
    }

    return initialState
  }, [schedule, settings])


  return withFormContext(
    <ScheduleBuilder
      schedule={schedule}
      settings={settings}
      {...rest}
    />,
    initFormState,
  )
}
