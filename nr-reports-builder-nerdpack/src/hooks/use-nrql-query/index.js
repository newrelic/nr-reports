import { useNrqlQuery as useNrqlQuerySdk } from 'nr1'

export default function useDocumentReader({
  accountId,
  query,
 }) {
  const { loading, data, error } = useNrqlQuerySdk({
    accountId,
    query,
  })

  return { loading, data, error }
}
