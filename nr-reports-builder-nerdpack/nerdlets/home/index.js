import React from 'react'
import {
  RouteProvider,
  StorageProvider,
} from '../../src/contexts'
import App from '../../src/App'

export default function HomeNerdlet() {
  return (
    <RouteProvider accountId={2267580}>
      <StorageProvider>
        <App/>
      </StorageProvider>
    </RouteProvider>
  )
}
