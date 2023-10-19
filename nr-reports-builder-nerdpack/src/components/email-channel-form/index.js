import {
  MultilineTextField,
  Stack,
  StackItem,
  TextField,
} from 'nr1'
import {
  SYMBOLS,
  UI_CONTENT,
} from "../../constants"

export default function EmailChannelForm({
  formState,
  onChangeSubject,
  onChangeTo,
  onChangeCc,
  onChangeTemplate,
}) {
  const {
    emailSubject,
    emailTo,
    emailCc,
    emailTemplate,
  } = formState

  return (
    <Stack
      className="email-channel-form"
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
          label={UI_CONTENT.EMAIL_CHANNEL_FORM.FIELD_LABEL_SUBJECT}
          name={SYMBOLS.EMAIL_CHANNEL_FIELDS.SUBJECT}
          placeholder={UI_CONTENT.EMAIL_CHANNEL_FORM.SUBJECT_FIELD_PLACEHOLDER}
          value={emailSubject}
          onChange={onChangeSubject}
        />
      </StackItem>
      <StackItem>
        <MultilineTextField
          rows={5}
          label={UI_CONTENT.EMAIL_CHANNEL_FORM.FIELD_LABEL_TO}
          name={SYMBOLS.EMAIL_CHANNEL_FIELDS.TO}
          placeholder={UI_CONTENT.EMAIL_CHANNEL_FORM.TO_FIELD_PLACEHOLDER}
          value={emailTo}
          onChange={onChangeTo}
        />
      </StackItem>
      <StackItem>
        <MultilineTextField
          rows={5}
          label={UI_CONTENT.EMAIL_CHANNEL_FORM.FIELD_LABEL_CC}
          name={SYMBOLS.EMAIL_CHANNEL_FIELDS.CC}
          placeholder={UI_CONTENT.EMAIL_CHANNEL_FORM.CC_FIELD_PLACEHOLDER}
          value={emailCc}
          onChange={onChangeCc}
        />
      </StackItem>
      <StackItem>
        <MultilineTextField
          rows={10}
          label={UI_CONTENT.EMAIL_CHANNEL_FORM.FIELD_LABEL_TEMPLATE}
          name={SYMBOLS.EMAIL_CHANNEL_FIELDS.TEMPLATE}
          placeholder={UI_CONTENT.EMAIL_CHANNEL_FORM.TEMPLATE_FIELD_PLACEHOLDER}
          value={emailTemplate}
          onChange={onChangeTemplate}
        />
      </StackItem>
    </Stack>
  )
}
