import { useCallback, useContext } from 'react'
import PropTypes from 'prop-types'
import {
  RadioGroup,
  Radio,
  Select,
  SelectItem,
  Stack,
  StackItem,
  TextField,
} from 'nr1'
import { FormContext, StorageContext, Validation } from '../../contexts'
import { channelTypeIsValid, nameNotEmpty } from '../validations'
import { SYMBOLS, UI_CONTENT } from '../../constants'
import EmailChannelForm from '../email-channel-form'

export default function ChannelForm({
  selectedChannel,
}) {
  const {
      formState,
      updateFormState,
    } = useContext(FormContext),
    { channels: metaChannels } = useContext(StorageContext),
    { validations } = formState,
    handleChangeName = useCallback(e => {
      updateFormState({ name: e.target.value })
    }, [updateFormState]),
    handleValidateName = useCallback(formState => {
      if (
        selectedChannel >= 0 ||
        formState.mode === UI_CONTENT.EDIT_CHANNEL_FORM.MODE_VALUE_CREATE_NEW_CHANNEL
      ) {
        return nameNotEmpty(formState)
      }

      return null
    }, [formState.mode, selectedChannel]),
    handleChangeMode = useCallback((_, v) => {
      if (
        v === UI_CONTENT.EDIT_CHANNEL_FORM.MODE_VALUE_USE_EXISTING_CHANNEL
      ) {
        // The || here is to catch the case where useExisting is selected but
        // the formState.ref has not been initialized because the form just
        // loaded.
        updateFormState({
          mode: v,
          ref: formState.ref || metaChannels.channels[0].id,
        })
        return
      }
      updateFormState({ mode: v })
    }, [formState.ref, metaChannels, updateFormState]),
    handleChangeChannelRef = useCallback((_, v) => {
      updateFormState({ ref: v })
    }, [updateFormState]),
    handleChangeType = useCallback((_, v) => {
      updateFormState({ type: v })
    }, [updateFormState]),
    handleChangeEmailSubject = useCallback(e => {
      updateFormState({ emailSubject: e.target.value })
    }, [formState] ),
    handleChangeEmailFormat = useCallback((_, v) => {
      updateFormState({ emailFormat: v })
    }, [formState] ),
    handleChangeAttachOutput = useCallback(e => {
      updateFormState({ emailAttachOutput: e.target.checked })
    }, [formState] ),
    handleChangeQueryResultsHtmlMaxRows = useCallback(e => {
      updateFormState({ emailQueryResultsHtmlMaxRows: e.target.value })
    }, [formState] ),
    handleChangeEmailTo = useCallback(e => {
      updateFormState({ emailTo: e.target.value })
    }, [formState] ),
    handleChangeEmailCc = useCallback(e => {
      updateFormState({ emailCc: e.target.value })
    }, [formState]),
    handleChangeEmailTemplate = useCallback(e => {
      updateFormState({ emailTemplate: e.target.value })
    }, [formState]),
    handleChangeSlackWebhookUrl = useCallback(e => {
      updateFormState({ slackWebhookUrl: e.target.value })
    }, [formState])

  return (
    <Stack
      className='channel-form'
      spacingType={[
        Stack.SPACING_TYPE.NONE,
      ]}
      directionType={Stack.DIRECTION_TYPE.VERTICAL}
      fullWidth
      fullHeight
      horizontalType={Stack.HORIZONTAL_TYPE.FILL}
    >
    {
      // The parentFormState !== null check here is to make sure we don't show
      // the mode choices when we are editing a meta channel directly opposed to
      // editing a channel when editing a publish config because a meta channel
      // should not be able to reference another meta channel. We also don't
      // want to allow changing the mode of an existing report channel which is
      // what the selectedChannel check is for.
      (
        selectedChannel === -1 &&
        formState.parentFormState !== null &&
        metaChannels?.channels.length > 0
      ) && (
        <StackItem>
          <RadioGroup
            value={formState.mode}
            defaultValue={
              UI_CONTENT.EDIT_CHANNEL_FORM.MODE_VALUE_CREATE_NEW_CHANNEL
            }
            onChange={handleChangeMode}
          >
            <Radio
              label={UI_CONTENT.EDIT_CHANNEL_FORM.FIELD_LABEL_CREATE_NEW_CHANNEL}
              value={UI_CONTENT.EDIT_CHANNEL_FORM.MODE_VALUE_CREATE_NEW_CHANNEL}
            />
            <Radio
              label={UI_CONTENT.EDIT_CHANNEL_FORM.FIELD_LABEL_USE_EXISTING_CHANNEL}
              value={UI_CONTENT.EDIT_CHANNEL_FORM.MODE_VALUE_USE_EXISTING_CHANNEL}
            />
          </RadioGroup>
        </StackItem>
      )
    }
    {
      (
        selectedChannel >= 0 ||
        formState.mode === UI_CONTENT.EDIT_CHANNEL_FORM.MODE_VALUE_CREATE_NEW_CHANNEL
      ) && (
        <>
          <StackItem>
            <Validation name="name" validation={handleValidateName}>
              <TextField
                placeholder={
                  UI_CONTENT.EDIT_CHANNEL_FORM.CHANNEL_NAME_FIELD_PLACEHOLDER
                }
                label={UI_CONTENT.EDIT_CHANNEL_FORM.FIELD_LABEL_NAME}
                value={formState.name}
                onChange={handleChangeName}
                invalid={validations?.name}
              />
            </Validation>
          </StackItem>

          <StackItem>
            <Validation name="type" validation={channelTypeIsValid}>
              <Select
                label={UI_CONTENT.EDIT_CHANNEL_FORM.FIELD_LABEL_CHANNEL_TYPE}
                onChange={handleChangeType}
                value={formState.type}
                invalid={validations?.type}
              >
                <SelectItem value={SYMBOLS.CHANNEL_TYPES.EMAIL}>
                  {UI_CONTENT.EDIT_CHANNEL_FORM.CHANNEL_TYPE_LABEL_EMAIL}
                </SelectItem>
                {/*
                <SelectItem value={SYMBOLS.CHANNEL_TYPES.SLACK}>
                  {UI_CONTENT.EDIT_CHANNEL_FORM.CHANNEL_TYPE_LABEL_SLACK}
                </SelectItem>
                */}
              </Select>
            </Validation>
          </StackItem>

          <StackItem>
            {
              formState.type === SYMBOLS.CHANNEL_TYPES.EMAIL && (
                <EmailChannelForm
                  onChangeSubject={handleChangeEmailSubject}
                  onChangeFormat={handleChangeEmailFormat}
                  onChangeAttachOutput={handleChangeAttachOutput}
                  onChangeQueryResultsHtmlMaxRows={handleChangeQueryResultsHtmlMaxRows}
                  onChangeTo={handleChangeEmailTo}
                  onChangeCc={handleChangeEmailCc}
                  onChangeTemplate={handleChangeEmailTemplate}
                />
              )
            }
            {
              formState.type === SYMBOLS.CHANNEL_TYPES.SLACK && (
                <SlackChannelForm
                  onChangeWebhookUrl={handleChangeSlackWebhookUrl}
                />
              )
            }
          </StackItem>
        </>
      )
    }
    {
      (
        selectedChannel === -1 &&
        formState.mode === UI_CONTENT.EDIT_CHANNEL_FORM.MODE_VALUE_USE_EXISTING_CHANNEL &&
        metaChannels?.channels &&
        metaChannels.channels.length > 0
      ) && (
        <>
          <StackItem>
            <Select
              label={UI_CONTENT.EDIT_CHANNEL_FORM.FIELD_LABEL_CHANNEL_REF}
              value={formState.ref}
              onChange={handleChangeChannelRef}
            >
              {
                metaChannels.channels.map(
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
    </Stack>
  )
}
