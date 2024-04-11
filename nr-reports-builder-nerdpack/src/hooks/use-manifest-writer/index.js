import { useCallback, useContext } from 'react'
import { StorageContext } from '../../contexts'
import {
  clone,
  currentMillis,
  resolveChannel,
  resolvePublishConfig,
  sortByNumber,
} from '../../utils'

function copyMetadata(metadata) {
  // Clone the existing metadata or create a new one with the dates zeroed out
  // so that the scheduler will always update the first time it sees this
  // metadata.

  const metadataCopy = metadata ? clone(metadata) : (
    { lastModifiedDate: 0, lastPolledDate: 0 }
  )

  // Update the last modified date to right now.

  metadataCopy.lastModifiedDate = currentMillis()

  return metadataCopy
}

// Rebuild the channels for a publish config and the meta channels by scanning
// the publish config for new/updated channels and adding or updating those in
// the meta channels and replacing them with refs in the publish config.

// NOTE: This is a very procedural way to do this as it modifies the input
// params aka side-effects. But it's more performant than cloning the publish
// config and channels multiple times (because rebuildPublishConfigs already
// cloned them).

function rebuildChannels(newPublishConfig, newChannels) {
  const { channels: publishConfigChannels } = newPublishConfig,
    updatedChannelIds = []

  if (!publishConfigChannels || publishConfigChannels.length === 0) {
    return null
  }

  publishConfigChannels.forEach((channel, index) => {
    // When an existing channel is edited from a publish config, it is saved
    // back to the publish config but not as a ref. We can tell by checking the
    // channel for a ref property.

    // If the channel has a ref property, it is already a reference, so just
    // verify the reference and return.

    if (channel.ref) {
      const jindex = newChannels.find(
        c => c.id === channel.ref
      )

      if (jindex === -1) {
        throw new Error(`Missing channel ${channel.ref}`)
      }

      return
    }

    // Otherwise, this is an entirely new channel or an existing channel that
    // has been updated.

    // If this is an update to an existing channel, its id property will match
    // one in the meta channels.  If this is the case, update the channel in the
    // meta channels and set the report channel back to a ref. Also record the
    // channel ID that is changing so that all reports that reference it,
    // vis-a-vis publish configurations can have their last modified timestamps
    // properly updated.

    const jindex = newChannels.findIndex(c => {
      return c.id === channel.id
    })

    if (jindex >= 0) {
      newChannels[jindex] = channel
      newPublishConfig.channels[index] = { ref: channel.id }
      updatedChannelIds.push(channel.id)
      return
    }

    // If this is a completely new channel, add it to the meta channels and set
    // the publish config one to a ref.

    newChannels.push(channel)
    newPublishConfig.channels[index] = { ref: channel.id }
  })

  return updatedChannelIds
}

// Rebuild the publish configs for a report and the meta publish configs by
// scanning the report for new/updated configs and adding or updating those
// in the meta publish configs and replacing them with refs in the report.

function rebuildPublishConfigs(report, metaPublishConfigs, metaChannels) {
  const { publishConfigs } = report

  if (!publishConfigs || publishConfigs.length === 0) {
    return null
  }

  const newReport = clone(report),
    newPublishConfigs = clone(metaPublishConfigs.publishConfigs),
    newChannels = clone(metaChannels.channels),
    updatedConfigIds = [],
    updatedChannelIds = []

  publishConfigs.forEach((publishConfig, index) => {
    // When an existing publish config is edited from a report, it is saved
    // back to the report but not as a ref. We can tell by checking the config
    // for a ref property.

    // If the publish config has a ref property, it is already a reference, so
    // just verify the reference and return.

    if (publishConfig.ref) {
      const jindex = newPublishConfigs.find(pc => pc.id === publishConfig.ref)

      if (jindex === -1) {
        throw new Error(`Missing publish config ${publishConfig.ref}`)
      }

      return
    }

    // Otherwise, this is an entirely new publish config or an existing config
    // that has been updated.

    const newPublishConfig = clone(publishConfig)

    // First, rebuild the channels for the publish config. See the note for this
    // function. This is procedural but this way we don't keep rebuilding
    // newChannels. Both the publishConfig and newChannels could be modified as
    // side effects of this call.

    const updChannelIds = rebuildChannels(newPublishConfig, newChannels)

    if (updChannelIds && updChannelIds.length > 0) {
      updatedChannelIds.splice(updatedChannelIds.length, 0, ...updChannelIds)
    }

    // If this is an update to an existing config, its id property will match
    // one in the meta configs.  If this is the case, update the config in the
    // meta configs and set the report config back to a ref.

    const jindex = newPublishConfigs.findIndex(pc => {
      return pc.id === newPublishConfig.id
    })

    if (jindex >= 0) {
      newPublishConfigs[jindex] = newPublishConfig
      newReport.publishConfigs[index] = { ref: newPublishConfig.id }

      // If an existing config was updated while editing the report, it's
      // possible that other reports reference this config and that means that
      // we'll need to later "touch" the timestamps for those reports.
      // Otherwise, the scheduler will not see those reports as having been
      // updated and so the corresponding schedules won't get updated. So here
      // we record the IDs of any publish configs that were updated.

      updatedConfigIds.push(newPublishConfig.id)
      return
    }

    // If this is a completely new publish config, add it to the meta configs
    // and set the report one to a ref.
    newPublishConfigs.push(newPublishConfig)
    newReport.publishConfigs[index] = { ref: newPublishConfig.id }
  })

  // Return the new report and any new publish configs and channels. Also
  // return the ids of any publish configs or channels that have been updated
  // so that reports referencing this items can have their last modified
  // timestamps updated.

  return {
    newReport,
    newPublishConfigs,
    newChannels,
    updatedConfigIds,
    updatedChannelIds,
  }
}

// Update the last modified timestamps on any reports that reference publish
// configurations with ids matching any id in the publishConfigIds array or ids
// of publish configurations with channels with ids matching any id in the
// channelIds array. Do this so that the scheduler sees the reports as having
// been changed and can update appropriately.

function touchReferrerReports(
  newMetaManifest,
  newMetaPublishConfigs,
  publishConfigIds,
  channelIds,
) {
  const now = currentMillis(),
    updatedConfigIds = [ ...publishConfigIds ]

  if (channelIds && channelIds.length > 0) {
    for (
      let index = 0;
      index < newMetaPublishConfigs.publishConfigs.length;
      index += 1
    ) {
      const publishConfig = newMetaPublishConfigs.publishConfigs[index],
        channelIndex = publishConfig.channels.findIndex(
          c => c.ref && channelIds.includes(c.ref)
        )

      if (channelIndex >= 0) {
        updatedConfigIds.push(publishConfig.id)
      }
    }
  }

  for (let index = 0; index < newMetaManifest.reports.length; index += 1) {
    const report = newMetaManifest.reports[index],
      configIndex = report.publishConfigs?.findIndex(
        pc => pc.ref && updatedConfigIds.includes(pc.ref)
      )

    if (configIndex >= 0) {
      newMetaManifest.reports[index].lastModifiedDate = now
    }
  }
}

// Rebuild the meta publish configs after channel IDs have been removed.

function rebuildMetaPublishConfigs(
  newMetaManifest,
  metaPublishConfigs,
  deletedChannelIds,
) {
  const newMetaPublishConfigs = clone(metaPublishConfigs),
    updatedConfigIds = []

  for (
    let index = 0;
    index < newMetaPublishConfigs.publishConfigs.length;
    index += 1
  ) {
    const publishConfig = newMetaPublishConfigs.publishConfigs[index],
      indices = []

    publishConfig.channels.forEach((c, index) => {
      if (c.ref && deletedChannelIds.includes(c.ref)) {
        indices.push(index)
      }
    })

    if (indices.length === 0) {
      continue
    }

    indices.sort(sortByNumber)
    updatedConfigIds.push(publishConfig.id)

    for (let jindex = indices.length - 1; jindex >= 0; jindex -= 1) {
      newMetaPublishConfigs
        .publishConfigs[index]
        .channels
        .splice(indices[jindex], 1)
    }
  }

  if (updatedConfigIds.length > 0) {
    touchReferrerReports(newMetaManifest, newMetaPublishConfigs, updatedConfigIds, [])
  }

  return newMetaPublishConfigs
}

// Rebuild the meta manifest after publish config IDs have been removed.

function rebuildMetaManifest(metaManifest, deletedPublishConfigIds) {
  const now = currentMillis(),
    newMetaManifest = clone(metaManifest)

  for (let index = 0; index < newMetaManifest.reports.length; index += 1) {
    const report = newMetaManifest.reports[index],
      indices = []

    report.publishConfigs.forEach((pc, index) => {
      if (pc.ref && deletedPublishConfigIds.includes(pc.ref)) {
        indices.push(index)
      }
    })

    if (indices.length === 0) {
      continue
    }

    indices.sort(sortByNumber)

    for (let jindex = indices.length - 1; jindex >= 0; jindex -= 1) {
      newMetaManifest.reports[index].publishConfigs.splice(indices[jindex], 1)
    }

    newMetaManifest.reports[index].lastModifiedDate = now
  }

  return newMetaManifest
}

function buildRealPublishConfig(
  publishConfig,
  metaPublishConfigs,
  metaChannels
) {
  const newPublishConfig = clone(resolvePublishConfig(
      metaPublishConfigs,
      publishConfig,
    )),
    { channels: publishConfigChannels } = newPublishConfig

  // Reset the channels in the publish config

  newPublishConfig.channels = publishConfigChannels ? (
    publishConfigChannels.map(c => (
      clone(resolveChannel(metaChannels, c))
    ))
  ) : []

  return newPublishConfig
}

// Build the real manifest by making a copy of the meta manifest and replacing
// all publish config and channel references with their actual definitions
// stored in the meta publish configs and channels.

function buildRealManifest(metaManifest, metaPublishConfigs, metaChannels) {
  // Note that the publishConfigs parameter in this context is actually the
  // publishConfigs property of the meta publish configs, i.e.
  // metaPublishConfigs.publishConfigs. Likewise, channels is really
  // metaChannels.channels.

  const newMetaManifest = clone(metaManifest)

  for (let index = 0; index < newMetaManifest.reports.length; index += 1) {
    const report = newMetaManifest.reports[index],
      { publishConfigs: reportPublishConfigs } = report

    // Reset the publish configs in the report

    newMetaManifest.reports[index].publishConfigs = reportPublishConfigs ? (
      reportPublishConfigs.map(pc => (
        buildRealPublishConfig(pc, metaPublishConfigs, metaChannels)
      ))
    ) : []
  }

  return newMetaManifest
}

export default function useManifestWriter() {
  const {
      write,
      manifest: metaManifest,
      metadata,
      publishConfigs: metaPublishConfigs,
      channels: metaChannels,
    } = useContext(StorageContext),
    update = useCallback((report, reportIndex = -1) => {
      if (
        reportIndex >= 0 &&
        (
          !metaManifest ||
          reportIndex >= metaManifest.reports.length
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
        newMetaChannels = metaChannels ? (
          clone(metaChannels)
        ) : { channels: [] },
        rebuildResult = rebuildPublishConfigs(
          report,
          newMetaPublishConfigs,
          newMetaChannels,
        )

      newMetaManifest.reports.splice(
        reportIndex >= 0 ? reportIndex : newMetaManifest.reports.length,
        reportIndex >= 0 ? 1 : 0,
        rebuildResult?.newReport || report,
      )

      if (rebuildResult) {
        const {
          newPublishConfigs,
          newChannels,
          updatedConfigIds,
          updatedChannelIds,
        } = rebuildResult

        newMetaPublishConfigs.publishConfigs = newPublishConfigs
        newMetaChannels.channels = newChannels

        if (updatedConfigIds.length > 0 || updatedChannelIds.length > 0) {
          touchReferrerReports(
            newMetaManifest,
            newMetaPublishConfigs,
            updatedConfigIds,
            updatedChannelIds,
          )
        }
      }

      // Build the real manifest to pickup the new/updated report and replace
      // all publish config references with their actual publish configurations
      // stored in the meta publish configs.

      const realManifest = buildRealManifest(
        newMetaManifest,
        newMetaPublishConfigs,
        newMetaChannels,
      )

      write(newMetaManifest, newMetadata, newMetaPublishConfigs, newMetaChannels, realManifest)
    }, [write, metaManifest, metadata, metaPublishConfigs, metaChannels]),
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
        ) : { publishConfigs: [] },
        newMetaChannels = metaChannels ? (
          clone(metaChannels)
        ) : { channels: [] },
        newPublishConfig = clone(publishConfig),
        updatedChannelIds = rebuildChannels(newPublishConfig, newMetaChannels.channels)

      // Insert the new publish config
      newMetaPublishConfigs.publishConfigs.splice(
        publishConfigIndex >= 0 ? publishConfigIndex : newMetaPublishConfigs.publishConfigs.length,
        publishConfigIndex >= 0 ? 1 : 0,
        newPublishConfig,
      )

      // Update the last modified timestamps on any reports that reference this
      // publish configuration so that the scheduler sees the reports as having
      // been changed and can update appropriately.

      if (publishConfigIndex >= 0 || (updatedChannelIds && updatedChannelIds.length > 0)) {
        touchReferrerReports(newMetaManifest, newMetaPublishConfigs, [newPublishConfig.id], updatedChannelIds)
      }

      // Build the real manifest to pickup the new/updated publish configuration
      // and replace all publish config references with their actual publish
      // configurations stored in the meta publish configs.

      const realManifest = buildRealManifest(
        newMetaManifest,
        newMetaPublishConfigs,
        newMetaChannels,
      )

      write(newMetaManifest, newMetadata, newMetaPublishConfigs, newMetaChannels, realManifest)
    }, [write, metaManifest, metadata, metaPublishConfigs, metaChannels]),
    updateChannel = useCallback((
      channel,
      channelIndex = -1,
    ) => {
      if (
        channelIndex >= 0 &&
        (
          !metaChannels ||
          channelIndex >= metaChannels.channels.length
        )
      ) {
        throw new Error(`Invalid channel index ${channelIndex} found during update`)
      }

      // It is possible when a channel is created before anything
      // else that no manifest or publish configs or channels exist yet so we
      // create empty ones to start with if not.

      const newMetaManifest = metaManifest ? (
          clone(metaManifest)
        ) : { reports: [] },
        newMetadata = copyMetadata(metadata),
        newMetaPublishConfigs = metaPublishConfigs ? (
          clone(metaPublishConfigs)
        ) : { publishConfigs: [] },
        newMetaChannels = metaChannels ? (
          clone(metaChannels)
        ) : { channels: [] },
        updatedConfigIds = []

      newMetaChannels.channels.splice(
        channelIndex >= 0 ? channelIndex : newMetaChannels.channels.length,
        channelIndex >= 0 ? 1 : 0,
        channel,
      )

      // If this is an update to an existing channel, collect the IDs of any
      // publish configs that reference this channel and "touch" the reports
      // that reference those publish configs.

      if (channelIndex >= 0) {
        touchReferrerReports(newMetaManifest, newMetaPublishConfigs, [], [channel.id])
      }

      // Build the real manifest to pickup the new/updated channels
      // and replace all references to publish configurations or channels
      // to their actual definitions stored in the metadata

      const realManifest = buildRealManifest(
        newMetaManifest,
        newMetaPublishConfigs,
        newMetaChannels,
      )

      write(
        newMetaManifest,
        newMetadata,
        newMetaPublishConfigs,
        newMetaChannels,
        realManifest,
      )
    }, [write, metaManifest, metadata, metaPublishConfigs, metaChannels]),
    create = useCallback(report => {
      update(report)
    }, [update]),
    createPublishConfig = useCallback(publishConfig => {
      updatePublishConfig(publishConfig)
    }, [updatePublishConfig]),
    createChannel = useCallback(channel => {
      updateChannel(channel)
    }, [updateChannel]),
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
        ) : { publishConfigs: [] },
        newMetaChannels = metaChannels ? (
          clone(metaChannels)
        ) : { channels: [] }

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
        newMetaPublishConfigs,
        newMetaChannels,
      )

      write(newMetaManifest, newMetadata, newMetaPublishConfigs, newMetaChannels, realManifest)
    }, [write, metaManifest, metadata, metaPublishConfigs, metaChannels]),
    deletePublishConfigs = useCallback(publishConfigIndices => {
      // @TODO See comment above.

      const newMetaManifest = metaManifest ? (
          clone(metaManifest)
        ) : { reports: [] },
        newMetadata = copyMetadata(metadata),
        newMetaPublishConfigs = metaPublishConfigs ? (
          clone(metaPublishConfigs)
        ) : { publishConfigs: [] },
        newMetaChannels = metaChannels ? (
          clone(metaChannels)
        ) : { channels: [] },
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
          newMetaPublishConfigs,
          newMetaChannels,
        )

      write(newNewMetaManifest, newMetadata, newMetaPublishConfigs, newMetaChannels, realManifest)
    }, [write, metaManifest, metadata, metaPublishConfigs, metaChannels]),
    deleteChannels = useCallback(channelIndices => {
      // @TODO See comment above.

      const newMetaManifest = metaManifest ? (
          clone(metaManifest)
        ) : { reports: [] },
        newMetadata = copyMetadata(metadata),
        newMetaPublishConfigs = metaPublishConfigs ? (
          clone(metaPublishConfigs)
        ) : { publishConfigs: [] },
        newMetaChannels = metaChannels ? (
          clone(metaChannels)
        ) : { channels: [] },
        channelIds = []

      // We sort by index low to high and traverse them in reverse order so that
      // we delete off the list from the back to the front. This way we don't
      // have to adjust the indices after every delete.

      channelIndices.sort(sortByNumber)

      for (
        let index = channelIndices.length - 1; index >= 0; index -= 1
      ) {
        const channelIndex = channelIndices[index]

        if (channelIndex >= newMetaChannels.channels.length) {
          throw new Error(`Invalid channel index ${channelIndex} found during delete`)
        }

        // Push the id of the channel we are deleting so we can clear all
        // references to it in publish configs when we rebuild the meta
        // manifest.

        channelIds.push(
          newMetaChannels.channels[channelIndex].id
        )

        // Actually remove the channel

        newMetaChannels.channels.splice(channelIndex, 1)
      }

      // We have to rebuild the meta publish configs so that all references to
      // the channels that were deleted are cleared. This way we don't have any
      // dangling references from publish configs to non-existent channels. We
      // do this before we build the real manifest so that the real manifest
      // doesn't have the non-existing channels either.

      const newNewMetaPublishConfigs = rebuildMetaPublishConfigs(
          newMetaManifest,
          newMetaPublishConfigs,
          channelIds,
        ),
        realManifest = buildRealManifest(
          newMetaManifest,
          newNewMetaPublishConfigs,
          newMetaChannels,
        )

      write(newMetaManifest, newMetadata, newNewMetaPublishConfigs, newMetaChannels, realManifest)
    }, [write, metaManifest, metadata, metaPublishConfigs, metaChannels])


  return {
    create,
    update,
    del,
    createPublishConfig,
    updatePublishConfig,
    deletePublishConfigs,
    createChannel,
    updateChannel,
    deleteChannels,
  }
}
