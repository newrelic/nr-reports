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

const idMaps = {}

export function getObjectId(name, object) {
  const idMap = idMaps[name]

  if (!idMap) {
    idMap = { count: 1, idMap: new WeakMap() }
    idMaps[name] = idMap
  }

  const objectId = idMap.get(object)

  if (objectId === undefined) {
    idMap.count += 1
    idMap.idMap.set(object, count)

    return count
  }

  return objectId
}
