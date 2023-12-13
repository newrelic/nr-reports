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

function rebuildPublishConfigs(report, publishConfigs) {
  const { publishConfigs: reportPublishConfigs } = report

  if (!reportPublishConfigs || reportPublishConfigs.length === 0) {
    return { newReport: null, newPublishConfigs: null }
  }

  const reportCopy = clone(report),
    publishConfigsCopy = clone(publishConfigs)

  reportCopy.publishConfigs.forEach((publishConfig, index) => {
    // If this publish config is already a reference, just verify the
    // reference and return.
    if (publishConfig.ref) {
      const jindex = publishConfigs.find(pc => pc.id === publishConfig.ref)

      if (jindex === -1) {
        throw new Error(`missing publish config ${publishConfig.ref}`)
      }

      return
    }

    const jindex = publishConfigs.findIndex(pc => {
      return pc.id === publishConfig.id
    })

    // When an existing publish config is edited from a report, it is saved
    // back to the report but not as a ref. We can tell by checking the configs
    // id against known ids. If this is the case, write over the existing config
    // in the meta configs and set the report one back to a ref.
    if (jindex >= 0) {
      publishConfigsCopy[jindex] = publishConfig
      reportCopy.publishConfigs[index] = { ref: publishConfig.id }

      return
    }

    // If this is a completely new publish config, add it to the meta configs
    // and the report one to a ref.
    publishConfigsCopy.push(publishConfig)
    reportCopy.publishConfigs[index] = { ref: publishConfig.id }
  })

  return {
    newReport: reportCopy,
    newPublishConfigs: publishConfigsCopy,
  }
}

function buildRealManifest(metaManifest, publishConfigs) {
  const manifest = clone(metaManifest)

  for (let index = 0; index < manifest.reports.length; index += 1) {
    const report = manifest.reports[index],
      { publishConfigs: reportPublishConfigs } = report

    if (!reportPublishConfigs || reportPublishConfigs.length === 0) {
      continue
    }

    const newPublishConfigs = []

    for (let jindex = 0; jindex < reportPublishConfigs.length; jindex += 1) {
      const publishConfig = reportPublishConfigs[jindex]

      if (!publishConfig.ref) {
        newPublishConfigs.push(publishConfig)
        continue
      }

      const newPublishConfig = publishConfigs.find(
        pc => pc.id === publishConfig.ref,
      )

      if (!newPublishConfig) {
        throw new Error(`missing publish config ${publishConfig.ref}`)
      }

      newPublishConfigs.push(clone(newPublishConfig))
    }

    manifest.reports[index].publishConfigs = newPublishConfigs
  }

  return manifest
}

export default function useManifestWriter() {
  const {
      write,
      manifest,
      metadata,
      publishConfigs,
    } = useContext(StorageContext),
    update = useCallback((report, reportIndex = -1) => {
      const manifestCopy = manifest ? clone(manifest) : { reports: [] },
        metadataCopy = copyMetadata(metadata),
        publishConfigsCopy = publishConfigs ? (
          clone(publishConfigs)
        ) : { publishConfigs: [] },
        { newReport, newPublishConfigs } = rebuildPublishConfigs(
          report,
          publishConfigsCopy.publishConfigs
        )

      manifestCopy.reports.splice(
        reportIndex >= 0 ? reportIndex : manifestCopy.reports.length,
        reportIndex >= 0 ? 1 : 0,
        newReport || report,
      )

      if (newPublishConfigs) {
        publishConfigsCopy.publishConfigs = newPublishConfigs
      }

      const realManifest = buildRealManifest(
        manifestCopy,
        newPublishConfigs,
      )

      write(manifestCopy, metadataCopy, publishConfigsCopy, realManifest)
    }, [write, manifest, metadata, publishConfigs]),
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
