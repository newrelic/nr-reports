import React, { useCallback, useContext, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Checkbox,
  Form,
  Layout,
  LayoutItem,
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
import { FormContext, Validation, withFormContext } from '../../../contexts/form'
import { nameNotEmpty } from '../../validations'

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
    id: publishConfig.id,
    name: publishConfig.name,
    enabled: typeof publishConfig.enabled !== 'undefined' ? (
      publishConfig.enabled
    ) : true,
    schedule: publishConfig.schedule,
    channels: publishConfig.channels ? clone(publishConfig.channels) : [],
    dirty: false,
    valid: true,
  }
}

function publishConfigFromFormState(formState, selectedConfig) {
  const prevConfigs = formState.parentFormState.publishConfigs,
    publishConfig = {
      id: formState.id,
      name: formState.name,
      enabled: formState.enabled,
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

function EditPublishConfigScreen({ selectedConfig }) {
  const {
      formState,
      updateFormState,
      validateFormState,
    } = useContext(FormContext),
    { navigate } = useContext(RouteDispatchContext),
    navigateToEditReport = useCallback(() => {
      navigate(
        ROUTES.EDIT_REPORT,
        { formState: publishConfigFromFormState(formState, selectedConfig) }
      )
    }, [navigate, formState, selectedConfig]),
    handleChangeName = useCallback(e => {
      updateFormState({ name: e.target.value })
    }, [updateFormState]),
    handleChangeEnabled = useCallback(e => {
      updateFormState({ enabled: e.target.checked })
    }, [updateFormState]),
    handleSubmit = useCallback(() => {
      validateFormState(navigateToEditReport)
    }, [validateFormState, navigateToEditReport]),
    handleCancel = useCallback(() => {
      if (formState.dirty) {
        if (!confirm(UI_CONTENT.EDIT_PUBLISH_CONFIG_SCREEN.CANCEL_PROMPT)) {
          return
        }
      }

      navigate(ROUTES.EDIT_REPORT, {
        formState: formState.parentFormState || formState
      })
    }, [navigate, formState])

  return (
    <div className="edit-publish-config-screen">
      <Layout>
        <LayoutItem>
          <Card>
            <CardHeader title={UI_CONTENT.EDIT_PUBLISH_CONFIG_SCREEN.HEADING} />
            <CardBody>
              <Form
                className="edit-publish-config-form"
                spacingType={[Form.SPACING_TYPE.LARGE]}
              >

                <Stack
                  spacingType={[
                    Stack.SPACING_TYPE.NONE,
                  ]}
                  gapType={Stack.GAP_TYPE.NONE}
                  directionType={Stack.DIRECTION_TYPE.VERTICAL}
                  fullWidth
                >
                  <StackItem>
                    <Validation name="name" validation={nameNotEmpty}>
                      <TextField
                        placeholder={
                          UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.CONFIG_NAME_FIELD_PLACEHOLDER
                        }
                        label={UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.FIELD_LABEL_NAME}
                        value={formState.name}
                        onChange={handleChangeName}
                        invalid={formState.validations?.name}
                      />
                    </Validation>
                  </StackItem>

                  <StackItem>
                    <Checkbox
                      label={UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.FIELD_LABEL_ENABLED}
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
            </CardBody>
          </Card>
        </LayoutItem>
      </Layout>
    </div>
  )
}

export default function EditPublishConfigScreenWrapper(props) {
  const {
      params: {
        formState,
        selectedConfig,
      }
    } = useContext(RouteContext),
    initFormState = useCallback(() => formState.parentFormState ? (
        { ...formState }
      ) : (
        formStateFromPublishConfig(formState, selectedConfig)
      ),
      [formState, selectedConfig]
    )

  return withFormContext(
    <EditPublishConfigScreen
      {...props}
      selectedConfig={selectedConfig}
    />,
    initFormState,
  )
}
