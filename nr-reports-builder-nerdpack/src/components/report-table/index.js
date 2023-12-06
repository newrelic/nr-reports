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
import { QUERIES, UI_CONTENT } from '../../constants';
import ReportHistoryModal from '../report-history-modal';

function ReportLastRunTableRowCell({
  report,
}) {
  const { params: { accountId }} = useContext(RouteContext),
    {
      loading,
      data,
      error,
    } = useNrqlQuery({
      accountId: accountId,
      query: QUERIES.NRQL.REPORT_HISTORY(report, 1),
    }),
    [lastRunDate, setLastRunDate] = useState()

  useEffect(() => {
    if (!loading && data) {
      if (!error && data.length === 1) {
        setLastRunDate(data[0].data[0].timestamp)
      }
    }
  }, [loading, data, error])

  return (
    <>
      {
        loading && <Spinner type={Spinner.TYPE.DOT} />
      }
      {
        lastRunDate && (
          <span>{formatDateTimeForMillis(lastRunDate)}</span>
        )
      }
    </>
  )
}

export default function ReportTable({
  reports,
  onSelectReport,
  onDeleteReport,
}) {
  const [viewReportHistoryIndex, setViewReportHistoryIndex] = useState(-1),
    handleViewHistory = useCallback(index => {
      setViewReportHistoryIndex(index)
    }, [setViewReportHistoryIndex]),
    handleCloseHistoryModal = useCallback(() => {
      setViewReportHistoryIndex(-1)
    }, [setViewReportHistoryIndex]),
    getActions = useMemo(() => {
      return [
        {
          label: UI_CONTENT.REPORT_TABLE.ACTION_LABEL_VIEW_HISTORY,
          onClick: (evt, { item, index }) => {
            handleViewHistory(index)
          }
        },
        {
          label: UI_CONTENT.GLOBAL.ACTION_LABEL_DELETE,
          type: TableRow.ACTION_TYPE.DESTRUCTIVE,
          onClick: (evt, { item, index }) => {
            onDeleteReport(index)
          }
        },
      ]
    }, [handleViewHistory, onDeleteReport]),
    renderRow = useCallback(({ item: report, index }) => (
      <TableRow key={item.id} actions={getActions}>
        <TableRowCell>
          <Link
            onClick={() => onSelectReport(index)}
          >
            {report.name}
          </Link>
        </TableRowCell>
        <TableRowCell>{getReportType(report)}</TableRowCell>
        <TableRowCell>{
          typeof report.enabled === 'undefined' || report.enabled ? (
            UI_CONTENT.GLOBAL.STATUS_LABEL_ENABLED
          ) : UI_CONTENT.GLOBAL.STATUS_LABEL_DISABLED
        }</TableRowCell>
        <TableRowCell>
          {formatDateTimeForMillis(report.lastModifiedDate)}
        </TableRowCell>
        <TableRowCell>
          <ReportLastRunTableRowCell report={report} />
        </TableRowCell>
      </TableRow>
    ), [getActions, onSelectReport])

  return (
    <>
      <Table
        className="report-table"
        items={reports}
      >
        <TableHeader>
          <TableHeaderCell width="33%">
            {UI_CONTENT.GLOBAL.HEADER_LABEL_NAME}
          </TableHeaderCell>
          <TableHeaderCell width="10%">
            {UI_CONTENT.GLOBAL.HEADER_LABEL_TYPE}
          </TableHeaderCell>
          <TableHeaderCell width="10%">
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
      {
        viewReportHistoryIndex >= 0 && (
          <ReportHistoryModal
            report={reports[viewReportHistoryIndex]}
            open
            onClose={handleCloseHistoryModal}
          />
        )
      }
    </>
  )
}
