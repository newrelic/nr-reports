import React, { useCallback, useContext, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Button,
  Form,
  HeadingText,
  Stack,
  StackItem,
  TextField,
} from 'nr1'
import ChannelsField from '../../channels-field'
import {
  RouteContext,
  RouteDispatchContext,
} from '../../../contexts'
import {
  ROUTES,
  UI_CONTENT,
} from '../../../constants'
import { newPublishConfig, newPublishConfigMetadata } from '../../../model'
import { clone } from '../../../utils'
import ScheduleField from '../../schedule-field'

function formStateFromPublishConfig(parentFormState, selectedConfig) {
  const publishConfig = (
    selectedConfig >= 0 ? (
      parentFormState.publishConfigs[selectedConfig]
    ) : newPublishConfig()
  )

  return {
    parentFormState: clone(parentFormState),
    metadata: (
      parentFormState.metadata[`publishConfig-${publishConfig.id}`] || (
        newPublishConfigMetadata()
      )
    ),
    ...publishConfig,
  }
}

function publishConfigFromFormState(formState, selectedConfig) {
  const prevConfigs = formState.parentFormState.publishConfigs,
    publishConfig = {
      id: formState.id,
      name: formState.name,
      schedule: formState.schedule,
      channels: formState.channels,
    }
  let publishConfigs

  if (selectedConfig >= 0) {
    publishConfigs = [ ...prevConfigs ]
    publishConfigs[selectedConfig] = publishConfig
  } else {
    publishConfigs = [
      ...prevConfigs,
      publishConfig
    ]
  }

  return {
    ...formState.parentFormState,
    metadata: {
      ...formState.parentFormState.metadata,
      [`publishConfig-${publishConfig.id}`]: formState.metadata,
    },
    publishConfigs,
    dirty: formState.dirty,
  }
}

export default function EditPublishConfigScreen() {
  const {
      params: {
        accountId,
        formState: savedState,
        selectedConfig,
      },
    } = useContext(RouteContext),
    { navigate } = useContext(RouteDispatchContext),
    prevState = useMemo(() => {
      if (savedState.parentFormState) {
        return {
          ...savedState,
        }
      }

      return formStateFromPublishConfig(savedState, selectedConfig)
    }, [savedState, selectedConfig]),
    [formState, setFormState] = useState(prevState),
    updateFormState = useCallback((updates, dirty) => {
      setFormState({
        ...formState,
        ...updates,
        dirty: typeof dirty === 'undefined' ? true : dirty,
      })
    }, [formState, setFormState] ),
    handleSubmit = useCallback(() => {
      navigate(
        ROUTES.EDIT_REPORT,
        { formState: publishConfigFromFormState(formState, selectedConfig) }
      )
    }, [navigate, formState, selectedConfig]),
    handleCancel = useCallback(() => {
      if (formState.dirty) {
        if (!confirm(UI_CONTENT.EDIT_PUBLISH_CONFIGS_SCREEN.CANCEL_PROMPT)) {
          return
        }
      }

      navigate(ROUTES.EDIT_REPORT, {
        formState: savedState.parentFormState || savedState
      })
    }, [navigate, formState, savedState]),
    handleChangeName = useCallback(e => {
      updateFormState({ name: e.target.value })
    }, [updateFormState])

  return (
      <Form
        className="edit-publish-config-form"
        spacingType={[Form.SPACING_TYPE.LARGE]}
      >
        <HeadingText
          type={HeadingText.TYPE.HEADING_2}
          spacingType={[
            HeadingText.SPACING_TYPE.OMIT,
            HeadingText.SPACING_TYPE.OMIT,
            HeadingText.SPACING_TYPE.LARGE,
            HeadingText.SPACING_TYPE.OMIT,
          ]}
        >
          {UI_CONTENT.EDIT_PUBLISH_CONFIGS_FORM.HEADING}
        </HeadingText>

        <Stack
          spacingType={[
            Stack.SPACING_TYPE.NONE,
          ]}
          gapType={Stack.GAP_TYPE.NONE}
          directionType={Stack.DIRECTION_TYPE.VERTICAL}
          fullWidth
        >
          <StackItem>
            <TextField
              placeholder={
                UI_CONTENT.EDIT_PUBLISH_CONFIGS_FORM.CONFIG_NAME_FIELD_PLACEHOLDER
              }
              label={UI_CONTENT.EDIT_PUBLISH_CONFIGS_FORM.FIELD_LABEL_NAME}
              value={formState.name}
              onChange={handleChangeName}
            />
          </StackItem>

          <StackItem>
            <ScheduleField
              formState={formState}
              updateFormState={updateFormState}
            />
          </StackItem>

          <StackItem className="form-wrapper">
            <ChannelsField
              accountId={accountId}
              formState={formState}
              updateFormState={updateFormState}
            />
          </StackItem>

          <StackItem>
            <Stack
              spacingType={[
                Stack.SPACING_TYPE.LARGE,
                Stack.SPACING_TYPE.NONE,
              ]}
            >
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
                  onClick={handleCancel}
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
          </StackItem>

        </Stack>
      </Form>
  )
}
