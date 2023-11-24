import React, { useCallback, useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import {
  BlockText,
  Button,
  Link,
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
import { FormContext } from '../../contexts/form'

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
          label: UI_CONTENT.GLOBAL.ACTION_LABEL_DELETE,
          type: TableRow.ACTION_TYPE.DESTRUCTIVE,
          onClick: (evt, { item, index }) => onDeleteChannel(index),
        },
      ];
    }, [onDeleteChannel]),
    renderRow = useCallback(({ item, index }) => (
      <TableRow key={`${item.type}-${index}`} actions={getActions}>
        <TableRowCell>
          <Link
            onClick={() => onEditChannel(index) }
          >
            {item.type}
          </Link>
        </TableRowCell>
        {
          item.type === SYMBOLS.CHANNEL_TYPES.EMAIL && (
            <TableRowCell><EmailChannelInfo channel={item} /></TableRowCell>
          )
        }
        {/*
          item.type === SYMBOLS.CHANNEL_TYPES.SLACK && (
            <TableRowCell><SlackChannelInfo channel={item} /></TableRowCell>
          )
        */}
      </TableRow>
    ), [onEditChannel, getActions])

  return (
    <Table items={channels}>
      <TableHeader>
        <TableHeaderCell>
          {UI_CONTENT.GLOBAL.HEADER_LABEL_NAME}
        </TableHeaderCell>
        <TableHeaderCell>
          {UI_CONTENT.CHANNELS_FIELD.HEADER_LABEL_DETAILS}
        </TableHeaderCell>
      </TableHeader>
      {renderRow}
    </Table>
  )
}

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
