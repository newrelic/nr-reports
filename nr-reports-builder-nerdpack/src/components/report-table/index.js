import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Link,
  Spinner,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
} from 'nr1';
import { RouteContext } from '../../contexts';
import { useNrqlQuery } from '../../hooks';
import { formatDateTimeForMillis, getReportType } from '../../utils';
import { UI_CONTENT } from '../../constants';

export default function ReportTable({
  reports,
  onSelectReport,
  onDeleteReport,
}) {
  const
    { params: { accountId }} = useContext(RouteContext),
    {
      loading,
      data,
      error,
    } = useNrqlQuery({
      accountId: accountId,
      query: 'SELECT timestamp FROM NrReportStatus LIMIT 1'
    }),
    [lastRunDate, setLastRunDate] = useState(),
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
        <TableRowCell>
          {formatDateTimeForMillis(item.lastModifiedDate)}
        </TableRowCell>
        <TableRowCell>
          {
            loading && <Spinner type={Spinner.TYPE.DOT} />
          }
          {
            lastRunDate && (
              <span>{formatDateTimeForMillis(lastRunDate)}</span>
            )
          }
        </TableRowCell>
      </TableRow>
    ), [getActions, onSelectReport, lastRunDate])

  useEffect(() => {
    if (!loading && data) {
      if (!error && data.length === 1) {
        setLastRunDate(data[0].data[0].timestamp)
      }
    }
  }, [loading, data, error])

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
          {UI_CONTENT.REPORT_TABLE.HEADER_LABEL_LAST_MODIFIED}
        </TableHeaderCell>
        <TableHeaderCell>
          {UI_CONTENT.REPORT_TABLE.HEADER_LABEL_LAST_RUN}
        </TableHeaderCell>
      </TableHeader>
      {renderRow}
    </Table>
  )
}
