import { useAccountStorageQuery } from 'nr1'

export default function useDocumentReader({
  accountId,
  collection,
  documentId,
}) {
  return useAccountStorageQuery({
    accountId,
    collection,
    documentId,
  })
}
