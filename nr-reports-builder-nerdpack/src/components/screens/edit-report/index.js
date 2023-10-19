import { useCallback, useContext } from "react"
import EditReportForm from "../../edit-report-form"
import { RouteDispatchContext, StorageContext } from "../../../contexts"
import { clone } from '../../../utils'

function saveReport(
  write,
  manifest,
  metadata,
  reportIndex,
  report,
) {
  const manifestCopy = manifest ? clone(manifest) : { reports: [] },
    metadataCopy = metadata ? clone(metadata) : (
      { lastModifiedDate: 0, lastPolledDate: 0 }
    )

  if (reportIndex === -1) {
    manifestCopy.reports.push(report)
  } else {
    manifestCopy.reports[reportIndex] = report
  }

  metadataCopy.lastModifiedDate = new Date().getTime()

  write(manifestCopy, metadataCopy)
}

export default function EditReportScreen({
  accountId,
  selectedReportIndex,
}) {
  const navigate = useContext(RouteDispatchContext),
    {
      write,
      manifest,
      metadata,
    } = useContext(StorageContext),
    handleSaveReport = useCallback((reportIndex, report) => {
      saveReport(write, manifest, metadata, reportIndex, report)
    }, [write, manifest, metadata])

  return (
    <EditReportForm
      accountId={accountId}
      navigate={navigate}
      selectedReportIndex={selectedReportIndex}
      report={selectedReportIndex >= 0 ? (
        manifest.reports[selectedReportIndex]
      ) : ({
        name: 'Untitled',
        lastModifiedDate: 0,
        schedule: '*/15 * * * *',
        dashboards: [],
        channels: [],
      })}
      onSubmit={handleSaveReport}
    />
  )
}
