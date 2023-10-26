import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react'
import { AppContext } from '../app'
import { ROUTES } from '../../constants'

const initialRoute = {
  path: ROUTES.HOME,
  params: {
    accountId: 0,
    selectedReportIndex: -1,
  },
}

function reducer(routeState, action) {
  //console.log(JSON.stringify(action, null, 2))
  switch (action.type) {
    case 'accountIdChanged':
      return {
        path: routeState.path,
        params: { ...routeState.params, accountId: action.accountId },
      }

    case 'navigate':
      return {
        path: action.path,
        params: { ...routeState.params, ...action.params },
      }

    case 'home':
      const { params: { accountId } } = routeState

      return {
        path: ROUTES.HOME,
        params: {
          accountId,
          selectedReportIndex: -1,
          ...action.params,
        },
      }
  }
}

export const RouteContext = createContext(null)
export const RouteDispatchContext = createContext(null)

export default function RouteProvider({ children }) {
  const { platformState } = useContext(AppContext),
    [route, dispatch] = useReducer(reducer, {
      ...initialRoute,
      params: {
        ...initialRoute.params,
        accountId: platformState.accountId },
    }),
    navigate = useCallback((path, params = {}) => {
      dispatch({
        type: 'navigate',
        path,
        params
      })
    }, [dispatch]),
    home = useCallback((params = {}) => {
      dispatch({
        type: 'home',
        params,
      })
    })

  useEffect(() => {
    dispatch({ type: 'accountIdChanged', accountId: platformState.accountId })
  }, [platformState])

  return (
    <RouteContext.Provider value={route}>
      <RouteDispatchContext.Provider value={{ navigate, home }}>
        {children}
      </RouteDispatchContext.Provider>
    </RouteContext.Provider>
  )
}
