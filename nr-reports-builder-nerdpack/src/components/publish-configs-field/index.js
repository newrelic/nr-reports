import React, { useCallback, useContext } from 'react'
import PropTypes from 'prop-types'
import {
  BlockText,
  Button,
  Stack,
  StackItem,
} from 'nr1'
import CustomField from '../custom-field'
import PublishConfigsTable from '../publish-configs-table'
import {
  ROUTES,
  UI_CONTENT,
} from '../../constants'
import { RouteDispatchContext } from '../../contexts'
import { FormContext } from '../../contexts/form'

export default function PublishConfigurationsField() {
  const { formState, updateFormState } = useContext(FormContext),
    { navigate } = useContext(RouteDispatchContext),
    handleAddConfig = useCallback(() => {
      navigate(ROUTES.EDIT_SCHEDULE, { formState, selectedConfig: -1 })
    }, [navigate, formState]),
    handleEditConfig = useCallback(selectedConfig => {
      navigate(ROUTES.EDIT_SCHEDULE, {
        formState,
        selectedConfig,
      })
    }, [navigate, formState]),
    handleDeleteConfig = useCallback(selectedConfig => {
      if (!confirm(UI_CONTENT.SCHEDULES_FIELD.DELETE_PROMPT)) {
        return
      }

      const newConfigs = [ ...formState.publishConfigs ]

      newConfigs.splice(selectedConfig, 1)

      updateFormState({ publishConfigs: newConfigs })
    }, [formState, updateFormState])

  return (
    <div className="publish-configs-field">
      <CustomField
        label={UI_CONTENT.SCHEDULES_FIELD.FIELD_LABEL_SCHEDULES_CUSTOM}
      >
        <Stack
          directionType={Stack.DIRECTION_TYPE.HORIZONTAL}
          className="channel-list"
          fullWidth
        >
          <StackItem grow>
          {
            formState.publishConfigs && (
              formState.publishConfigs.length > 0
            ) ? (
              <PublishConfigsTable
                publishConfigs={formState.publishConfigs}
                onEditConfig={handleEditConfig}
                onDeleteConfig={handleDeleteConfig}
              />
            ) : (
              <BlockText>
                {UI_CONTENT.SCHEDULES_FIELD.NO_SCHEDULES_MESSAGE}
              </BlockText>
            )
          }
          </StackItem>
        </Stack>
      </CustomField>

      <Button
        onClick={handleAddConfig}
        type={Button.TYPE.TERTIARY}
        sizeType={Button.SIZE_TYPE.SMALL}
        spacingType={[
          Button.SPACING_TYPE.MEDIUM,
          Button.SPACING_TYPE.SMALL,
          Button.SPACING_TYPE.LARGE,
          Button.SPACING_TYPE.NONE,
        ]}
      >
        {UI_CONTENT.SCHEDULES_FIELD.BUTTON_LABEL_ADD_SCHEDULE}
      </Button>
    </div>
  )
}
