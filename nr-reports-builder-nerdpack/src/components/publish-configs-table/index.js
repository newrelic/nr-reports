import { useCallback, useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import {
  Link,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
} from 'nr1'
import { StorageContext } from '../../contexts'
import {
  generateShortScheduleDetails,
  resolvePublishConfig,
} from '../../utils'
import { UI_CONTENT } from '../../constants'

export default function PublishConfigsTable({
  publishConfigs,
  onEditConfig,
  onDeleteConfig,
}) {
  const getActions = useMemo(() => {
      return [
        {
          label: UI_CONTENT.GLOBAL.ACTION_LABEL_DELETE,
          type: TableRow.ACTION_TYPE.DESTRUCTIVE,
          onClick: (evt, { item, index }) => onDeleteConfig(index),
        },
      ];
    }, [onDeleteConfig]),
    { publishConfigs: metaPublishConfigs } = useContext(StorageContext),
    renderRow = useCallback(({ item, index }) => {
      const publishConfig = resolvePublishConfig(
          metaPublishConfigs,
          item
        ),
        settings = publishConfig.metadata && (
          publishConfig.metadata['schedule-builder']
        )

      return (
        <TableRow key={publishConfig.id} actions={getActions}>
          <TableRowCell>
            <Link
              onClick={() => onEditConfig(index) }
            >
              {publishConfig.name}
            </Link>
          </TableRowCell>
          <TableRowCell>{ generateShortScheduleDetails(
              publishConfig.schedule,
              settings,
            )
          }</TableRowCell>
          <TableRowCell>{
            typeof publishConfig.enabled === 'undefined' ||
            publishConfig.enabled ? (
              UI_CONTENT.GLOBAL.STATUS_LABEL_ENABLED
            ) : UI_CONTENT.GLOBAL.STATUS_LABEL_DISABLED
          }</TableRowCell>
          <TableRowCell>{ publishConfig.channels.length }</TableRowCell>
        </TableRow>
      )
    }, [onEditConfig, getActions, metaPublishConfigs])

  return (
    <Table
      className="publish-configs-table"
      items={publishConfigs}
    >
      <TableHeader>
        <TableHeaderCell width="40%">
          {UI_CONTENT.GLOBAL.HEADER_LABEL_NAME}
        </TableHeaderCell>
        <TableHeaderCell width="30%">
          {UI_CONTENT.SCHEDULES_FIELD.HEADER_LABEL_SCHEDULE}
        </TableHeaderCell>
        <TableHeaderCell width="15%">
          {UI_CONTENT.GLOBAL.HEADER_LABEL_ENABLED}
        </TableHeaderCell>
        <TableHeaderCell width="15%">
          {UI_CONTENT.SCHEDULES_FIELD.HEADER_LABEL_CHANNELS}
        </TableHeaderCell>
      </TableHeader>
      {renderRow}
    </Table>
  )
}
