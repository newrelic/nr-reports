import { useCallback, useContext, useState } from 'react'
import {
  Button,
  HeadingText,
  Modal,
  SegmentedControl,
  SegmentedControlItem,
  Stack,
  StackItem,
  TextField,
} from 'nr1'
import BasicScheduleForm from '../basic-schedule-form'
import {
  modelToExpression,
  ScheduleBuilderContext,
  ScheduleBuilderDispatchContext,
} from './context'
import { UI_CONTENT } from '../../constants'

export default function ScheduleBuilder({
  open,
  onSubmit,
  onClose,
}) {
  const {
      mode,
      expr,
      model,
      basicFormState,
      advancedFormState
    } = useContext(ScheduleBuilderContext),
    dispatch = useContext(ScheduleBuilderDispatchContext),
    handleChangeMode = useCallback((_, v) => {
      dispatch({
        type: 'modeChanged',
        mode: v,
      })
    }, [dispatch]),
    handleChangeExpr = useCallback(e => {
      dispatch({
        type: 'exprChanged',
        expr: e.target.value,
      })
    }, [dispatch]),
    handleClose = useCallback(() => {
      onClose()
    }, [onClose]),
    handleSubmit = useCallback(() => {
      onSubmit({
        schedule: mode === 'manual' ? expr : modelToExpression(model),
        settings: {
          mode,
          formState: (
            (mode === 'basic' && basicFormState) ||
            (mode === 'advanced' && advancedFormState) ||
            null
          ),
        }
      })
    }, [mode, expr, model, basicFormState, advancedFormState, onSubmit])

  return (
    <Modal hidden={!open} onClose={handleClose}>
      <div className="schedule-builder">
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
              <BasicScheduleForm
              />
            )}
            { mode === 'manual' && (
              <TextField
                placeholder={
                  UI_CONTENT.SCHEDULE_FIELD.SCHEDULE_FIELD_PLACEHOLDER
                }
                label={UI_CONTENT.SCHEDULE_FIELD.FIELD_LABEL_SCHEDULE}
                value={expr}
                onChange={handleChangeExpr}
              />
            )}
          </StackItem>

          <StackItem>
            <Button
              onClick={() => handleSubmit(expr)}
              type={Button.TYPE.PRIMARY}
              spacingType={[
                Button.SPACING_TYPE.NONE,
                Button.SPACING_TYPE.SMALL,
                Button.SPACING_TYPE.NONE,
                Button.SPACING_TYPE.NONE,
              ]}
            >
              OK
            </Button>
          </StackItem>
        </Stack>
      </div>
    </Modal>
  )
}
