import { useContext, useMemo } from 'react'
import {
  Layout,
  LayoutItem,
} from 'nr1'
import {
  BusyView,
  ErrorView,
  HomeScreen,
  EditReportScreen,
  EditPublishConfigScreen,
  EditChannelScreen,
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

      case ROUTES.EDIT_PUBLISH_CONFIG:
        return (
          <EditPublishConfigScreen />
        )

      case ROUTES.EDIT_CHANNEL:
        return (
          <EditChannelScreen />
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
    <div className="report-builder">
      <Layout className="report-builder-container">
        <LayoutItem>
          {View}
        </LayoutItem>
      </Layout>
    </div>
  )
}
