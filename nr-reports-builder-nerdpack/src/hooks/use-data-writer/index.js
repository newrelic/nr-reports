import { useCallback, useEffect, useMemo, useState } from 'react'
import useDocumentWriter from '../use-document-writer'

export default function useDataWriter({
  accountId,
  onWriting,
  onError,
  onComplete,
}) {
  const [{ loading, called, done }, setState] = useState({
      loading: false,
      called: false,
      done: false
    }),
    updateState = useCallback(
      (l, c, d) => { setState({ loading: l, called: c, done: d }) },
      [setState],
    ),
    manifestWriter = useDocumentWriter({
      accountId,
      collection: 'metadata',
      documentId: 'manifest.json',
    }),
    metadataWriter = useDocumentWriter({
      accountId,
      collection: 'metadata',
      documentId: 'metadata.json',
    }),
    publishConfigsWriter = useDocumentWriter({
      accountId,
      collection: 'metadata',
      documentId: 'publish-configs.json',
    }),
    realManifestWriter = useDocumentWriter({
      accountId,
      collection: 'manifests',
      documentId: 'manifest.json',
    }),
    writers = useMemo(() => ([
      manifestWriter,
      metadataWriter,
      publishConfigsWriter,
      realManifestWriter,
    ]), [
      manifestWriter,
      metadataWriter,
      publishConfigsWriter,
      realManifestWriter,
    ]),
    write = useCallback((manifest, metadata, publishConfigs, realManifest) => {
      manifestWriter[0]({ document: manifest })
      metadataWriter[0]({ document: metadata })
      publishConfigsWriter[0]({ document: publishConfigs })
      realManifestWriter[0]({ document: realManifest })
      updateState(true, true, false)
      onWriting()
    }, [
      updateState,
      manifestWriter,
      metadataWriter,
      publishConfigsWriter,
      realManifestWriter,
      onWriting,
    ]),
    reset = useCallback(() => {
      writers.forEach(w => w[1].reset())
    }, [writers])

  useEffect(() => {
    if (done || !called) {
      return
    }

    const w = writers.find(w => w.error)

    if (w) {
      reset()
      updateState(false, false, true)
      onError(w.error)
      return
    }

    const l = writers.find(w => w[1].loading)

    if (!l) {
      reset()
      updateState(false, false, true)
      onComplete(
        writers[0][1].data.nerdStorageWriteDocument,
        writers[1][1].data.nerdStorageWriteDocument,
        writers[2][1].data.nerdStorageWriteDocument,
        writers[3][1].data.nerdStorageWriteDocument,
      )
    }
  }, [done, called, writers, updateState, reset, onError, onComplete])

  return write
}
