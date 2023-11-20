import { useContext } from 'react'
import {
  Stack,
  StackItem,
  TextField,
} from 'nr1'
import {
  SYMBOLS,
  UI_CONTENT,
} from "../../constants"
import { FormContext, Validation } from '../../contexts/form'
import { slackWebhookUrlNotEmptyIsUrl } from '../validations'

export default function SlackChannelForm({ onChangeWebhookUrl }) {
  const { formState } = useContext(FormContext),
    {
      slackWebhookUrl,
      validations,
    } = formState

  return (
    <Stack
      className="slack-channel-form"
      directionType={Stack.DIRECTION_TYPE.VERTICAL}
      spacingType={[
        Stack.SPACING_TYPE.LARGE,
        Stack.SPACING_TYPE.NONE,
      ]}
      fullWidth
      fullHeight
      horizontalType={Stack.HORIZONTAL_TYPE.FILL}
    >
      <StackItem>
        <Validation
          name="slackWebhookUrl"
          validation={slackWebhookUrlNotEmptyIsUrl}
        >
          <TextField
            label={UI_CONTENT.SLACK_CHANNEL_FORM.FIELD_LABEL_WEBHOOK_URL}
            name={SYMBOLS.SLACK_CHANNEL_FIELDS.WEBHOOK_URL}
            placeholder={UI_CONTENT.SLACK_CHANNEL_FORM.WEBHOOK_URL_FIELD_PLACEHOLDER}
            value={slackWebhookUrl}
            onChange={onChangeWebhookUrl}
            invalid={validations?.slackWebhookUrl}
          />
        </Validation>
      </StackItem>
    </Stack>
  )
}
