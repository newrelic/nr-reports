import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Link,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
} from 'nr1';
import { UI_CONTENT } from '../../constants';
import { getReportType } from '../../utils';

export default function ReportTable(props) {
  const {
      reports,
      onSelectReport,
      onDeleteReport,
    } = props,
    getActions = useMemo(() => {
      return [
        {
          label: UI_CONTENT.GLOBAL.ACTION_LABEL_DELETE,
          type: TableRow.ACTION_TYPE.DESTRUCTIVE,
          onClick: (evt, { item, index }) => {
            onDeleteReport(index)
          }
        },
      ]
    }, [onDeleteReport]),
    renderRow = useCallback(({ item, index }) => (
      <TableRow key={item.id} actions={getActions}>
        <TableRowCell>
          <Link
            onClick={() => onSelectReport(index) }
          >
            {item.name}
          </Link>
        </TableRowCell>
        <TableRowCell>{getReportType(item)}</TableRowCell>
        <TableRowCell>{
          typeof item.enabled === 'undefined' || item.enabled ? (
            UI_CONTENT.GLOBAL.STATUS_LABEL_ENABLED
          ) : UI_CONTENT.GLOBAL.STATUS_LABEL_DISABLED
        }</TableRowCell>
        <TableRowCell>{item.publishConfigs ? (
          Object.keys(item.publishConfigs).length
        ) : 0}
        </TableRowCell>
      </TableRow>
    ), [getActions, onSelectReport])

  return (
    <Table
      className="report-table"
      items={reports}
    >
      <TableHeader>
        <TableHeaderCell>
          {UI_CONTENT.GLOBAL.HEADER_LABEL_NAME}
        </TableHeaderCell>
        <TableHeaderCell>
          {UI_CONTENT.GLOBAL.HEADER_LABEL_TYPE}
        </TableHeaderCell>
        <TableHeaderCell>
          {UI_CONTENT.GLOBAL.HEADER_LABEL_ENABLED}
        </TableHeaderCell>
        <TableHeaderCell>
          {UI_CONTENT.HOME.HEADER_LABEL_PUBLISH_CONFIGS}
        </TableHeaderCell>
      </TableHeader>
      {renderRow}
    </Table>
  )
}
