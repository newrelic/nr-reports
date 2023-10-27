import { useCallback, useState } from 'react'
import {
  Button,
  TextField,
  Stack,
  StackItem,
} from 'nr1'
import { UI_CONTENT } from '../../constants'

export default function ScheduleField({
  formState,
  updateFormState,
}) {
  const [showModal, setShowModal] = useState(false),
    handleChangeSchedule = useCallback(e => {
      updateFormState({ schedule: e.target.value })
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
          <TextField
            placeholder={
              UI_CONTENT.SCHEDULE_FIELD.SCHEDULE_FIELD_PLACEHOLDER
            }
            label={UI_CONTENT.SCHEDULE_FIELD.FIELD_LABEL_SCHEDULE}
            value={formState.schedule}
            onChange={handleChangeSchedule}
          />
        </StackItem>
      </Stack>
      {
        showModal && (
          <div></div>
        )
      }
    </div>
  )
}
