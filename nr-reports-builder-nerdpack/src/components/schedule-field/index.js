import { useCallback, useState } from 'react'
import {
  Button,
  Stack,
  StackItem,
} from 'nr1'
import ScheduleBuilder from '../schedule-builder'
import ScheduleBuilderProvider from '../schedule-builder/context'
import { UI_CONTENT } from '../../constants'

export default function ScheduleField({
  formState,
  updateFormState,
}) {
  const [showModal, setShowModal] = useState(false),
    {
      schedule,
      metadata,
    } = formState,
    settings = metadata['schedule-builder'] || {},
    handleChangeSchedule = useCallback(({ schedule, settings }) => {
      updateFormState({
        schedule,
        metadata: {
          ...metadata,
          ['schedule-builder']: settings,
        }
      })
      setShowModal(false)
    }, [updateFormState]),
    handleShowModal = useCallback(() => {
      setShowModal(true)
    }, [setShowModal]),
    handleHideModal = useCallback(() => {
      setShowModal(false)
    }, [setShowModal])

  return (
    <div className="schedule-field">
      <Stack
        spacingType={[
          Stack.SPACING_TYPE.NONE,
        ]}
        directionType={Stack.DIRECTION_TYPE.VERTICAL}
        fullWidth
      >
        <StackItem>
          <h3>{settings.stuff || 'No schedule'}</h3>
        </StackItem>
        <StackItem>
          <Button
            onClick={handleShowModal}
            type={Button.TYPE.TERTIARY}
            sizeType={Button.SIZE_TYPE.SMALL}
            spacingType={[
              Button.SPACING_TYPE.SMALL,
              Button.SPACING_TYPE.SMALL,
              Button.SPACING_TYPE.EXTRA_LARGE,
              Button.SPACING_TYPE.NONE,
            ]}
          >
            {UI_CONTENT.SCHEDULE_FIELD.BUTTON_LABEL_EDIT_SCHEDULE}
          </Button>
        </StackItem>
      </Stack>
      {
        showModal && (
          <ScheduleBuilderProvider
            schedule={schedule}
            settings={settings}
          >
            <ScheduleBuilder
              open={showModal}
              onClose={handleHideModal}
              onSubmit={handleChangeSchedule}
            />
          </ScheduleBuilderProvider>
        )
      }
    </div>
  )
}
