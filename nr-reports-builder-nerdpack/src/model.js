import { v4 as uuidv4 } from 'uuid'
import { generateRandomString } from './utils'

export function newReport() {
  return {
    id: uuidv4(),
    name: '',
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
    schedule: '',
    channels: [],
  }
}

export function newPublishConfigMetadata() {
  return {}
}
