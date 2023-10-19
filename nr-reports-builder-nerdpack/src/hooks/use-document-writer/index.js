import {
  useAccountStorageMutation,
} from 'nr1'

export default function useDocumentWriter({
  accountId,
  collectionId,
  documentId,
  document,
}) {
  const [write, { loading, data, error, called, reset }] = useAccountStorageMutation({
      actionType: useAccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      accountId,
      collection: collectionId,
      documentId,
      document,
    })

  return { write, loading, data, error, called, reset }
}
