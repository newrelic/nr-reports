import {
  useAccountStorageMutation,
} from 'nr1'

export default function useDocumentWriter({
  accountId,
  collection,
  documentId,
}) {
  return useAccountStorageMutation({
    actionType: useAccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
    accountId,
    collection,
    documentId,
  })
}
