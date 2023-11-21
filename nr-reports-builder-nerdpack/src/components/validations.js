import { z } from 'zod'
import { parse } from '../cron'
import { SYMBOLS } from '../constants'

const emailListRe = /^(?:[a-zA-Z0-9_!#$%&'*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+)(?:\n[a-zA-Z0-9_!#$%&'*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+)*$/ui

export const nameNotEmpty = (() => {
  const schema = z.string().min(1)

  return formState => {
    const result = schema.safeParse(formState.name)
    return result.success ? null : 'A name is required'
  }
})()

export const reportTypeIsValid = (() => {
  const schema = z.enum(["dashboard", "query"])

  return formState => {
    const result = schema.safeParse(formState.type)
    return result.success ? null : `${formState.type} is not a valid report type`
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
    return result.success ? null : 'At least one and at most 5 account IDs required'
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

export const channelTypeIsValid = (() => {
  const schema = z.enum(["email", "slack"])

  return formState => {
    const result = schema.safeParse(formState.type)
    return result.success ? null : `${formState.type} is not a valid channel type`
  }
})()

export const emailSubjectNotEmpty = (() => {
  const schema = z.string().min(1)

  return formState => {
    const result = schema.safeParse(formState.emailSubject)
    return result.success ? null : 'A subject is required'
  }
})()

export const emailFormatIsValid = (() => {
  const schema = z.enum(["html", "text"])

  return formState => {
    const result = schema.safeParse(formState.emailFormat)
    return result.success ? null : `${formState.emailFormat} is not a valid email format`
  }
})()

export const emailQueryDeliveryMethodIsValid = (() => {
  const schema = z.enum([
    SYMBOLS.EMAIL_CHANNEL_FIELDS.ATTACH_OUTPUT,
    SYMBOLS.EMAIL_CHANNEL_FIELDS.PASS_THROUGH,
  ])

  return formState => {
    const result = schema.safeParse(formState.emailQueryDeliveryMethod)
    return result.success ? null : `${formState.emailQueryDeliveryMethod} is not a valid query delivery method`
  }
})()

export const emailToNotEmptyValidEmails = (() => {
  const schema = z.string().regex(emailListRe)

  return formState => {
    const result = schema.safeParse(formState.emailTo)
    return result.success ? null : 'One or more valid email addresses are required. Separate multiple email addresses with a new line.'
  }
})()

export const emailCcValidEmails = (() => {
  const schema = z.string().regex(emailListRe)

  return formState => {
    if (formState.emailCc.length > 0) {
      const result = schema.safeParse(formState.emailCc)
      return result.success ? null : 'Only valid email addresses are allowed. Separate multiple email addresses with a new line.'
    }

    return null;
  }
})()

export const slackWebhookUrlNotEmptyIsUrl = (() => {
  const schema = z.string().url()

  return formState => {
    if (formState.type !== 'slack') {
      return null
    }

    const result = schema.safeParse(formState.slackWebhookUrl)
    return result.success ? null : 'A valid URL is required'
  }
})()

export const cronExprIsValid = (() => {
  return formState => {
    if (formState.mode !== 'manual') {
      return null
    }

    try {
      parse(formState.expr)
    } catch (err) {
      return 'A valid CRON expression is required'
    }

    return null
  }
})()
