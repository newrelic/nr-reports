export const QUERIES = {
  NRQL: {
    REPORT_HISTORY: (report, limit = 100) => `SELECT timestamp, error, publishConfigIds FROM NrReportStatus WHERE reportId = '${report.id}' AND runnerId = 'nr-reports-lambda' LIMIT ${limit} SINCE 1 MONTH AGO`
  }
}
