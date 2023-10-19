import { SYMBOLS } from "./constants"

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export function getReportType(report) {
  if (report.query) {
    return SYMBOLS.REPORT_TYPES.QUERY
  }

  return SYMBOLS.REPORT_TYPES.DASHBOARD
}
