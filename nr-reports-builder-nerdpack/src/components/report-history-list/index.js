import { useContext } from "react"
import {
  Card,
  CardHeader,
  CardBody,
} from 'nr1'
import BusyView from '../busy-view'
import { RouteContext } from "../../contexts"
import { useNrqlQuery } from '../../hooks'
import {
  UI_CONTENT,
} from "../../constants"
import { formatDateTimeForMillis, splitStringAndTrim } from "../../utils"

function getPublishConfigNames(report, publishConfigIdsOpt) {
  const publishConfigIds = splitStringAndTrim(publishConfigIdsOpt),
    { publishConfigs } = report,
    publishConfigNames = []

  if (publishConfigs) {
    for (let index = 0; index < publishConfigIds.length; index += 1) {
      const publishConfigId = publishConfigIds[index],
        publishConfig = publishConfigs.find(p => p.id === publishConfigId)

      if (publishConfig) {
        publishConfigNames.push(publishConfig.name)
      }
    }
  }

  return publishConfigNames
}

export default function ReportHistoryList({ report }) {
  const { params: { accountId }} = useContext(RouteContext),
    {
      loading,
      data,
      error,
    } = useNrqlQuery({
      accountId: accountId,
      query: `SELECT timestamp, error, publishConfigIds FROM NrReportStatus WHERE reportId = '${report.id}' AND runnerId = 'nr-reports-lambda' LIMIT 100 SINCE 1 MONTH AGO`
    })

  if (error) {
    console.error(error)
  }

  return (
    <div className="report-history-list">
      {
        loading && (
          <BusyView />
        )
      }
      {
        !loading && data && (
          data[0].data.map(item => (
            <Card key={`history-item-${item.timestamp}`}>
              <CardHeader
                title={formatDateTimeForMillis(item.timestamp)}
                subtitle={item.error ? (
                  UI_CONTENT.REPORT_HISTORY_LIST.STATUS_LABEL_FAILED
                ) : (
                  UI_CONTENT.REPORT_HISTORY_LIST.STATUS_LABEL_SUCCESS
                )}
              />
              <CardBody>
                {UI_CONTENT.REPORT_HISTORY_LIST.PUBLISH_MESSAGE}
                <ul>
                  {
                    getPublishConfigNames(
                      report,
                      item.publishConfigIds,
                    ).map(name => (
                      <li key={`history-item-${item.timestamp}-${name}`}>
                        {name}
                      </li>
                    ))
                  }
                </ul>
              </CardBody>
            </Card>
          ))
        )
      }
    </div>
  )
}
