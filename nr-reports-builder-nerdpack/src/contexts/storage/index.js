import {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from 'react'
import {
  useDataReader,
  useDataWriter,
} from '../../hooks'
import { RouteContext } from '../route'

const initialState = {
  reading: false,
  readError: null,
  write:  null,
  writing: false,
  writeError: null,
  writeFinished: false,
  manifest: null,
  metadata: null,
}

function reducer(storageState, action) {
  switch (action.type) {
    case 'readStarted':
      return {
        ...storageState,
        reading: true,
        readError: null,
      }

    case 'readFailed':
      return {
        ...storageState,
        reading: false,
        readError: action.error,
      }

    case 'readFinished':
      return {
        ...storageState,
        reading: false,
        readError: null,
        manifest: action.manifest,
        metadata: action.metadata,
      }

    case 'writeStarted':
      return {
        ...storageState,
        writing: true,
        writeError: null,
      }

    case 'writeFailed':
      return {
        ...storageState,
        writing: false,
        writeError: action.error,
      }

    case 'writeFinished':
      return {
        ...storageState,
        writing: false,
        writeError: null,
        writeFinished: true,
        manifest: action.manifest,
        metadata: action.metadata,
      }

    case 'writeReset':
      return {
        ...storageState,
        writeFinished: false,
      }
  }

  throw new Error(`Invalid state transiation ${action.type} received.`)
}

export const StorageContext = createContext(null)
export const StorageDispatchContext = createContext(null)

export default function StorageProvider({ children }) {
  const { params: { accountId }} = useContext(RouteContext),
    {
      reading,
      error: readError,
      manifest,
      metadata,
    } = useDataReader({ accountId }),
    {
      write,
      writing,
      error: writeError,
      data: writeResult,
      reset,
    } = useDataWriter({ accountId }),
    [state, dispatch] = useReducer(reducer, { ...initialState, write })

  useEffect(() => {
    if (reading && !state.reading) {
      dispatch({ type: 'readStarted' })
      return
    }

    if (state.reading && !reading) {
      if (readError) {
        dispatch({ type: 'readFailed', error: readError })
        return
      }

      dispatch({
        type: 'readFinished',
        manifest,
        metadata,
      })
    }
  }, [state, dispatch, reading, readError, manifest, metadata])

  useEffect(() => {
    if (writing && !state.writing) {
      dispatch({ type: 'writeStarted' })
      return
    }

    if (state.writing && !writing) {
      if (writeError) {
        dispatch({ type: 'writeFailed', error: writeError })
        return
      }

      dispatch({
        type: 'writeFinished',
        manifest: writeResult.manifest,
        metadata: writeResult.metadata,
      })

      reset()
      return
    }

    if (state.writeFinished) {
      dispatch({ type: 'writeReset' })
    }
  }, [state, dispatch, writing, writeError, writeResult, reset])

  return (
    <StorageContext.Provider value={state}>
      <StorageDispatchContext.Provider value={dispatch}>
        {children}
      </StorageDispatchContext.Provider>
    </StorageContext.Provider>
  )
}
