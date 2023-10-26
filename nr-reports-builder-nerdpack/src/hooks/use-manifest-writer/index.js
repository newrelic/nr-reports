import { useCallback, useContext } from 'react'
import { StorageContext } from '../../contexts'
import { clone } from '../../utils'

function copyMetadata(metadata) {
  const metadataCopy = metadata ? clone(metadata) : (
    { lastModifiedDate: 0, lastPolledDate: 0 }
  )

  metadataCopy.lastModifiedDate = new Date().getTime()

  return metadataCopy
}

function sortByNumber(a, b) {
  if (a < b) {
    return -1
  }

  if (a > b) {
    return 1
  }

  return 0
}

export default function useManifestWriter() {
  const { write, manifest, metadata } = useContext(StorageContext),
    update = useCallback((report, reportIndex = -1) => {
      const manifestCopy = manifest ? clone(manifest) : { reports: [] }

      manifestCopy.reports.splice(
        reportIndex >= 0 ? reportIndex : manifestCopy.reports.length,
        reportIndex >= 0 ? 1 : 0,
        report
      )

      write(manifestCopy, copyMetadata(metadata))
    }, [write, manifest, metadata]),
    create = useCallback(report => {
      update(report)
    }, [update]),
    del = useCallback(reportIndices => {
      const manifestCopy = manifest ? clone(manifest) : { reports: [] }

      reportIndices.sort(sortByNumber)

      for (let index = reportIndices.length - 1; index >= 0; index -= 1) {
        manifestCopy.reports.splice(reportIndices[index], 1)
      }

      write(manifestCopy, copyMetadata(metadata))
    }, [write, manifest, metadata])

  return { create, update, del }
}
