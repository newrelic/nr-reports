import { useCallback, useContext, useMemo, useState } from 'react'
import {
  Button,
} from 'nr1'
import CustomField from '../custom-field'
import ScheduleBuilder from '../schedule-builder'
import { UI_CONTENT } from '../../constants'
import { generateFullScheduleDetails } from '../../utils'
import { FormContext } from '../../contexts/form'

export default function ScheduleField() {
  const { formState, updateFormState } = useContext(FormContext),
    [showModal, setShowModal] = useState(false),
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
    }, [setShowModal]),
    scheduleDetails = useMemo(() => {
      return generateFullScheduleDetails(schedule, settings)
    }, [schedule, settings])

  return (
    <div className="schedule-field">
      <CustomField
        label={UI_CONTENT.SCHEDULE_FIELD.FIELD_LABEL_SCHEDULE_CUSTOM}
      >
        <div className="schedule-details">
          {scheduleDetails}
        </div>
      </CustomField>

      <Button
        onClick={handleShowModal}
        type={Button.TYPE.TERTIARY}
        sizeType={Button.SIZE_TYPE.SMALL}
        spacingType={[
          Button.SPACING_TYPE.MEDIUM,
          Button.SPACING_TYPE.SMALL,
          Button.SPACING_TYPE.LARGE,
          Button.SPACING_TYPE.NONE,
        ]}
      >
        {UI_CONTENT.SCHEDULE_FIELD.BUTTON_LABEL_EDIT_SCHEDULE}
      </Button>

      {
        showModal && (
          <ScheduleBuilder
            schedule={schedule}
            settings={settings}
            open={showModal}
            onClose={handleHideModal}
            onSubmit={handleChangeSchedule}
          />
        )
      }
    </div>
  )
}
