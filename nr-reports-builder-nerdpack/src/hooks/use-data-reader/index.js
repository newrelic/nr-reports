import { useCallback, useEffect, useMemo, useState } from 'react'
import useDocumentReader from '../use-document-reader'

export default function useDataReader({
  accountId,
  onReading,
  onError,
  onComplete,
}) {
  const [{ loading, done, accountId: oldAccountId }, setState] = useState({
      loading: false,
      done: false,
      accountId: accountId,
    }),
    updateState = useCallback(
      (l, d, a) => {
        setState({
          loading: l,
          done: d,
          accountId: a || oldAccountId
        })
      },
      [setState, oldAccountId],
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
    if (loading) {
      return
    }

    if (oldAccountId !== accountId) {
      updateState(true, false, accountId)
      onReading()
    }
  }, [oldAccountId, accountId, updateState, onReading])

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
