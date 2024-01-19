import { useCallback, useContext } from 'react'
import PropTypes from 'prop-types'
import {
  Checkbox,
  RadioGroup,
  Radio,
  Select,
  SelectItem,
  Stack,
  StackItem,
  TextField,
} from 'nr1'
import ChannelsField from '../channels-field'
import ScheduleField from '../schedule-field'
import { FormContext, StorageContext, Validation } from '../../contexts'
import { nameNotEmpty } from '../validations'
import { UI_CONTENT } from '../../constants'

export default function PublishConfigForm({
  selectedConfig,
}) {
  const {
      formState,
      updateFormState,
    } = useContext(FormContext),
    { publishConfigs: metaPublishConfigs } = useContext(StorageContext),
    handleChangeName = useCallback(e => {
      updateFormState({ name: e.target.value })
    }, [updateFormState]),
    handleValidateName = useCallback(formState => {
      if (
        selectedConfig >= 0 ||
        formState.mode === UI_CONTENT.EDIT_SCHEDULE_FORM.MODE_VALUE_CREATE_NEW_SCHEDULE
      ) {
        return nameNotEmpty(formState)
      }

      return null
    }, [formState.mode, selectedConfig]),
    handleChangeMode = useCallback((_, v) => {
      if (
        v === UI_CONTENT.EDIT_SCHEDULE_FORM.MODE_VALUE_USE_EXISTING_SCHEDULE
      ) {
        // The || here is to catch the case where useExisting is selected but
        // the formState.ref has not been initialized because the form just
        // loaded.
        updateFormState({
          mode: v,
          ref: formState.ref || metaPublishConfigs.publishConfigs[0].id,
        })
        return
      }
      updateFormState({ mode: v })
    }, [formState.ref, metaPublishConfigs, updateFormState]),
    handleChangeConfigRef = useCallback((_, v) => {
      updateFormState({ ref: v })
    }, [updateFormState]),
    handleChangeEnabled = useCallback(e => {
      updateFormState({ enabled: e.target.checked })
    }, [updateFormState])

  return (
    <Stack
      className='publish-config-form'
      spacingType={[
        Stack.SPACING_TYPE.NONE,
      ]}
      directionType={Stack.DIRECTION_TYPE.VERTICAL}
      fullWidth
      fullHeight
      horizontalType={Stack.HORIZONTAL_TYPE.FILL}
    >
    {
      // The parentFormState !== null check here is to make sure we don't show
      // the mode choices when we are editing a meta publish configuration
      // directly opposed to editing a report publish configuration when editing
      // a report because a meta configuration should not be able to reference
      // another meta configuration. We also don't want to allow changing the
      // mode of an existing report publish configuration which is what the
      // selectedConfig check is for.
      (
        selectedConfig === -1 &&
        formState.parentFormState !== null &&
        metaPublishConfigs?.publishConfigs.length > 0
      ) && (
        <StackItem>
          <RadioGroup
            value={formState.mode}
            defaultValue={
              UI_CONTENT.EDIT_SCHEDULE_FORM.MODE_VALUE_CREATE_NEW_SCHEDULE
            }
            onChange={handleChangeMode}
          >
            <Radio
              label={UI_CONTENT.EDIT_SCHEDULE_FORM.FIELD_LABEL_CREATE_NEW_SCHEDULE}
              value={UI_CONTENT.EDIT_SCHEDULE_FORM.MODE_VALUE_CREATE_NEW_SCHEDULE}
            />
            <Radio
              label={UI_CONTENT.EDIT_SCHEDULE_FORM.FIELD_LABEL_USE_EXISTING_SCHEDULE}
              value={UI_CONTENT.EDIT_SCHEDULE_FORM.MODE_VALUE_USE_EXISTING_SCHEDULE}
            />
          </RadioGroup>
        </StackItem>
      )
    }
    {
      (
        selectedConfig >= 0 ||
        formState.mode === UI_CONTENT.EDIT_SCHEDULE_FORM.MODE_VALUE_CREATE_NEW_SCHEDULE
      ) && (
        <>
          <StackItem>
            <Validation name="name" validation={handleValidateName}>
              <TextField
                placeholder={
                  UI_CONTENT.EDIT_SCHEDULE_FORM.SCHEDULE_NAME_FIELD_PLACEHOLDER
                }
                label={UI_CONTENT.EDIT_SCHEDULE_FORM.FIELD_LABEL_NAME}
                value={formState.name}
                onChange={handleChangeName}
                invalid={formState.validations?.name}
              />
            </Validation>
          </StackItem>

          <StackItem>
            <Checkbox
              label={UI_CONTENT.EDIT_SCHEDULE_FORM.FIELD_LABEL_ENABLED}
              checked={formState.enabled}
              onChange={handleChangeEnabled}
            />
          </StackItem>

          <StackItem>
            <ScheduleField />
          </StackItem>

          <StackItem className="form-wrapper">
            <ChannelsField />
          </StackItem>
        </>
      )
    }
    {
      (
        selectedConfig === -1 &&
        formState.mode === UI_CONTENT.EDIT_SCHEDULE_FORM.MODE_VALUE_USE_EXISTING_SCHEDULE &&
        metaPublishConfigs?.publishConfigs &&
        metaPublishConfigs.publishConfigs.length > 0
      ) && (
        <StackItem>
          <Select
            label={UI_CONTENT.EDIT_SCHEDULE_FORM.FIELD_LABEL_SCHEDULE_REF}
            value={formState.ref}
            onChange={handleChangeConfigRef}
          >
            {
              metaPublishConfigs.publishConfigs.map(
                (item, index) => (
                  <SelectItem
                    key={index}
                    value={item.id}
                  >
                    {item.name}
                  </SelectItem>
                )
              )
            }
          </Select>
        </StackItem>
      )
    }
    </Stack>
  )
}
