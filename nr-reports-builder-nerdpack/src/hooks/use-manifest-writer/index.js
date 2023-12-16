import { useCallback, useContext } from 'react'
import { StorageContext } from '../../contexts'
import { clone, sortByNumber } from '../../utils'

function copyMetadata(metadata) {
  // Clone the existing metadata or create a new one with the dates zeroed out
  // so that the scheduler will always update the first time it sees this
  // metadata.

  const metadataCopy = metadata ? clone(metadata) : (
    { lastModifiedDate: 0, lastPolledDate: 0 }
  )

  // Update the last modified date to right now.

  metadataCopy.lastModifiedDate = new Date().getTime()

  return metadataCopy
}

// Rebuild the publish configs for a report and the meta publish configs by
// scanning the report for new/updated configs and adding or updating those
// in the meta publish configs and replacing them with refs in the report.

function rebuildPublishConfigs(report, publishConfigs) {
  // Note that the publishConfigs parameter in this context is actually the
  // publishConfigs property of the meta publish configs, i.e.
  // metaPublishConfigs.publishConfigs.

  const { publishConfigs: reportPublishConfigs } = report

  if (!reportPublishConfigs || reportPublishConfigs.length === 0) {
    return { newReport: null, newPublishConfigs: null }
  }

  const newReport = clone(report),
    newPublishConfigs = clone(publishConfigs)

  reportPublishConfigs.forEach((publishConfig, index) => {
    // When an existing publish config is edited from a report, it is saved
    // back to the report but not as a ref. We can tell by checking the config
    // for a ref property.

    // If the publish config has a ref property, it is already a reference, so
    // just verify the reference and return.

    if (publishConfig.ref) {
      const jindex = newPublishConfigs.find(
        pc => pc.id === publishConfig.ref
      )

      if (jindex === -1) {
        throw new Error(`Missing publish config ${publishConfig.ref}`)
      }

      return
    }

    // Otherwise, this is an entirely new publish config or an existing config
    // that has been updated.

    // If this is an update to an existing config, its id property will match
    // one in the meta configs.  If this is the case, update the config in the
    // meta configs and set the report config back to a ref.

    const jindex = newPublishConfigs.findIndex(pc => {
      return pc.id === publishConfig.id
    })

    if (jindex >= 0) {
      newPublishConfigs[jindex] = publishConfig
      newReport.publishConfigs[index] = { ref: publishConfig.id }

      return
    }

    // If this is a completely new publish config, add it to the meta configs
    // and set the report one to a ref.
    newPublishConfigs.push(publishConfig)
    newReport.publishConfigs[index] = { ref: publishConfig.id }
  })

  // Return the new report and the new meta configs.

  return {
    newReport,
    newPublishConfigs,
  }
}

// Rebuild the meta manifest after publish config IDs have been removed.

function rebuildMetaManifest(metaManifest, deletedPublishConfigIds) {
  const newMetaManifest = clone(metaManifest)

  for (let index = 0; index < newMetaManifest.reports.length; index += 1) {
    const report = newMetaManifest.reports[index],
      indices = []

    report.publishConfigs.forEach((pc, index) => {
      if (pc.ref && deletedPublishConfigIds.includes(pc.ref)) {
        indices.push(index)
      }
    })

    indices.sort(sortByNumber)

    for (let jindex = indices.length - 1; jindex >= 0; jindex -= 1) {
      newMetaManifest
        .reports[index]
        .publishConfigs
        .splice(indices[jindex], 1)
    }
  }

  return newMetaManifest
}

// Build the real manifest by making a copy of the meta manifest and replacing
// all publish config references with their actual publish configurations
// stored in the meta publish configs.

function buildRealManifest(metaManifest, publishConfigs) {
  // Note that the publishConfigs parameter in this context is actually the
  // publishConfigs property of the meta publish configs, i.e.
  // metaPublishConfigs.publishConfigs.

  const newMetaManifest = clone(metaManifest)

  for (let index = 0; index < newMetaManifest.reports.length; index += 1) {
    const report = newMetaManifest.reports[index],
      { publishConfigs: reportPublishConfigs } = report

    if (!reportPublishConfigs || reportPublishConfigs.length === 0) {
      continue
    }

    const newPublishConfigs = []

    for (let jindex = 0; jindex < reportPublishConfigs.length; jindex += 1) {
      const publishConfig = reportPublishConfigs[jindex]

      // If the current report publish config has no ref, it was a publish
      // config that was just created or updated. So we just push it on to the
      // new publish configs array.

      if (!publishConfig.ref) {
        newPublishConfigs.push(publishConfig)
        continue
      }

      // Otherwise this report publish config is a reference to an existing
      // meta publish config so find the meta publish config it references.

      const newPublishConfig = publishConfigs.find(
        pc => pc.id === publishConfig.ref,
      )

      // If we didn't find a meta config matching the report config's ref,
      // raise an error.

      if (!newPublishConfig) {
        throw new Error(`Missing publish config ${publishConfig.ref}`)
      }

      // Otherwise push on a copy of the meta config.

      newPublishConfigs.push(clone(newPublishConfig))
    }

    // Now set the reports publish configs to the fully resolved full publish
    // configs.

    newMetaManifest.reports[index].publishConfigs = newPublishConfigs
  }

  return newMetaManifest
}

export default function useManifestWriter() {
  const {
      write,
      manifest: metaManifest,
      metadata,
      publishConfigs: metaPublishConfigs,
    } = useContext(StorageContext),
    update = useCallback((report, reportIndex = -1) => {
      if (
        reportIndex >= 0 &&
        (
          !metaManifest ||reportIndex >= metaManifest.reports.length
        )
       ) {
        throw new Error(`Invalid report index ${reportIndex} found during update`)
      }

      // It is possible when the first report is created that we do not yet
      // have a manifest or publish configs so we create empty ones to start
      // with if not.

      const newMetaManifest = metaManifest ? (
          clone(metaManifest)
        ) : { reports: [] },
        newMetadata = copyMetadata(metadata),
        newMetaPublishConfigs = metaPublishConfigs ? (
          clone(metaPublishConfigs)
        ) : { publishConfigs: [] },
        { newReport, newPublishConfigs } = rebuildPublishConfigs(
          report,
          newMetaPublishConfigs.publishConfigs
        )

      newMetaManifest.reports.splice(
        reportIndex >= 0 ? reportIndex : newMetaManifest.reports.length,
        reportIndex >= 0 ? 1 : 0,
        newReport || report,
      )

      if (newPublishConfigs) {
        newMetaPublishConfigs.publishConfigs = newPublishConfigs
      }

      // Build the real manifest to pickup the new/updated report and replace
      // all publish config references with their actual publish configurations
      // stored in the meta publish configs.

      const realManifest = buildRealManifest(
        newMetaManifest,
        newPublishConfigs,
      )

      write(newMetaManifest, newMetadata, newMetaPublishConfigs, realManifest)
    }, [write, metaManifest, metadata, metaPublishConfigs]),
    updatePublishConfig = useCallback((
      publishConfig,
      publishConfigIndex = -1,
    ) => {
      if (
        publishConfigIndex >= 0 &&
        (
          !metaPublishConfigs ||
          publishConfigIndex >= metaPublishConfigs.publishConfigs.length
        )
      ) {
        throw new Error(`Invalid publish config index ${publishConfigIndex} found during update`)
      }

      // It is possible when a publish configuration is created before anything
      // else that no manifest or publish configs exist yet so we create empty
      // ones to start with if not.

      const newMetaManifest = metaManifest ? (
          clone(metaManifest)
        ) : { reports: [] },
        newMetadata = copyMetadata(metadata),
        newMetaPublishConfigs = metaPublishConfigs ? (
          clone(metaPublishConfigs)
        ) : { publishConfigs: [] }

      newMetaPublishConfigs.publishConfigs.splice(
        publishConfigIndex >= 0 ? publishConfigIndex : newMetaPublishConfigs.publishConfigs.length,
        publishConfigIndex >= 0 ? 1 : 0,
        publishConfig,
      )

      // Build the real manifest to pickup the new/updated publish configuration
      // and replace all publish config references with their actual publish
      // configurations stored in the meta publish configs.

      const realManifest = buildRealManifest(
        newMetaManifest,
        newMetaPublishConfigs.publishConfigs,
      )

      write(newMetaManifest, newMetadata, newMetaPublishConfigs, realManifest)
    }, [write, metaManifest, metadata, metaPublishConfigs]),
    create = useCallback(report => {
      update(report)
    }, [update]),
    createPublishConfig = useCallback(publishConfig => {
      updatePublishConfig(publishConfig)
    }, [updatePublishConfig]),
    del = useCallback(reportIndices => {
      // @TODO Creating empty documents if none are in storage is a lazy way of
      // dealing with a condition that shouldn't happen. I.e. we shouldn't be
      // deleting anything if we don't yet have a manifest or publish configs in
      // storage but it makes this code easier. We will catch it anyway when we
      // validate the report indices and we'll raise an error. But we can
      // likely handle this better.

      const newMetaManifest = metaManifest ? (
          clone(metaManifest)
        ) : { reports: [] },
        newMetadata = copyMetadata(metadata),
        newMetaPublishConfigs = metaPublishConfigs ? (
          clone(metaPublishConfigs)
        ) : { publishConfigs: [] }

      // We sort by index low to high and traverse them in reverse order so that
      // we delete off the list from the back to the front. This way we don't
      // have to adjust the indices after every delete.

      reportIndices.sort(sortByNumber)

      for (let index = reportIndices.length - 1; index >= 0; index -= 1) {
        const reportIndex = reportIndices[index]

        if (reportIndex >= newMetaManifest.reports.length) {
          throw new Error(`Invalid report index ${reportIndex} found during delete`)
        }

        newMetaManifest.reports.splice(reportIndex, 1)
      }

      // Build the real manifest to reflect the deleted report(s) and replace
      // all publish config references with their actual publish configurations
      // stored in the meta publish configs.

      const realManifest = buildRealManifest(
        newMetaManifest,
        newMetaPublishConfigs.publishConfigs,
      )

      write(newMetaManifest, newMetadata, newMetaPublishConfigs, realManifest)
    }, [write, metaManifest, metadata, metaPublishConfigs]),
    deletePublishConfigs = useCallback(publishConfigIndices => {
      // @TODO See comment above.

      const newMetaManifest = metaManifest ? (
          clone(metaManifest)
        ) : { reports: [] },
        newMetadata = copyMetadata(metadata),
        newMetaPublishConfigs = metaPublishConfigs ? (
          clone(metaPublishConfigs)
        ) : { publishConfigs: [] },
        publishConfigIds = []

      // We sort by index low to high and traverse them in reverse order so that
      // we delete off the list from the back to the front. This way we don't
      // have to adjust the indices after every delete.

      publishConfigIndices.sort(sortByNumber)

      for (
        let index = publishConfigIndices.length - 1; index >= 0; index -= 1
      ) {
        const publishConfigIndex = publishConfigIndices[index]

        if (publishConfigIndex >= newMetaPublishConfigs.publishConfigs.length) {
          throw new Error(`Invalid publish config index ${publishConfigIndex} found during delete`)
        }

        // Push the id of the config we are deleting so we can clear all
        // references to it in reports when we rebuild the meta manifest.

        publishConfigIds.push(
          newMetaPublishConfigs.publishConfigs[publishConfigIndex].id
        )

        // Actually remove the config

        newMetaPublishConfigs.publishConfigs.splice(publishConfigIndex, 1)
      }

      // We have to rebuild the manifest so that all references to the configs
      // that were deleted are cleared. This way we don't have any dangling
      // references from reports to non-existent configs. We do this before we
      // build the real manifest so that the real manifest doesn't have the
      // non-existing configs either.

      const newNewMetaManifest = rebuildMetaManifest(
          newMetaManifest,
          publishConfigIds,
        ),
        realManifest = buildRealManifest(
          newNewMetaManifest,
          newMetaPublishConfigs.publishConfigs,
        )

      write(newNewMetaManifest, newMetadata, newMetaPublishConfigs, realManifest)
    }, [write, metaManifest, metadata, metaPublishConfigs])

  return {
    create,
    update,
    del,
    createPublishConfig,
    updatePublishConfig,
    deletePublishConfigs,
  }
}
