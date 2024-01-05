import React, { useCallback, useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import {
  Link,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
} from 'nr1'
import {
  UI_CONTENT,
} from '../../constants'
import { resolveChannel } from '../../utils'
import { StorageContext } from '../../contexts'

export default function ChannelsTable({
  channels,
  onEditChannel,
  onDeleteChannel,
}) {
  const getActions = useMemo(() => {
      return [
        {
          label: UI_CONTENT.GLOBAL.ACTION_LABEL_DELETE,
          type: TableRow.ACTION_TYPE.DESTRUCTIVE,
          onClick: (evt, { item, index }) => onDeleteChannel(index),
        },
      ]
    }, [onDeleteChannel]),
    { channels: metaChannels } = useContext(StorageContext),
    renderRow = useCallback(({ item, index }) => {
      const channel = resolveChannel(
        metaChannels,
        item
      )

      return (
        <TableRow key={channel.id} actions={getActions}>
          <TableRowCell>
            <Link
              onClick={() => onEditChannel(index) }
            >
              {channel.name}
            </Link>
          </TableRowCell>
          <TableRowCell>
            {channel.type}
          </TableRowCell>
        </TableRow>
      )
    }, [onEditChannel, getActions])

  return (
    <Table
      className="channels-table"
      items={channels}
    >
      <TableHeader>
        <TableHeaderCell>
          {UI_CONTENT.GLOBAL.HEADER_LABEL_NAME}
        </TableHeaderCell>
        <TableHeaderCell>
          {UI_CONTENT.GLOBAL.HEADER_LABEL_TYPE}
        </TableHeaderCell>
      </TableHeader>
      {renderRow}
    </Table>
  )
}
