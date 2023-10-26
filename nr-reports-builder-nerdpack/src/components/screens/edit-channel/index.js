import React, { useCallback, useContext, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Button,
  Form,
  HeadingText,
  Select,
  SelectItem,
  Stack,
  StackItem,
  TextField,
} from 'nr1'
import EmailChannelForm from "../../email-channel-form"
import SlackChannelForm from "../../slack-channel-form"
import {
  RouteContext,
  RouteDispatchContext,
} from '../../../contexts'
import {
  ROUTES,
  SYMBOLS,
  UI_CONTENT,
} from '../../../constants'
import { clone } from '../../../utils'

function formStateFromChannel(parentFormState, selectedChannel) {
  let channel

  if (parentFormState.channels[selectedChannel]) {
    const selected = parentFormState.channels[selectedChannel]

    if (selected.type === SYMBOLS.CHANNEL_TYPES.EMAIL) {
      channel = {
        type: SYMBOLS.CHANNEL_TYPES.EMAIL,
        emailSubject: selected.subject,
        emailTo: selected.to ? selected.to.replaceAll(/\s*,\s*/ug,"\n") : '',
        emailCc: selected.cc ? selected.cc.replaceAll(/\s*,\s*/ug,',') : '',
        emailTemplate: selected.emailTemplate || '',
      }
    } else if (selected.type === SYMBOLS.CHANNEL_TYPES.SLACK) {
      channel = {
        type: SYMBOLS.CHANNEL_TYPES.SLACK,
        slackWebhookUrl: selected.webhookUrl,
      }
    }
  } else {
    channel = {
      type: SYMBOLS.CHANNEL_TYPES.EMAIL,
      emailSubject: '',
      emailTo: '',
      emailCc: '',
      emailTemplate: '',
    }
  }

  return {
    parentFormState: clone(parentFormState),
    ...channel,
  }
}

function channelFromFormState(formState, selectedChannel) {
  const channels = [ ...formState.parentFormState.channels ],
    channel = channels[selectedChannel] || { type: SYMBOLS.CHANNEL_TYPES.EMAIL }

  if (formState.type === SYMBOLS.CHANNEL_TYPES.EMAIL) {
    channel.type = SYMBOLS.CHANNEL_TYPES.EMAIL
    channel.subject = formState.emailSubject
    channel.to = formState.emailTo ? formState.emailTo.replaceAll(/\s*\n+\s*/ug,',') : ''
    channel.cc = formState.emailCc ? formState.emailCc.replaceAll(/\s*\n+\s*/ug,',') : ''
    channel.emailTemplate = formState.emailTemplate || ''
  } else if (formState.type === SYMBOLS.CHANNEL_TYPES.SLACK) {
    channel.type = SYMBOLS.CHANNEL_TYPES.SLACK
    channel.webhookUrl = formState.slackWebhookUrl
  }

  if (selectedChannel >= 0) {
    channels[selectedChannel] = channel
  } else {
    channels.push(channel)
  }

  return {
    parentFormState: formState.parentFormState.parentFormState,
    ...formState.parentFormState,
    channels,
    dirty: formState.dirty,
  }
}

export default function EditChannelScreen() {
  const {
      params: { accountId, formState: parentFormState, selectedChannel }
    } = useContext(RouteContext),
    { navigate } = useContext(RouteDispatchContext),
    [formState, setFormState] = useState(
      formStateFromChannel(parentFormState, selectedChannel)
    ),
    updateFormState = useCallback((updates, dirty) => {
      setFormState({
        ...formState,
        ...updates,
        dirty: typeof dirty === 'undefined' ? true : dirty,
      })
    }, [formState, setFormState] ),
    handleSubmit = useCallback(() => {
      navigate(
        ROUTES.EDIT_PUBLISH_CONFIGS,
        { formState: channelFromFormState(formState, selectedChannel) }
      )
    }),
    handleCancel = useCallback(() => {
      if (formState.dirty) {
        if (!confirm(UI_CONTENT.EDIT_PUBLISH_CONFIGS_SCREEN.CANCEL_PROMPT)) {
          return
        }
      }

      navigate(ROUTES.EDIT_PUBLISH_CONFIGS, {
        parentFormState: formState.parentFormState.parentFormState,
        ...formState.parentFormState,
      })
    }, [navigate, formState, parentFormState]),
    handleOnChangeEmailSubject = useCallback(e => {
      updateFormState({ emailSubject: e.target.value })
    }, [formState] ),
    handleOnChangeEmailTo = useCallback(e => {
      updateFormState({ emailTo: e.target.value })
    }, [formState] ),
    handleOnChangeEmailCc = useCallback(e => {
      updateFormState({ emailCc: e.target.value })
    }, [formState]),
    handleOnChangeEmailTemplate = useCallback(e => {
      updateFormState({ emailTemplate: e.target.value })
    }, [formState]),
    handleOnChangeSlackWebhookUrl = useCallback(e => {
      updateFormState({ slackWebhookUrl: e.target.value })
    }, [formState])

  return (
    <Form
      className="edit-channel-form"
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
        {UI_CONTENT.EDIT_CHANNELS_FORM.HEADING}
      </HeadingText>

      <Select
        label={UI_CONTENT.EDIT_CHANNELS_FORM.FIELD_LABEL_CHANNEL_TYPE}
        onChange={(_, v) => setFormState({ ...formState, type: v })}
        value={formState.type}
      >
        <SelectItem value={SYMBOLS.CHANNEL_TYPES.EMAIL}>
          {UI_CONTENT.EDIT_CHANNELS_FORM.CHANNEL_TYPE_LABEL_EMAIL}
        </SelectItem>
        <SelectItem value={SYMBOLS.CHANNEL_TYPES.SLACK}>
          {UI_CONTENT.EDIT_CHANNELS_FORM.CHANNEL_TYPE_LABEL_SLACK}
        </SelectItem>
      </Select>

      {
        formState.type === SYMBOLS.CHANNEL_TYPES.EMAIL && (
          <EmailChannelForm
            accountId={accountId}
            formState={formState}
            onChangeSubject={handleOnChangeEmailSubject}
            onChangeTo={handleOnChangeEmailTo}
            onChangeCc={handleOnChangeEmailCc}
            onChangeTemplate={handleOnChangeEmailTemplate}
          />
        )
      }

      {
        formState.type === SYMBOLS.CHANNEL_TYPES.SLACK && (
          <SlackChannelForm
            accountId={accountId}
            formState={formState}
            onChangeWebhookUrl={handleOnChangeSlackWebhookUrl}
          />
        )
      }

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
    </Form>
  )
}
