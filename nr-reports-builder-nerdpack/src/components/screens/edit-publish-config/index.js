import React, { useCallback, useContext, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Form,
  Layout,
  LayoutItem,
  Stack,
  StackItem,
  Toast,
} from 'nr1'
import {
  RouteContext,
  RouteDispatchContext,
  StorageContext,
} from '../../../contexts'
import {
  ROUTES,
  UI_CONTENT,
} from '../../../constants'
import PublishConfigForm from '../../publish-config-form'
import { newPublishConfig, newPublishConfigMetadata } from '../../../model'
import { clone, resolvePublishConfig } from '../../../utils'
import { FormContext, withFormContext } from '../../../contexts/form'
import { useManifestWriter } from '../../../hooks'

function countReferences(manifest, publishConfig) {
  // manifest will be null when creating the first report so no publish
  // configs will exist yet.
  if (!manifest) {
    return 0
  }

  return manifest.reports.reduce((acount, report) => {
    const index = report.publishConfigs?.findIndex(
      pc => pc.ref === publishConfig.id
    )

    return index >= 0 ? acount + 1 : acount
  }, 0)
}

function formStateFromPublishConfig(
  parentFormState,
  publishConfigs,
  manifest,
  metaPublishConfigs,
  selectedConfig,
) {
  // Handle the case where for some reason selectedConfig >= 0 and either
  // publishConfigs is null or selectedConfig >= publishConfigs.length (which
  // shouldn't happen).

  if (
    selectedConfig >= 0 &&
    (!publishConfigs || selectedConfig >= publishConfigs.length)
  ) {
    throw new Error(`Invalid publish config index ${selectedConfig} found`)
  }

  const publishConfig = (
      selectedConfig >= 0 ? (
        resolvePublishConfig(
          metaPublishConfigs,
          publishConfigs[selectedConfig],
        )
      ) : newPublishConfig()
    ),
    references = countReferences(manifest, publishConfig)

  return {
    parentFormState: parentFormState && clone(parentFormState),
    prevConfigs: publishConfigs,
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

function publishConfigFromFormState(formState) {
  const publishConfig = (
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

  return publishConfig
}

function buildParentFormState(formState, selectedConfig) {
  const publishConfig = publishConfigFromFormState(formState)
  let publishConfigs

  if (selectedConfig >= 0) {
    publishConfigs = [ ...formState.prevConfigs ]
    publishConfigs[selectedConfig] = publishConfig
  } else {
    publishConfigs = [
      ...formState.prevConfigs,
      publishConfig
    ]
  }

  return {
    ...formState.parentFormState,
    publishConfigs,
    dirty: formState.dirty,
  }
}

function EditPublishConfigScreen({
  selectedConfig,
  submitActionName,
  onSubmit,
  onCancel,
}) {
  const {
      formState,
      validateFormState,
    } = useContext(FormContext),
    {
      writing,
    } = useContext(StorageContext),
    handleSubmit = useCallback(() => {
      validateFormState(onSubmit)
    }, [validateFormState, onSubmit]),
    handleCancel = useCallback(() => {
      if (formState.dirty) {
        if (!confirm(UI_CONTENT.EDIT_PUBLISH_CONFIG_SCREEN.CANCEL_PROMPT)) {
          return
        }
      }

      onCancel()
    }, [formState, onCancel])

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
                  horizontalType={Stack.HORIZONTAL_TYPE.FILL}
                >
                  <StackItem grow>
                    <PublishConfigForm
                      selectedConfig={selectedConfig}
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
                          loading={writing}
                          spacingType={[
                            Button.SPACING_TYPE.NONE,
                            Button.SPACING_TYPE.SMALL,
                            Button.SPACING_TYPE.NONE,
                            Button.SPACING_TYPE.NONE,
                          ]}
                        >
                          {
                            submitActionName ||
                            UI_CONTENT.GLOBAL.ACTION_LABEL_OK
                          }
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

function StandaloneEditPublishConfigScreen(props) {
  const {
      params: {
        selectedConfig,
      }
    } = useContext(RouteContext),
    {
      formState,
      dangerouslyUpdateFormState,
    } = useContext(FormContext),
    { navigate, home } = useContext(RouteDispatchContext),
    {
      writeError,
      writeFinished,
    } = useContext(StorageContext),
    { updatePublishConfig } = useManifestWriter(),
    writeFormState = useCallback(formState => {
      updatePublishConfig(
        publishConfigFromFormState(formState),
        selectedConfig,
      )
    }, [updatePublishConfig, selectedConfig]),
    handleSubmit = useCallback(formState => {
      writeFormState(formState)
    }, [writeFormState]),
    handleCancel = useCallback(() => {
      home({ tab: 'publishConfigs' })
    }, [navigate])

  useEffect(() => {
    if (writeError) {
      Toast.showToast({
        title: UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.SAVE_ERROR_TITLE,
        description: UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.SAVE_ERROR_DESCRIPTION(writeError.message),
        /*
        @TODO
        actions: [
          {
            label: UI_CONTENT.GLOBAL.ACTION_LABEL_RETRY,
            onClick: handleSave,
          },
        ],
        */
        type: Toast.TYPE.CRITICAL,
      })
    }

    if (writeFinished) {
      Toast.showToast({
        title: UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.SAVE_SUCCESS_TITLE,
        description: UI_CONTENT.EDIT_PUBLISH_CONFIG_FORM.SAVE_SUCCESS_DESCRIPTION(formState.name),
        type: Toast.TYPE.NORMAL,
      })

      dangerouslyUpdateFormState({})

      home({ tab: 'publishConfigs' })
    }
  }, [writeError, writeFinished, formState.name, dangerouslyUpdateFormState, handleSubmit, home])

  return (
    <EditPublishConfigScreen
      {...props}
      selectedConfig={selectedConfig}
      submitActionName={UI_CONTENT.GLOBAL.ACTION_LABEL_SAVE}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}

function ReportEditPublishConfigScreen(props) {
  const {
      params: {
        selectedConfig,
      }
    } = useContext(RouteContext),
    {
      formState,
    } = useContext(FormContext),
    { navigate } = useContext(RouteDispatchContext),
    handleCancel = useCallback(() => {
      navigate(ROUTES.EDIT_REPORT, {
        formState: formState.parentFormState || formState
      })
    }, [navigate, formState]),
    handleSubmit = useCallback(() => {
      navigate(
        ROUTES.EDIT_REPORT,
        { formState: buildParentFormState(formState, selectedConfig) }
      )
    }, [navigate, formState, selectedConfig])

  return (
    <EditPublishConfigScreen
      {...props}
      selectedConfig={selectedConfig}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
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
    } = useContext(StorageContext)

  if (!formState || formState.parentFormState === null) {
    const initFormState = useCallback(() => {
      if (formState) {
        return { ...formState }
      }

      return formStateFromPublishConfig(
        null,
        metaPublishConfigs?.publishConfigs,
        manifest,
        metaPublishConfigs,
        selectedConfig,
      )
    }, [formState, metaPublishConfigs, manifest, selectedConfig])

    return withFormContext(
      <StandaloneEditPublishConfigScreen
        {...props}
      />,
      initFormState,
    )
  }

  const initFormState = useCallback(() => {
    if (formState.parentFormState) {
      return { ...formState }
    }

    return formStateFromPublishConfig(
      formState,
      formState.publishConfigs,
      manifest,
      metaPublishConfigs,
      selectedConfig
    )
  }, [formState, manifest, metaPublishConfigs, selectedConfig])

  return withFormContext(
    <ReportEditPublishConfigScreen
      {...props}
    />,
    initFormState,
  )
}
