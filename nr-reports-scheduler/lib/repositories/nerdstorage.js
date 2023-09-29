'use strict'

const {
  createLogger,
  CORE_CONSTANTS,
} = require('nr-reports-core')

const logger = createLogger('nerdstorage'),
  {
    MANIFESTS_COLLECTION_NAME,
  } = CORE_CONSTANTS

class NerdstorageRepository {
  constructor(nerdstorage) {
    this.nerdstorage = nerdstorage
  }

  async getMetadata() {
    logger.trace('Loading metadata from nerdstorage.')

    const doc = await this.nerdstorage.readDocument(
      'metadata',
      'metadata.json',
    )

    if (!doc) {
      throw new Error('Document with ID metadata.json does not exist in nerdstorage!')
    }

    return doc
  }

  async updateMetadata(metadata) {
    logger.trace('Updating metadata from nerdstorage.')

    await this.nerdstorage.writeDocument(
      'metadata',
      'metadata.json',
      metadata,
    )
  }

  async getManifest(manifestFile) {
    logger.trace(`Loading manifest ${manifestFile} from nerdstorage.`)

    const doc = await this.nerdstorage.readDocument(
      MANIFESTS_COLLECTION_NAME,
      manifestFile,
    )

    if (!doc) {
      throw new Error(`Document with ID ${manifestFile} does not exist in nerdstorage!`)
    }

    return doc
  }
}

module.exports = {
  NerdstorageRepository,
}
