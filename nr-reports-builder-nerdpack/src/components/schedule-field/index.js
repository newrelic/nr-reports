import { useCallback, useMemo, useState } from 'react'
import {
  Button,
} from 'nr1'
import CustomField from '../custom-field'
import ScheduleBuilder from '../schedule-builder'
import ScheduleBuilderProvider from '../schedule-builder/context'
import { UI_CONTENT } from '../../constants'
import { generateFullScheduleDetails } from '../../utils'

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
    }, [setShowModal]),
    ScheduleDetails = useMemo(() => {
      return generateFullScheduleDetails(schedule, settings)
    }, [schedule, settings])
  return (
    <div className="schedule-field">
      <CustomField
        label={UI_CONTENT.SCHEDULE_FIELD.FIELD_LABEL_SCHEDULE_CUSTOM}
      >
        <div className="schedule-details">
          {ScheduleDetails}
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
