import React from 'react'
import {
  AppProvider,
  RouteProvider,
  StorageProvider,
} from '../../src/contexts'
import App from '../../src/App'

export default function HomeNerdlet() {
  return (
    <AppProvider>
      <RouteProvider>
        <StorageProvider>
          <App/>
        </StorageProvider>
      </RouteProvider>
    </AppProvider>
  )
}
