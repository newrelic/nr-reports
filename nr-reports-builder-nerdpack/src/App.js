import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
  RouteDispatchContext,
  StorageContext,
} from './contexts'
import {
  UI_CONTENT,
  ROUTES,
} from './constants'

export default function App({ accountId }) {
  const navigate = useContext(RouteDispatchContext),
    route = useContext(RouteContext),
    {
      reading,
      readError,
    } = useContext(StorageContext),
    handleCreateReport = useCallback(() => {
      navigate(ROUTES.EDIT_REPORT, { selectedReportIndex: -1 })
    }, [navigate])

  useMemo(() => {
    nerdlet.setConfig({
      actionControls: false,
      accountPicker: false,
      headerType: nerdlet.HEADER_TYPE.CUSTOM,
      headerTitle: UI_CONTENT.GLOBAL.HEADER_TITLE,
      headerType: nerdlet.HEADER_TYPE.CUSTOM,
      timePicker: false,
    })
  }, [])

  const View = useMemo(() => {
    if (reading) {
      return (
        <BusyView
          heading={UI_CONTENT.GLOBAL.BUSY.HEADING}
          message={UI_CONTENT.GLOBAL.BUSY.DESCRIPTION}
        />
      )
    }

    const {
      path,
      params: {
        accountId,
        selectedReportIndex,
      },
    } = route

    if (readError) {
      return (
        <ErrorView
          heading={UI_CONTENT.ERRORS.READ_FAILED.HEADING}
          description={UI_CONTENT.ERRORS.READ_FAILED.DESCRIPTION}
          error={readError}
        />
      )
    }

    switch (path) {
      case ROUTES.HOME:
        return (
          <HomeScreen
            onCreateReport={handleCreateReport}
          />
        )

      case ROUTES.EDIT_REPORT:
        return (
          <EditReportScreen
            accountId={accountId}
            selectedReportIndex={selectedReportIndex}
          />
        )
    }

    return (
      <ErrorView
        heading={UI_CONTENT.ERRORS.UNKNOWN_ROUTE.HEADING}
        description={UI_CONTENT.ERRORS.UNKNOWN_ROUTE.DESCRIPTION}
      />
    )
  }, [reading, readError, route, handleCreateReport])

  return (
    <Layout className='report-builder'>
      <LayoutItem>
        {View}
      </LayoutItem>
    </Layout>
  )
}
