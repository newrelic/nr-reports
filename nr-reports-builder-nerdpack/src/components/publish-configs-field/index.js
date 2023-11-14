import React, { useCallback, useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import {
  BlockText,
  Button,
  Stack,
  StackItem,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
} from 'nr1'
import CustomField from '../custom-field'
import {
  ROUTES,
  UI_CONTENT,
} from '../../constants'
import { RouteDispatchContext } from '../../contexts'
import { generateShortScheduleDetails } from '../../utils'

function PublishConfigsTable({
  metadata,
  publishConfigs,
  onEditConfig,
  onDeleteConfig,
}) {
  const getActions = useMemo(() => {
      return [
        {
          label: UI_CONTENT.GLOBAL.ACTION_LABEL_EDIT,
          onClick: (e, { item, index }) => onEditConfig(index)
        },
        {
          label: UI_CONTENT.GLOBAL.ACTION_LABEL_DELETE,
          type: TableRow.ACTION_TYPE.DESTRUCTIVE,
          onClick: (evt, { item, index }) => onDeleteConfig(index),
        },
      ];
    }, [onEditConfig, onDeleteConfig]),
    renderRow = useCallback(({ item }) => {
      return (
        <TableRow actions={getActions}>
          <TableRowCell>{ item.name }</TableRowCell>
          <TableRowCell>{ generateShortScheduleDetails(
            item.schedule,
            metadata[`publishConfig-${item.id}`]['schedule-builder'])
          }</TableRowCell>
          <TableRowCell>{ item.channels.length }</TableRowCell>
        </TableRow>
      )
    }, [publishConfigs, getActions])

  return (
    <Table items={publishConfigs}>
      <TableHeader>
        <TableHeaderCell>
          Name
        </TableHeaderCell>
        <TableHeaderCell>
          Schedule
        </TableHeaderCell>
        <TableHeaderCell>
          Channels
        </TableHeaderCell>
      </TableHeader>
      {renderRow}
    </Table>
  )
}

export default function PublishConfigurationsField({
  formState,
  updateFormState,
}) {
  const { navigate } = useContext(RouteDispatchContext),
    handleAddConfig = useCallback(() => {
      navigate(ROUTES.EDIT_PUBLISH_CONFIGS, { formState, selectedConfig: -1 })
    }, [navigate, formState]),
    handleEditConfig = useCallback(selectedConfig => {
      navigate(ROUTES.EDIT_PUBLISH_CONFIGS, {
        formState,
        selectedConfig,
      })
    }, [navigate, formState]),
    handleDeleteConfig = useCallback(selectedConfig => {
      const newConfigs = [ ...formState.publishConfigs ]

      newConfigs.splice(selectedConfig, 1)

      updateFormState({ publishConfigs: newConfigs })
    }, [formState, updateFormState])

  return (
    <div className="publish-configs-field">
      <CustomField
        label={UI_CONTENT.PUBLISH_CONFIGS_FIELD.FIELD_LABEL_PUBLISH_CONFIGS_CUSTOM}
      >
        <Stack
          directionType={Stack.DIRECTION_TYPE.HORIZONTAL}
          className="channel-list"
          fullWidth
        >
          <StackItem grow>
          {
            formState.publishConfigs && (
              formState.publishConfigs.length > 0
            ) ? (
              <PublishConfigsTable
                metadata={formState.metadata}
                publishConfigs={formState.publishConfigs}
                onEditConfig={handleEditConfig}
                onDeleteConfig={handleDeleteConfig}
              />
            ) : (
              <BlockText>
                {UI_CONTENT.PUBLISH_CONFIGS_FIELD.NO_CONFIGS_MESSAGE}
              </BlockText>
            )
          }
          </StackItem>
        </Stack>
      </CustomField>

      <Button
        onClick={handleAddConfig}
        type={Button.TYPE.TERTIARY}
        sizeType={Button.SIZE_TYPE.SMALL}
        spacingType={[
          Button.SPACING_TYPE.MEDIUM,
          Button.SPACING_TYPE.SMALL,
          Button.SPACING_TYPE.LARGE,
          Button.SPACING_TYPE.NONE,
        ]}
      >
        {UI_CONTENT.PUBLISH_CONFIGS_FIELD.BUTTON_LABEL_ADD_CONFIG}
      </Button>
    </div>
  )
}
