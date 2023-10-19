import {
  Stack,
  StackItem,
  TextField,
} from 'nr1'
import {
  SYMBOLS,
  UI_CONTENT,
} from "../../constants"

export default function SlackChannelForm({
  formState,
  onChangeWebhookUrl,
}) {
  const {
    slackWebhookUrl,
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
        <TextField
          label={UI_CONTENT.SLACK_CHANNEL_FORM.FIELD_LABEL_WEBHOOK_URL}
          name={SYMBOLS.SLACK_CHANNEL_FIELDS.WEBHOOK_URL}
          placeholder={UI_CONTENT.SLACK_CHANNEL_FORM.WEBHOOK_URL_FIELD_PLACEHOLDER}
          value={slackWebhookUrl}
          onChange={onChangeWebhookUrl}
        />
      </StackItem>
    </Stack>
  )
}
