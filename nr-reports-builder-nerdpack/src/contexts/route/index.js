import { createContext, useCallback, useReducer } from 'react'
import { ROUTES } from '../../constants'

const initialRoute = {
  path: ROUTES.HOME,
  params: {
    accountId: 0,
    selectedReportIndex: -1,
  },
}

function reducer(routeState, action) {
  switch (action.type) {
    case 'navigate':
      return {
        path: action.path,
        params: { ...routeState.params, ...action.params },
      }
  }
}

export const RouteContext = createContext(null)
export const RouteDispatchContext = createContext(null)

export default function RouteProvider({ accountId, children }) {
  const [route, dispatch] = useReducer(reducer, {
      ...initialRoute,
      params: { ...initialRoute.params, accountId },
    }),
    navigate = useCallback((path, params = {}) => {
      dispatch({
        type: 'navigate',
        path,
        params
      })
    }, [dispatch])

  return (
    <RouteContext.Provider value={route}>
      <RouteDispatchContext.Provider value={navigate}>
        {children}
      </RouteDispatchContext.Provider>
    </RouteContext.Provider>
  )
}
