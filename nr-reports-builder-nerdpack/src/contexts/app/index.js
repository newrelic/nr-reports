import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import {
  nerdlet,
  NerdletStateContext,
  PlatformStateContext,
} from 'nr1'
import { UI_CONTENT  } from '../../constants'

function reducer(appState, action) {
  switch (action.type) {
    case 'platformStateChanged':
      return {
        ...appState,
        platformState: action.platformState,
      }

    case 'nerdletStateChanged':
      return {
        ...appState,
        nerdletState: action.nerdletState,
      }
  }
}

export const AppContext = createContext(null)
export const AppDispatchContext = createContext(null)

export default function AppProvider({ children }) {
  const platformState = useContext(PlatformStateContext),
    nerdletState = useContext(NerdletStateContext),
    [appState, dispatch] = useReducer(reducer, {
      platformState,
      nerdletState,
    })

  useMemo(() => {
    nerdlet.setConfig({
      actionControls: false,
      accountPicker: true,
      headerType: nerdlet.HEADER_TYPE.CUSTOM,
      headerTitle: UI_CONTENT.GLOBAL.HEADER_TITLE,
      headerType: nerdlet.HEADER_TYPE.CUSTOM,
      timePicker: false,
    })
  }, [])

  useEffect(() => {
    dispatch({ type: 'platformStateChanged', platformState })
  }, [platformState])

  useEffect(() => {
    dispatch({ type: 'nerdletStateChanged', nerdletState })
  }, [nerdletState])

  return (
    <AppContext.Provider value={appState}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppContext.Provider>
  )
}
