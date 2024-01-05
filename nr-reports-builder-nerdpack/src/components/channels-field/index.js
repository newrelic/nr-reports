import React, { useCallback, useContext } from 'react'
import PropTypes from 'prop-types'
import {
  BlockText,
  Button,
  Stack,
  StackItem,
} from 'nr1'
import ChannelsTable from '../channels-table'
import CustomField from '../custom-field'
import {
  ROUTES,
  UI_CONTENT,
} from '../../constants'
import { RouteDispatchContext } from '../../contexts'
import { FormContext } from '../../contexts/form'

export default function ChannelsField() {
  const { formState, updateFormState } = useContext(FormContext),
    { navigate } = useContext(RouteDispatchContext),
    handleAddChannel = useCallback(() => {
      navigate(ROUTES.EDIT_CHANNEL, { formState, selectedChannel: -1 })
    }, [formState, navigate]),
    handleEditChannel = useCallback(index => {
      navigate(ROUTES.EDIT_CHANNEL, { formState, selectedChannel: index })
    }, [formState, navigate]),
    handleDeleteChannel = useCallback(index => {
      if (!confirm(UI_CONTENT.CHANNELS_FIELD.DELETE_PROMPT)) {
        return
      }

      const channels = [ ...formState.channels ]

      channels.splice(index, 1)
      updateFormState({ channels })
    }, [formState, updateFormState])

  return (
    <div className="channels-field">
      <CustomField
        label={UI_CONTENT.CHANNELS_FIELD.FIELD_LABEL_CHANNELS_CUSTOM}
      >
        <Stack
          directionType={Stack.DIRECTION_TYPE.HORIZONTAL}
          className="channel-list"
          fullWidth
        >
          <StackItem grow>
          {
            formState.channels && formState.channels.length > 0 ? (
              <ChannelsTable
                channels={formState.channels}
                onEditChannel={handleEditChannel}
                onDeleteChannel={handleDeleteChannel}
              />
            ) : (
              <BlockText>
                {UI_CONTENT.CHANNELS_FIELD.NO_CHANNELS_MESSAGE}
              </BlockText>
            )
          }
          </StackItem>
        </Stack>
      </CustomField>

      <Button
        onClick={handleAddChannel}
        type={Button.TYPE.TERTIARY}
        sizeType={Button.SIZE_TYPE.SMALL}
        spacingType={[
          Button.SPACING_TYPE.MEDIUM,
          Button.SPACING_TYPE.SMALL,
          Button.SPACING_TYPE.LARGE,
          Button.SPACING_TYPE.NONE,
        ]}
      >
        {UI_CONTENT.CHANNELS_FIELD.BUTTON_LABEL_ADD_CHANNEL}
      </Button>

    </div>
  )
}
