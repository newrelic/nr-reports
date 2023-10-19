import { useCallback, useState } from "react"
import {
  Button,
  Form,
  HeadingText,
  Modal,
  Select,
  SelectItem,
  Stack,
  StackItem,
} from 'nr1'
import EmailChannelForm from "../email-channel-form"
import SlackChannelForm from "../slack-channel-form"
import {
  SYMBOLS,
  UI_CONTENT,
} from "../../constants"

function channelToFormState(channel) {
  if (channel.type === SYMBOLS.CHANNEL_TYPES.EMAIL) {
    return  {
      type: SYMBOLS.CHANNEL_TYPES.EMAIL,
      emailSubject: channel.subject,
      emailTo: channel.to?.replaceAll(/\s*,\s*/ug, `\n`),
      emailCc: channel.cc?.replaceAll(/\s*,\s*/ug, `\n`),
      emailTemplate: channel.emailTemplate || '',
    }
  }

  if (channel.type === SYMBOLS.CHANNEL_TYPES.SLACK) {
    return  {
      type: SYMBOLS.CHANNEL_TYPES.SLACK,
      slackWebhookUrl: channel.webhookUrl || '',
    }
  }

  // @TODO throw error
  return null
}

function channelFromFormState(formState) {
  const channel = { type: SYMBOLS.CHANNEL_TYPES.EMAIL }

  if (formState.type === SYMBOLS.CHANNEL_TYPES.EMAIL) {
    channel.type = SYMBOLS.CHANNEL_TYPES.EMAIL
    channel.subject = formState.emailSubject
    channel.to = formState.emailTo ? formState.emailTo.replaceAll(/\n+/ug,',') : ''
    channel.cc = formState.emailCc ? formState.emailCc.replaceAll(/\n+/ug,',') : ''
    channel.emailTemplate = formState.emailTemplate || ''
  } else if (formState.type === SYMBOLS.CHANNEL_TYPES.SLACK) {
    channel.type = SYMBOLS.CHANNEL_TYPES.SLACK
    channel.webhookUrl = formState.slackWebhookUrl
  }

  return channel
}

export default function ChannelModal({ accountId, channel, open, onSubmit, onClose }) {
  const [formState, setFormState] = useState(channelToFormState(channel)),
    handleSubmit = useCallback(() => {
      onSubmit(channelFromFormState(formState))
    }),
    handleOnChangeEmailSubject = useCallback(e => {
      setFormState({ ...formState, emailSubject: e.target.value })
    }, [formState] ),
    handleOnChangeEmailTo = useCallback(e => {
      setFormState({ ...formState, emailTo: e.target.value })
    }, [formState] ),
    handleOnChangeEmailCc = useCallback(e => {
      setFormState({ ...formState, emailCc: e.target.value })
    }, [formState]),
    handleOnChangeEmailTemplate = useCallback(e => {
      setFormState({ ...formState, emailTemplate: e.target.value })
    }, [formState]),
    handleOnChangeSlackWebhookUrl = useCallback(e => {
      setFormState({ ...formState, slackWebhookUrl: e.target.value })
    }, [formState])

  return (
    <Modal hidden={!open} onClose={() => onClose()}>
      <Form
        className="channel-modal"
        spacingType={[Form.SPACING_TYPE.LARGE]}
      >
        <HeadingText type={HeadingText.TYPE.HEADING_2}>
          {UI_CONTENT.CHANNEL_MODAL.HEADING}
        </HeadingText>

        <Select
          label={UI_CONTENT.CHANNEL_MODAL.FIELD_LABEL_CHANNEL_TYPE}
          onChange={(_, v) => setFormState({ ...formState, type: v })}
          value={formState.type}
        >
          <SelectItem value={SYMBOLS.CHANNEL_TYPES.EMAIL}>
            {UI_CONTENT.CHANNEL_MODAL.CHANNEL_TYPE_LABEL_EMAIL}
          </SelectItem>
          <SelectItem value={SYMBOLS.CHANNEL_TYPES.SLACK}>
            {UI_CONTENT.CHANNEL_MODAL.CHANNEL_TYPE_LABEL_SLACK}
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
              onClick={() => handleSubmit()}
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
          </StackItem>
        </Stack>
      </Form>
    </Modal>
  )
}
