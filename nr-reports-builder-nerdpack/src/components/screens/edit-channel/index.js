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
  SYMBOLS,
  UI_CONTENT,
} from '../../../constants'
import { clone, resolveChannel, resolvePublishConfig } from '../../../utils'
import { FormContext, withFormContext } from '../../../contexts/form'
import { newChannel, newChannelMetadata } from '../../../model'
import { useManifestWriter } from '../../../hooks'
import ChannelForm from '../../channel-form'

function countReferences(manifest, metaPublishConfigs, channel) {
  // manifest will be null when creating the first report so no channels
  // will exist yet.
  if (!manifest) {
    return 0
  }

  return manifest.reports.reduce((acount, report) => {
    for (let index = 0; index < report.publishConfigs.length; index += 1) {
      const publishConfig = resolvePublishConfig(
        metaPublishConfigs,
        report.publishConfigs[index],
      )

      if (publishConfig) {
        const cindex = publishConfig.channels?.findIndex(
          c => c.ref === channel.id
        )

        if (cindex >= 0) {
          return acount + 1
        }
      }
    }

    return acount
  }, 0)
}

function formStateFromChannel(
  parentFormState,
  channels,
  manifest,
  metaPublishConfigs,
  metaChannels,
  selectedChannel,
) {
  // Handle the case where for some reason selectedChannel >= 0 and either
  // channels is null or selectedConfig >= channels.length (which shouldn't
  // happen).

  if (
    selectedChannel >= 0 &&
    (!channels || selectedChannel >= channels.length)
  ) {
    throw new Error(`Invalid channel index ${selectedChannel} found`)
  }

  const channel = (
      selectedChannel >= 0 ? (
        resolveChannel(
          metaChannels,
          channels[selectedChannel],
        )
      ) : newChannel()
    ),
    references = countReferences(manifest, metaPublishConfigs, channel),
    formState = {
      parentFormState: parentFormState && clone(parentFormState),
      prevChannels: channels,
      metadata: channel.metadata || newChannelMetadata(),
      mode: selectedChannel >= 0 ? '' : (
        UI_CONTENT.EDIT_CHANNEL_FORM.MODE_VALUE_CREATE_NEW_CHANNEL
      ),
      id: channel.id,
      name: channel.name,
      ref: null,
      references,
      dirty: false,
      valid: true,
    }

  if (channel.type === SYMBOLS.CHANNEL_TYPES.EMAIL) {
    formState.type = SYMBOLS.CHANNEL_TYPES.EMAIL
    formState.emailFormat = channel.format || SYMBOLS.EMAIL_FORMATS.HTML
    formState.emailDeliveryMethod = channel.attachOutput ? (
      SYMBOLS.EMAIL_CHANNEL_FIELDS.ATTACH_OUTPUT
    ) : (
      channel.passThrough ? (
        SYMBOLS.EMAIL_CHANNEL_FIELDS.PASS_THROUGH
      ) : (
        SYMBOLS.EMAIL_CHANNEL_FIELDS.ATTACH_OUTPUT
      )
    )
    formState.emailSubject = channel.subject
    formState.emailTo = channel.to ? channel.to.replaceAll(/\s*,\s*/ug,"\n") : ''
    formState.emailCc = channel.cc ? channel.cc.replaceAll(/\s*,\s*/ug,',') : ''
    formState.emailTemplate = channel.emailTemplate || ''
  } else if (channel.type === SYMBOLS.CHANNEL_TYPES.SLACK) {
    formState.type = SYMBOLS.CHANNEL_TYPES.SLACK
    // @TODO
    // formState.slackWebhookUrl = channel.webhookUrl
  }

  return formState
}

function channelFromFormState(formState) {
  if (formState.mode === UI_CONTENT.EDIT_CHANNEL_FORM.MODE_VALUE_USE_EXISTING_CHANNEL) {
    return { ref: formState.ref }
  }

  const channel = {
    id: formState.id,
    name: formState.name,
    metadata: formState.metadata,
  }

  if (formState.type === SYMBOLS.CHANNEL_TYPES.EMAIL) {
    channel.type = SYMBOLS.CHANNEL_TYPES.EMAIL,
    channel.format = formState.emailFormat,
    channel.attachOutput = (
      formState.emailDeliveryMethod === SYMBOLS.EMAIL_CHANNEL_FIELDS.ATTACH_OUTPUT
    ),
    channel.passThrough = (
      formState.emailDeliveryMethod === SYMBOLS.EMAIL_CHANNEL_FIELDS.PASS_THROUGH
    ),
    channel.subject = formState.emailSubject
    channel.to = formState.emailTo ? formState.emailTo.replaceAll(/\s*\n+\s*/ug,',') : ''
    channel.cc = formState.emailCc ? formState.emailCc.replaceAll(/\s*\n+\s*/ug,',') : ''
    channel.emailTemplate = formState.emailTemplate || ''
  } else if (formState.type === SYMBOLS.CHANNEL_TYPES.SLACK) {
    channel.type = SYMBOLS.CHANNEL_TYPES.SLACK
    // @TODO
    // channel.webhookUrl = formState.slackWebhookUrl
  }

  return channel
}

function buildParentFormState(formState, selectedChannel) {
  const channel = channelFromFormState(formState)
  let channels

  if (selectedChannel >= 0) {
    channels = [ ...formState.prevChannels ]
    channels[selectedChannel] = channel
  } else {
    channels = [
      ...formState.prevChannels,
      channel,
    ]
  }

  return {
    ...formState.parentFormState,
    channels,
    dirty: formState.dirty,
  }
}

function EditChannelScreen({
  selectedChannel,
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
    }),
    handleCancel = useCallback(() => {
      if (formState.dirty) {
        if (!confirm(UI_CONTENT.EDIT_CHANNEL_SCREEN.CANCEL_PROMPT)) {
          return
        }
      }

      onCancel()
    }, [formState])

  return (
    <div className="edit-channel-screen">
      <Layout>
        <LayoutItem>
          <Card>
            <CardHeader
              title={UI_CONTENT.EDIT_CHANNEL_SCREEN.HEADING}
              subtitle={formState.references > 1 ? (
                UI_CONTENT.EDIT_CHANNEL_SCREEN.EDIT_SHARED_CHANNEL_MESSAGE(formState.references)
              ) : ''}
            />
            <CardBody>
              <Form
                className="edit-channel-form"
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
                    <ChannelForm
                      selectedChannel={selectedChannel}
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

function StandaloneEditChannelScreen(props) {
  const {
      params: {
        selectedChannel,
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
    { updateChannel } = useManifestWriter(),
    writeFormState = useCallback(formState => {
      updateChannel(
        channelFromFormState(formState),
        selectedChannel,
      )
    }, [updateChannel, selectedChannel]),
    handleSubmit = useCallback(formState => {
      writeFormState(formState)
    }, [writeFormState]),
    handleCancel = useCallback(() => {
      home({ tab: 'channels' })
    }, [navigate])

  useEffect(() => {
    if (writeError) {
      Toast.showToast({
        title: UI_CONTENT.EDIT_CHANNEL_FORM.SAVE_ERROR_TITLE,
        description: UI_CONTENT.EDIT_CHANNEL_FORM.SAVE_ERROR_DESCRIPTION(writeError.message),
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
        title: UI_CONTENT.EDIT_CHANNEL_FORM.SAVE_SUCCESS_TITLE,
        description: UI_CONTENT.EDIT_CHANNEL_FORM.SAVE_SUCCESS_DESCRIPTION(formState.name),
        type: Toast.TYPE.NORMAL,
      })

      dangerouslyUpdateFormState({})

      home({ tab: 'channels' })
    }
  }, [writeError, writeFinished, formState.name, dangerouslyUpdateFormState, home])

  return (
    <EditChannelScreen
      {...props}
      selectedChannel={selectedChannel}
      submitActionName={UI_CONTENT.GLOBAL.ACTION_LABEL_SAVE}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}

function ReportEditChannelScreen(props) {
  const {
      params: {
        selectedChannel,
      }
    } = useContext(RouteContext),
    {
      formState,
    } = useContext(FormContext),
    { navigate } = useContext(RouteDispatchContext),
    handleCancel = useCallback(() => {
      navigate(ROUTES.EDIT_PUBLISH_CONFIG, {
        ...formState.parentFormState,
      })
    }, [navigate, formState]),
    handleSubmit = useCallback(() => {
      navigate(
        ROUTES.EDIT_PUBLISH_CONFIG,
        { formState: buildParentFormState(formState, selectedChannel) }
      )
    }, [navigate, formState, selectedChannel])

  return (
    <EditChannelScreen
      {...props}
      selectedChannel={selectedChannel}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}

export default function EditChannelScreenWrapper(props) {
  const {
      params: {
        formState,
        selectedChannel,
      }
    } = useContext(RouteContext),
    {
      manifest,
      publishConfigs: metaPublishConfigs,
      channels: metaChannels,
    } = useContext(StorageContext)

  if (!formState /*|| formState.parentFormState === null*/) {
    const initFormState = useCallback(() => {
      /*
      if (formState) {
        return { ...formState }
      }
      */

      return formStateFromChannel(
        null,
        metaChannels?.channels,
        manifest,
        metaPublishConfigs,
        metaChannels,
        selectedChannel,
      )
    }, [/*formState, */ metaChannels, metaPublishConfigs, manifest, selectedChannel])

    return withFormContext(
      <StandaloneEditChannelScreen
        {...props}
      />,
      initFormState,
    )
  }

  const initFormState = useCallback(() => (
      formStateFromChannel(
        formState,
        formState.channels,
        manifest,
        metaPublishConfigs,
        metaChannels,
        selectedChannel,
      )
    ),
    [formState, manifest, metaChannels, metaPublishConfigs, selectedChannel]
  )

  return withFormContext(
    <ReportEditChannelScreen
      {...props}
      selectedChannel={selectedChannel}
    />,
    initFormState,
  )
}
