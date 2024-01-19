import { v4 as uuidv4 } from 'uuid'
import { generateRandomString } from './utils'
import { SYMBOLS } from './constants'

export function newReport() {
  return {
    id: uuidv4(),
    name: '',
    enabled: true,
    lastModifiedDate: 0,
    dashboards: [],
    publishConfigs: [],
    metadata: {}
  }
}

export function newReportMetadata() {
  return {}
}

export function newPublishConfig() {
  return {
    id: generateRandomString(20),
    name: '',
    enabled: true,
    schedule: '',
    channels: [],
    metadata: {},
  }
}

export function newPublishConfigMetadata() {
  return {}
}

export function newChannel() {
  return {
    id: generateRandomString(20),
    name: '',
    type: SYMBOLS.CHANNEL_TYPES.EMAIL,
    emailFormat: SYMBOLS.EMAIL_FORMATS.HTML,
    emailDeliveryMethod: SYMBOLS.EMAIL_CHANNEL_FIELDS.ATTACH_OUTPUT,
    emailSubject: '',
    emailTo: '',
    emailCc: '',
    emailTemplate: '',
  }
}

export function newChannelMetadata() {
  return {}
}
