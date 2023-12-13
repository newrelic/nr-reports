import { v4 as uuidv4 } from 'uuid'
import { generateRandomString } from './utils'

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
