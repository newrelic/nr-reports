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
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Stack,
  StackItem,
  TextField,
} from 'nr1'
import ChannelsField from '../../channels-field'
import {
  RouteContext,
  RouteDispatchContext,
  StorageContext,
} from '../../../contexts'
import {
  ROUTES,
  UI_CONTENT,
} from '../../../constants'
import { newPublishConfig, newPublishConfigMetadata } from '../../../model'
import { clone, resolvePublishConfig } from '../../../utils'
import ScheduleField from '../../schedule-field'
import { FormContext, Validation, withFormContext } from '../../../contexts/form'
import { nameNotEmpty } from '../../validations'

function countReferences(manifest, publishConfig) {
  // manifest will be null when creating the first report so no publish
  // configs will exist yet.
  if (!manifest) {
    return 0
  }

  return manifest.reports.reduce((acount, report) => {
    const index = report.publishConfigs.findIndex(
      pc => pc.ref === publishConfig.id
    )

    return index >= 0 ? acount + 1 : acount
  }, 0)
}

function formStateFromPublishConfig(
  parentFormState,
  manifest,
  metaPublishConfigs,
  selectedConfig,
) {
  const publishConfig = (
      selectedConfig >= 0 ? (
        resolvePublishConfig(
          metaPublishConfigs,
          parentFormState.publishConfigs[selectedConfig],
        )
      ) : newPublishConfig()
    ),
    references = countReferences(manifest, publishConfig)

  return {
    parentFormState: clone(parentFormState),
    metadata: (
      publishConfig.metadata || (
        newPublishConfigMetadata()
      )
    ),
    mode: selectedConfig >= 0 ? '' : (
      UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.MODE_VALUE_CREATE_NEW_CONFIG
    ),
    id: publishConfig.id,
    name: publishConfig.name,
    enabled: typeof publishConfig.enabled !== 'undefined' ? (
      publishConfig.enabled
    ) : true,
    schedule: publishConfig.schedule,
    channels: publishConfig.channels ? clone(publishConfig.channels) : [],
    ref: null,
    references,
    dirty: false,
    valid: true,
  }
}

function publishConfigFromFormState(formState, selectedConfig) {
  const prevConfigs = formState.parentFormState.publishConfigs,
    publishConfig = (
      formState.mode === UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.MODE_VALUE_USE_EXISTING_CONFIG ? (
        { ref: formState.ref }
      ) : (
        {
          id: formState.id,
          name: formState.name,
          enabled: formState.enabled,
          schedule: formState.schedule,
          channels: formState.channels,
          metadata: formState.metadata,
        }
      )
    )
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
    { publishConfigs: metaPublishConfigs } = useContext(StorageContext),
    navigateToEditReport = useCallback(() => {
      navigate(
        ROUTES.EDIT_REPORT,
        { formState: publishConfigFromFormState(formState, selectedConfig) }
      )
    }, [navigate, formState, selectedConfig]),
    handleChangeName = useCallback(e => {
      updateFormState({ name: e.target.value })
    }, [updateFormState]),
    handleValidateName = useCallback(formState => {
      if (
        selectedConfig >= 0 ||
        formState.mode === UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.MODE_VALUE_CREATE_NEW_CONFIG
      ) {
        return nameNotEmpty(formState)
      }

      return null
    }, [formState.mode, selectedConfig]),
    handleChangeMode = useCallback((_, v) => {
      if (
        v === UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.MODE_VALUE_USE_EXISTING_CONFIG
      ) {
        // The || here is to catch the case where useExisting is selected but
        // the formState.ref has not been initialized because no selection was
        // previously made.
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
            <CardHeader
              title={UI_CONTENT.EDIT_PUBLISH_CONFIG_SCREEN.HEADING}
              subtitle={formState.references > 1 ? (
                UI_CONTENT.EDIT_PUBLISH_CONFIG_SCREEN.EDIT_SHARED_CONFIG_MESSAGE(formState.references)
              ) : ''}
            />
            <CardBody>
              <Form
                className="edit-publish-config-form"
                spacingType={[Form.SPACING_TYPE.LARGE]}
              >

                <Stack
                  spacingType={[
                    Stack.SPACING_TYPE.NONE,
                  ]}
                  directionType={Stack.DIRECTION_TYPE.VERTICAL}
                  fullWidth
                >
                  {
                    (
                      selectedConfig === -1 &&
                      metaPublishConfigs?.publishConfigs.length > 0
                    ) && (
                      <StackItem>
                        <RadioGroup
                          value={formState.mode}
                          defaultValue={
                            UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.MODE_VALUE_CREATE_NEW_CONFIG
                          }
                          onChange={handleChangeMode}
                        >
                          <Radio
                            label={UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.FIELD_LABEL_CREATE_NEW_CONFIG}
                            value={UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.MODE_VALUE_CREATE_NEW_CONFIG}
                          />
                          <Radio
                            label={UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.FIELD_LABEL_USE_EXISTING_CONFIG}
                            value={UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.MODE_VALUE_USE_EXISTING_CONFIG}
                          />
                        </RadioGroup>
                      </StackItem>
                    )
                  }
                  {
                    (
                      selectedConfig >= 0 ||
                      formState.mode === UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.MODE_VALUE_CREATE_NEW_CONFIG
                    ) && (
                      <>
                        <StackItem>
                          <Validation name="name" validation={handleValidateName}>
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
                      </>
                    )
                  }
                  {
                    (
                      selectedConfig === -1 &&
                      formState.mode === UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.MODE_VALUE_USE_EXISTING_CONFIG &&
                      metaPublishConfigs?.publishConfigs
                    ) && (
                      <>
                        <StackItem>
                          <Select
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
                      </>
                    )
                  }


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
    {
      manifest,
      publishConfigs: metaPublishConfigs,
    } = useContext(StorageContext),
    initFormState = useCallback(() => formState.parentFormState ? (
        { ...formState }
      ) : (
        formStateFromPublishConfig(
          formState,
          manifest,
          metaPublishConfigs,
          selectedConfig
        )
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
