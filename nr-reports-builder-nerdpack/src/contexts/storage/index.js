import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  useDataReader,
  useDataWriter,
} from '../../hooks'
import { RouteContext } from '../route'

export const StorageContext = createContext(null)

export default function StorageProvider({ children }) {
  const { params: { accountId }} = useContext(RouteContext),
    [storageState, setStorageState] = useState({
      reading: false,
      readError: null,
      writing: false,
      writeError: null,
      writeFinished: false,
      manifest: null,
      metadata: null,
      publishConfigs: null,
    }),
    updateStorageState = useCallback(
      updates => setStorageState({ ...storageState, ...updates }),
      [storageState, setStorageState]
    ),
    handleWriting = useCallback(() => {
      updateStorageState({ writing: true, writeError: null })
    }, [updateStorageState]),
    handleWriteError = useCallback(err => {
      updateStorageState({ writing: false, writeError: err })
    }, [updateStorageState]),
    handleWriteComplete = useCallback((manifest, metadata, publishConfigs) => {
      updateStorageState({
        writing: false,
        writeError: null,
        writeFinished: true,
        manifest,
        metadata,
        publishConfigs,
      })
    }, [updateStorageState]),
    handleReading = useCallback(() => {
      updateStorageState({ reading: true, readError: null })
    }, [updateStorageState]),
    handleReadError = useCallback(err => {
      updateStorageState({ reading: false, readError: err })
    }, [updateStorageState]),
    handleReadComplete = useCallback((manifest, metadata, publishConfigs) => {
      updateStorageState({
        reading: false,
        readError: null,
        manifest,
        metadata,
        publishConfigs,
      })
    }, [updateStorageState]),
    write = useDataWriter({
      accountId,
      onWriting: handleWriting,
      onError: handleWriteError,
      onComplete: handleWriteComplete,
    }),
    value = useMemo(() => ({
      write,
      ...storageState,
    }), [write, storageState])

  useDataReader({
    accountId,
    onReading: handleReading,
    onError: handleReadError,
    onComplete: handleReadComplete,
  })

  useEffect(() => {
    if (storageState.writeFinished) {
      updateStorageState({ writeFinished: false })
    }
  }, [storageState.writeFinished, updateStorageState])

  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  )
}
