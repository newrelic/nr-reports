import { useContext } from 'react'
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
import { FormContext, Validation } from '../../contexts/form'
import {
  emailSubjectNotEmpty,
  emailToNotEmptyValidEmails,
  emailCcValidEmails,
} from '../validations'

export default function EmailChannelForm({
  onChangeSubject,
  onChangeTo,
  onChangeCc,
  onChangeTemplate,
}) {
  const { formState } = useContext(FormContext),
    {
      emailSubject,
      emailTo,
      emailCc,
      emailTemplate,
      validations,
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
        <Validation
          name="emailSubject"
          validation={emailSubjectNotEmpty}
        >
          <TextField
            label={UI_CONTENT.EMAIL_CHANNEL_FORM.FIELD_LABEL_SUBJECT}
            name={SYMBOLS.EMAIL_CHANNEL_FIELDS.SUBJECT}
            placeholder={UI_CONTENT.EMAIL_CHANNEL_FORM.SUBJECT_FIELD_PLACEHOLDER}
            value={emailSubject}
            onChange={onChangeSubject}
            invalid={validations?.emailSubject}
          />
        </Validation>
      </StackItem>
      <StackItem>
        <Validation
          name="emailTo"
          validation={emailToNotEmptyValidEmails}
        >
          <MultilineTextField
            rows={5}
            label={UI_CONTENT.EMAIL_CHANNEL_FORM.FIELD_LABEL_TO}
            name={SYMBOLS.EMAIL_CHANNEL_FIELDS.TO}
            placeholder={UI_CONTENT.EMAIL_CHANNEL_FORM.TO_FIELD_PLACEHOLDER}
            value={emailTo}
            onChange={onChangeTo}
            invalid={validations?.emailTo}
          />
        </Validation>
      </StackItem>
      <StackItem>
        <Validation
          name="emailCc"
          validation={emailCcValidEmails}
        >
          <MultilineTextField
            rows={5}
            label={UI_CONTENT.EMAIL_CHANNEL_FORM.FIELD_LABEL_CC}
            name={SYMBOLS.EMAIL_CHANNEL_FIELDS.CC}
            placeholder={UI_CONTENT.EMAIL_CHANNEL_FORM.CC_FIELD_PLACEHOLDER}
            value={emailCc}
            onChange={onChangeCc}
            invalid={validations?.emailCc}
          />
        </Validation>
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
