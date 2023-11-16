import { z } from 'zod'

export const nameNotEmpty = (() => {
  const schema = z.string().min(1)

  return formState => {
    const result = schema.safeParse(formState.name)
    return result.success ? null : 'A report name is required'
  }
})()

export const typeIsValid = (() => {
  const schema = z.enum(["dashboard", "query"])

  return formState => {
    const result = schema.safeParse(formState.type)
    return result.success ? null : `${update.type} is not a valid report type`
  }
})()

export const accountIdsNotEmptyValidNumbers = (() => {
  const schema = z.array(z.object({
    value: z.number()
  })).min(1).max(5)

  return formState => {
    if (formState.type !== 'query') {
      return null
    }

    const result = schema.safeParse(formState.accountIds)
    return result.success ? null : `At least one and at most 5 account IDs required`
  }
})()

export const queryNotEmpty = (() => {
  const schema = z.string().min(1)

  return formState => {
    if (formState.type !== 'query') {
      return null
    }

    const result = schema.safeParse(formState.query)
    return result.success ? null : 'A query is required'
  }
})()
