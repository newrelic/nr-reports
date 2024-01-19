import React, { useCallback, useContext, useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import {
  BlockText,
  Button,
  Spinner,
  Stack,
  StackItem,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  useEntitiesByGuidsQuery,
} from 'nr1'
import CustomField from '../custom-field'
import DashboardPicker from '../dashboard-picker'
import { FormContext } from '../../contexts/form'
import {
  UI_CONTENT,
} from '../../constants'

function entitiesToDashboards(entities, dashboards) {
  return dashboards.map(dash => {
    const entity = entities.find(e => e.guid === dash)

    if (!entity) {
      console.warn(`dashboard ${dash} not found in returned dashboard entities`)
      return [dash, '[dashboard not found]']
    }

    return [entity.guid, entity.name]
  })
}

function DashboardsTable({ dashboards, onRemove }) {
  const getActions = () => {
      return [
        {
          label: UI_CONTENT.GLOBAL.ACTION_LABEL_REMOVE,
          onClick: (e, { items }) => {
            e.preventDefault()
            onRemove(items)
          }
        },
      ]
    },
    renderRow = useCallback(({ item }) => (
      <TableRow>
        <TableRowCell>{item[1]}</TableRowCell>
        <TableRowCell>{item[0]}</TableRowCell>
      </TableRow>
    ), [])

  return (
    <Table
      items={dashboards}
      selected={({ item }) => item.selected}
      onSelect={(evt, { item }) => { item.selected = evt.target.checked }}
    >
      <TableHeader actions={getActions()}>
        <TableHeaderCell>
          Name
        </TableHeaderCell>
        <TableHeaderCell>
          GUID
        </TableHeaderCell>
      </TableHeader>
      {renderRow}
    </Table>
  )
}

export default function DashboardsField({
  report,
}) {
  const {
      formState,
      dangerouslyUpdateFormState,
      updateFormState,
    } = useContext(FormContext),
    [showPicker, setShowPicker] = useState(false),
    reportDashboards = !formState.loadedDashboards && report.dashboards,
    skip = !reportDashboards,
    {
      loading,
      data,
      error,
    } = useEntitiesByGuidsQuery({
      entityGuids: reportDashboards,
      skip,
    }),
    entities = (!skip && !loading && !error && data.entities),
    handleSelectDashboards = useCallback(() => {
      setShowPicker(true)
    }, [setShowPicker]),
    handleClose = useCallback(() => {
      setShowPicker(false)
    }, [setShowPicker]),
    handleRemove = useCallback(dashboards => {
      updateFormState({ dashboards: dashboards.filter(d => !d.selected) })
    }, [updateFormState])

  useEffect(() => {
    if (error) {
      dangerouslyUpdateFormState({ error })
      return
    }

    if (!loading && entities) {
      dangerouslyUpdateFormState({
        dashboards: entitiesToDashboards(entities, reportDashboards),
        loadedDashboards: true,
      })
    }
  }, [loading, error, entities, dangerouslyUpdateFormState])

  return (
    <div className="dashboards-field">
      <CustomField
        label={UI_CONTENT.DASHBOARDS_FORM.FIELD_LABEL_DASHBOARDS_CUSTOM}
      >
        {
          loading ? (
            <Spinner />
          ) : (
            <Stack
              directionType={Stack.DIRECTION_TYPE.HORIZONTAL}
              className="dashboard-list"
              fullWidth
            >
              <StackItem grow>
              {
                formState.dashboards && formState.dashboards.length > 0 ? (
                  <DashboardsTable
                    dashboards={formState.dashboards}
                    onRemove={handleRemove}
                  />
                ) : (
                  <BlockText>
                    {UI_CONTENT.DASHBOARDS_FORM.NO_DASHBOARDS_MESSAGE}
                  </BlockText>
                )
              }
              </StackItem>
            </Stack>
          )
        }
      </CustomField>

      <Button
        onClick={handleSelectDashboards}
        type={Button.TYPE.TERTIARY}
        sizeType={Button.SIZE_TYPE.SMALL}
        spacingType={[
          Button.SPACING_TYPE.NONE,
          Button.SPACING_TYPE.SMALL,
          Button.SPACING_TYPE.LARGE,
          Button.SPACING_TYPE.NONE,
        ]}
      >
        {UI_CONTENT.DASHBOARDS_FORM.BUTTON_LABEL_SELECT_DASHBOARDS}
      </Button>
      {
        showPicker && (
          <DashboardPicker
            dashboards={formState.dashboards}
            open={showPicker}
            onSubmit={dashboards => {
              updateFormState({ dashboards })
              setShowPicker(false)
            }}
            onClose={handleClose}
          />
        )
      }
    </div>
  )
}
