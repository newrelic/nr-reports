import React, { useCallback, useState } from 'react';
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
  const [selection, setSelection] = useState([]),
    {
      reports,
      onSelectReport,
      onDeleteReports,
    } = props,
    getActions = () => {
      return [
        {
          label: UI_CONTENT.GLOBAL.ACTION_LABEL_DELETE,
          onClick: e => {
            e.preventDefault()
            onDeleteReports(selection)
          }
        },
      ]
    },
    renderRow = useCallback(({ item, index }) => (
      <TableRow>
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
    ), []),
    handleSelectRow = useCallback((evt, { index }) => {
      const checked = evt.target.checked

      if (checked) {
        setSelection([ ...selection, index])
        return
      }

      const indexIndex = selection.findIndex(v => v === index)

      if (indexIndex >= 0) {
        const newSelection = [ ...selection ]

        newSelection.splice(indexIndex, 1)
        setSelection(newSelection)
      }
    }, [selection, setSelection])

  return (
    <Table
      className="report-table"
      items={reports}
      selected={({ index }) => selection.findIndex(v => v === index) !== -1}
      onSelect={handleSelectRow}
    >
      <TableHeader actions={getActions()}>
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
