import { useCallback, useEffect, useState } from 'react'
import useDocumentWriter from '../use-document-writer'

export default function useDataWriter({ accountId }) {
  const [
      {
        writing,
        manifest,
        metadata,
      },
      setData
    ] = useState({
      writing: false,
      manifest: null,
      metadata: null,
      error: null,
    }),
    {
      write: writeManifest,
      loading: writingManifest,
      data: writeManifestResult,
      error: writeManifestError,
      called: writeManifestCalled,
      reset: resetManifestWriter,
    } = useDocumentWriter({
      accountId,
      collectionId: 'manifests',
      documentId: 'manifest.json',
      document: manifest,
    }),
    {
      write: writeMetadata,
      loading: writingMetadata,
      data: writeMetadataResult,
      error: writeMetadataError,
      called: writeMetadataCalled,
      reset: resetMetadataWriter,
    } = useDocumentWriter({
      accountId,
      collectionId: 'metadata',
      documentId: 'metadata.json',
      document: metadata,
    }),
    write = useCallback((manifest, metadata) => {
      setData({ writing: true, error: null, manifest, metadata })
    }),
    reset = useCallback(() => {
      resetManifestWriter()
      resetMetadataWriter()
    }, [])

  useEffect(() => {
    if (writing) {
      if (!writingManifest && !writingMetadata) {
        if (!writeManifestCalled) {
          writeManifest(manifest)
        } else if (writeManifestError || !writeManifestResult.nerdStorageWriteDocument) {
          setData({
            writing: false,
            manifest: null,
            metadata: null,
            error: writeManifestError || new Error('Received empty write result')
          })
        } else if (!writeMetadataCalled) {
          writeMetadata(metadata)
        } else if (writeMetadataError || !writeMetadataResult.nerdStorageWriteDocument) {
          setData({
            writing: false,
            manifest: null,
            metadata: null,
            error: writeManifestError || new Error('Received empty write result')
          })
        } else {
          setData({
            writing: false,
            manifest: writeManifestResult.nerdStorageWriteDocument,
            metadata: writeMetadataResult.nerdStorageWriteDocument,
            error: writeManifestError || new Error('Received empty write result'),
          })
        }
      }
    }
  }, [
    writing,
    writeManifest,
    writeMetadata,
    writingManifest,
    writeManifestCalled,
    writeManifestError,
    writeManifestResult,
    writingMetadata,
    writeMetadataCalled,
    writeMetadataError,
    writeMetadataResult,
    setData,
  ])

  let writeResult = null

  if (
    writeManifestCalled && !writeManifestError &&
    writeMetadataCalled && !writeMetadataError
  ) {
    writeResult = {
      manifest: writeManifestResult.nerdStorageWriteDocument,
      metadata: writeMetadataResult.nerdStorageWriteDocument
    }
  }

  return {
    write,
    writing,
    called: writeManifestCalled,
    error: writeManifestError || writeMetadataError,
    data: writeResult,
    reset,
  }
}
