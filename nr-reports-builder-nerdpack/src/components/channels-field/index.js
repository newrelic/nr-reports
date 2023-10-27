import React, { useCallback, useContext, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  BlockText,
  Button,
  Stack,
  StackItem,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
} from 'nr1'
import CustomField from '../custom-field'
import {
  ROUTES,
  SYMBOLS,
  UI_CONTENT,
} from '../../constants'
import { RouteDispatchContext } from '../../contexts'

function EmailChannelInfo({ channel }) {
  const {
    to,
    cc,
    subject,
  } = channel

  return (
    <Stack
      directionType={Stack.DIRECTION_TYPE.HORIZONTAL}
      className="channel-info"
      fullWidth
    >
      <StackItem>
        To: {to}
      </StackItem>
      <StackItem>
        Cc: {cc}
      </StackItem>
      <StackItem>
        Subject: {subject}
      </StackItem>
    </Stack>
  )
}

function SlackChannelInfo({ channel }) {
  const {
    webhookUrl,
  } = channel

  return (
    <Stack
      directionType={Stack.DIRECTION_TYPE.HORIZONTAL}
      className="channel-info"
      fullWidth
    >
      <StackItem>
        Webhook URL: {`${webhookUrl.replace(/T[\d]+/u,'TXXXXXXXX').replace(/B[\d]+/u, 'BXXXXXXXX').slice(0, -10)}XXXXXXXXXX`}
      </StackItem>
    </Stack>
  )
}

function ChannelsTable({ channels, onEditChannel, onDeleteChannel }) {
  const getActions = useMemo(() => {
      return [
        {
          label: UI_CONTENT.GLOBAL.ACTION_LABEL_EDIT,
          onClick: (e, { item, index }) => onEditChannel(index)
        },
        {
          label: UI_CONTENT.GLOBAL.ACTION_LABEL_DELETE,
          type: TableRow.ACTION_TYPE.DESTRUCTIVE,
          onClick: (evt, { item, index }) => onDeleteChannel(index),
        },
      ];
    }, [onEditChannel, onDeleteChannel]),
    renderRow = useCallback(({ item }) => (
      <TableRow actions={getActions}>
        <TableRowCell>{item.type}</TableRowCell>
        {
          item.type === SYMBOLS.CHANNEL_TYPES.EMAIL && (
            <TableRowCell><EmailChannelInfo channel={item} /></TableRowCell>
          )
        }
        {
          item.type === SYMBOLS.CHANNEL_TYPES.SLACK && (
            <TableRowCell><SlackChannelInfo channel={item} /></TableRowCell>
          )
        }
      </TableRow>
    ), [getActions])

  return (
    <Table items={channels}>
      <TableHeader>
        <TableHeaderCell>
          Type
        </TableHeaderCell>
        <TableHeaderCell>
          Details
        </TableHeaderCell>
      </TableHeader>
      {renderRow}
    </Table>
  )
}

export default function ChannelsField({
  formState,
  updateFormState,
}) {
  const { navigate } = useContext(RouteDispatchContext),
    handleAddChannel = useCallback(() => {
      navigate(ROUTES.EDIT_CHANNELS, { formState, selectedChannel: -1 })
    }, [formState, navigate]),
    handleEditChannel = useCallback(index => {
      navigate(ROUTES.EDIT_CHANNELS, { formState, selectedChannel: index })
    }, [formState, navigate]),
    handleDeleteChannel = useCallback(index => {
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
