import React, { useCallback, useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import {
  BlockText,
  Button,
  Link,
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
import { RouteDispatchContext, StorageContext } from '../../contexts'
import { generateShortScheduleDetails, resolvePublishConfig } from '../../utils'
import { FormContext } from '../../contexts/form'

function PublishConfigsTable({
  metadata,
  publishConfigs,
  onEditConfig,
  onDeleteConfig,
}) {
  const getActions = useMemo(() => {
      return [
        {
          label: UI_CONTENT.GLOBAL.ACTION_LABEL_DELETE,
          type: TableRow.ACTION_TYPE.DESTRUCTIVE,
          onClick: (evt, { item, index }) => onDeleteConfig(index),
        },
      ];
    }, [onDeleteConfig]),
    { publishConfigs: metaPublishConfigs } = useContext(StorageContext),
    renderRow = useCallback(({ item, index }) => {
      const publishConfig = resolvePublishConfig(
          metaPublishConfigs,
          item
        ),
        settings = publishConfig.metadata && (
          publishConfig.metadata['schedule-builder']
        )
      return (
        <TableRow key={publishConfig.id} actions={getActions}>
          <TableRowCell>
            <Link
              onClick={() => onEditConfig(index) }
            >
              {publishConfig.name}
            </Link>
          </TableRowCell>
          <TableRowCell>{ generateShortScheduleDetails(
              publishConfig.schedule,
              settings,
            )
          }</TableRowCell>
          <TableRowCell>{
            typeof publishConfig.enabled === 'undefined' ||
            publishConfig.enabled ? (
              UI_CONTENT.GLOBAL.STATUS_LABEL_ENABLED
            ) : UI_CONTENT.GLOBAL.STATUS_LABEL_DISABLED
          }</TableRowCell>
          <TableRowCell>{ publishConfig.channels.length }</TableRowCell>
        </TableRow>
      )
    }, [onEditConfig, getActions, metaPublishConfigs])

  return (
    <Table items={publishConfigs}>
      <TableHeader>
        <TableHeaderCell width="40%">
          {UI_CONTENT.GLOBAL.HEADER_LABEL_NAME}
        </TableHeaderCell>
        <TableHeaderCell width="30%">
          {UI_CONTENT.PUBLISH_CONFIGS_FIELD.HEADER_LABEL_SCHEDULE}
        </TableHeaderCell>
        <TableHeaderCell width="15%">
          {UI_CONTENT.GLOBAL.HEADER_LABEL_ENABLED}
        </TableHeaderCell>
        <TableHeaderCell width="15%">
          {UI_CONTENT.PUBLISH_CONFIGS_FIELD.HEADER_LABEL_CHANNELS}
        </TableHeaderCell>
      </TableHeader>
      {renderRow}
    </Table>
  )
}

export default function PublishConfigurationsField() {
  const { formState, updateFormState } = useContext(FormContext),
    { navigate } = useContext(RouteDispatchContext),
    handleAddConfig = useCallback(() => {
      navigate(ROUTES.EDIT_PUBLISH_CONFIG, { formState, selectedConfig: -1 })
    }, [navigate, formState]),
    handleEditConfig = useCallback(selectedConfig => {
      navigate(ROUTES.EDIT_PUBLISH_CONFIG, {
        formState,
        selectedConfig,
      })
    }, [navigate, formState]),
    handleDeleteConfig = useCallback(selectedConfig => {
      if (!confirm(UI_CONTENT.PUBLISH_CONFIGS_FIELD.DELETE_PROMPT)) {
        return
      }

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
