import { useCallback, useEffect, useMemo, useState } from 'react'
import useDocumentReader from '../use-document-reader'

export default function useDataReader({
  accountId,
  onReading,
  onError,
  onComplete,
}) {
  const [{ loading, done }, setState] = useState({
      loading: false,
      done: false
    }),
    updateState = useCallback(
      (l, d) => { setState({ loading: l, done: d }) },
      [setState],
    ),
    manifestReader = useDocumentReader({
      accountId,
      collection: 'metadata',
      documentId: 'manifest.json',
    }),
    metadataReader = useDocumentReader({
      accountId,
      collection: 'metadata',
      documentId: 'metadata.json',
    }),
    publishConfigsReader = useDocumentReader({
      accountId,
      collection: 'metadata',
      documentId: 'publish-configs.json',
    }),
    channelsReader = useDocumentReader({
      accountId,
      collection: 'metadata',
      documentId: 'channels.json',
    }),
    readers = useMemo(() => ([
      manifestReader,
      metadataReader,
      publishConfigsReader,
      channelsReader,
    ]), [manifestReader, metadataReader, publishConfigsReader, channelsReader])

  useEffect(() => {
    if (done) {
      return
    }

    if (!loading) {
      updateState(true, false)
      onReading()
      return
    }

    const r = readers.find(r => r.error)

    if (r) {
      updateState(false, true)
      onError(r.error)
      return
    }

    const l = readers.find(r => r.loading)

    if (!l) {
      updateState(false, true)
      onComplete(readers[0].data, readers[1].data, readers[2].data, readers[3].data)
    }
  }, [done, loading, updateState, onReading, readers, onError, onComplete])
}
