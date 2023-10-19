import useDocumentReader from '../use-document-reader'

export default function useDataReader({ accountId }) {
  const {
      loading: manifestLoading,
      data: manifest,
      error: manifestError,
    } = useDocumentReader({
      accountId,
      collectionId: 'manifests',
      documentId: 'manifest.json',
    }),
    {
      loading: metadataLoading,
      data: metadata,
      error: metadataError,
    } = useDocumentReader({
      accountId,
      collectionId: 'metadata',
      documentId: 'metadata.json',
    })

  return {
    reading: manifestLoading || metadataLoading,
    error: manifestError || metadataError,
    manifest,
    metadata,
  }
}
