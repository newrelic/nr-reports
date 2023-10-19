import { useAccountStorageQuery } from 'nr1'

export default function useDocumentReader({
  accountId,
  collectionId,
  documentId,
 }) {
  const { loading, data, error } = useAccountStorageQuery({
    accountId,
    collection: collectionId,
    documentId: documentId,
  })

  return { loading, data, error }
}
