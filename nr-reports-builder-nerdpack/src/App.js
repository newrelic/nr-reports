import { useCallback, useContext, useMemo } from 'react'
import {
  Layout,
  LayoutItem,
  nerdlet,
} from 'nr1'
import {
  BusyView,
  ErrorView,
  HomeScreen,
  EditReportScreen,
} from './components'
import {
  RouteContext,
  StorageContext,
} from './contexts'
import {
  UI_CONTENT,
  ROUTES,
} from './constants'

export default function App() {
  const route = useContext(RouteContext),
    {
      reading,
      readError,
    } = useContext(StorageContext)

  const View = useMemo(() => {
    if (reading) {
      return (
        <BusyView
          heading={UI_CONTENT.GLOBAL.BUSY.HEADING}
          message={UI_CONTENT.GLOBAL.BUSY.DESCRIPTION}
        />
      )
    }

    if (readError) {
      return (
        <ErrorView
          heading={UI_CONTENT.ERRORS.READ_FAILED.HEADING}
          description={UI_CONTENT.ERRORS.READ_FAILED.DESCRIPTION}
          error={readError}
        />
      )
    }

    const { path } = route

    switch (path) {
      case ROUTES.HOME:
        return (
          <HomeScreen />
        )

      case ROUTES.EDIT_REPORT:
        return (
          <EditReportScreen />
        )
    }

    return (
      <ErrorView
        heading={UI_CONTENT.ERRORS.UNKNOWN_ROUTE.HEADING}
        description={UI_CONTENT.ERRORS.UNKNOWN_ROUTE.DESCRIPTION}
      />
    )
  }, [reading, readError, route ])

  return (
    <Layout className='report-builder'>
      <LayoutItem>
        {View}
      </LayoutItem>
    </Layout>
  )
}
