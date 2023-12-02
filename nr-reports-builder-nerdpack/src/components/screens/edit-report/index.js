import React, { useCallback, useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Checkbox,
  CollapsibleLayoutItem,
  Form,
  HeadingText,
  Layout,
  LayoutItem,
  Select,
  SelectItem,
  Stack,
  StackItem,
  TextField,
  Toast,
} from 'nr1'
import DashboardsField from '../../dashboards-field'
import PublishConfigurationsField from '../../publish-configs-field'
import QueryField from '../../query-field'
import {
  RouteContext,
  RouteDispatchContext,
  StorageContext,
} from '../../../contexts'
import { useManifestWriter } from '../../../hooks'
import { newReport } from '../../../model'
import {
  nameNotEmpty,
  typeIsValid,
} from '../../validations'
import {
  clone,
} from '../../../utils'
import {
  SYMBOLS,
  UI_CONTENT,
} from '../../../constants'
import { FormContext, Validation, withFormContext } from '../../../contexts/form'
import ReportHistoryList from '../../report-history-list'

function reportToFormState(report) {
  return {
    error: null,
    id: report.id,
    name: report.name,
    enabled: typeof report.enabled !== 'undefined' ? report.enabled : true,
    type: report.query ? (
      SYMBOLS.REPORT_TYPES.QUERY
    ) : SYMBOLS.REPORT_TYPES.DASHBOARD,
    query: report.query,
    accountIds: report.accountIds,
    lastModifiedDate: report.lastModifiedDate,
    publishConfigs: report.publishConfigs ? clone(report.publishConfigs) : [],
    metadata: report.metadata || {},
    loadedDashboards: report.dashboards ? false : true,
    dirty: false,
    valid: true,
  }
}

function reportFromFormState(formState) {
  const report = {
    id: formState.id,
    name: formState.name,
    enabled: formState.enabled,
    lastModifiedDate: new Date().getTime(),
    schedule: formState.schedule,
    publishConfigs: formState.publishConfigs,
    metadata: formState.metadata,
  }

  if (formState.type === 'query') {
    report.query = formState.query
    report.accountIds = formState.accountIds.map(a => a.value)
  } else {
    report.dashboards = formState.dashboards ? (
      formState.dashboards.map(d => d[0])
    ) : []
  }

  return report
}

function EditReportScreen({ report, selectedReportIndex }) {
  const {
      formState,
      dangerouslyUpdateFormState,
      updateFormState,
      validateFormState,
    } = useContext(FormContext),
    { home } = useContext(RouteDispatchContext),
    {
      writing,
      writeError,
      writeFinished,
    } = useContext(StorageContext),
    { update } = useManifestWriter(),
    writeFormState = useCallback(formState => {
      update(reportFromFormState(formState), selectedReportIndex)
    }, [update, selectedReportIndex]),
    [closeOnSave, setCloseOnSave] = useState(false),
    handleChangeName = useCallback(e => {
      updateFormState({ name: e.target.value })
    }, [updateFormState]),
    handleChangeEnabled = useCallback(e => {
      updateFormState({ enabled: e.target.checked })
    }, [updateFormState]),
    handleChangeType = useCallback((_, v) => {
      updateFormState({ type: v })
    }, [updateFormState]),
    handleSave = useCallback(() => {
      validateFormState(writeFormState)
    }, [validateFormState, writeFormState]),
    handleClose = useCallback(() => {
      if (formState.dirty) {
        if (!confirm(UI_CONTENT.EDIT_REPORT_SCREEN.CANCEL_PROMPT)) {
          return
        }
      }

      home()
    }, [home, formState]),
    handleSaveAndClose = useCallback(() => {
      setCloseOnSave(true)
      handleSave()
    }, [setCloseOnSave, handleSave]),
    { error } = formState

  useEffect(() => {
    if (error) {
      Toast.showToast({
        title: UI_CONTENT.EDIT_REPORT_FORM.FORM_ERROR_HEADING,
        description: UI_CONTENT.EDIT_REPORT_FORM.FORM_ERROR_DESCRIPTION(error.message),
        actions: [
          {
            label: UI_CONTENT.GLOBAL.ACTION_LABEL_RETRY,
            onClick: handleSave,
          },
        ],
        type: Toast.TYPE.CRITICAL,
      })
    }

    if (writeError) {
      Toast.showToast({
        title: UI_CONTENT.EDIT_REPORT_FORM.SAVE_ERROR_TITLE,
        description: UI_CONTENT.EDIT_REPORT_FORM.SAVE_ERROR_DESCRIPTION(writeError.message),
        actions: [
          {
            label: UI_CONTENT.GLOBAL.ACTION_LABEL_RETRY,
            onClick: handleSave,
          },
        ],
        type: Toast.TYPE.CRITICAL,
      })
    }

    if (writeFinished) {
      Toast.showToast({
        title: UI_CONTENT.EDIT_REPORT_FORM.SAVE_SUCCESS_TITLE,
        description: UI_CONTENT.EDIT_REPORT_FORM.SAVE_SUCCESS_DESCRIPTION(formState.name),
        type: Toast.TYPE.NORMAL,
      })

      dangerouslyUpdateFormState({})

      if (closeOnSave) {
        home()
      }
    }
  }, [error, writeError, writeFinished, formState.name, updateFormState, handleSave, handleClose, home])

  return (
    <div className="edit-report-screen">
      <Layout>
        <LayoutItem>
          <Card>
            <CardHeader title={UI_CONTENT.EDIT_REPORT_SCREEN.HEADING} />
            <CardBody>
              <Form
                className="edit-report-form"
                spacingType={[Form.SPACING_TYPE.LARGE]}
              >
                <Stack
                  spacingType={[
                    Stack.SPACING_TYPE.NONE,
                  ]}
                  directionType={Stack.DIRECTION_TYPE.VERTICAL}
                  fullWidth
                >
                  <StackItem>
                    <Validation name="name" validation={nameNotEmpty}>
                      <TextField
                        placeholder={
                          UI_CONTENT.EDIT_REPORT_FORM.REPORT_NAME_FIELD_PLACEHOLDER
                        }
                        label={UI_CONTENT.EDIT_REPORT_FORM.FIELD_LABEL_NAME}
                        value={formState.name}
                        onChange={handleChangeName}
                        invalid={formState.validations?.name}
                      />
                    </Validation>
                  </StackItem>

                  <StackItem>
                    <Checkbox
                      label={UI_CONTENT.EDIT_REPORT_FORM.FIELD_LABEL_ENABLED}
                      checked={formState.enabled}
                      onChange={handleChangeEnabled}
                    />
                  </StackItem>

                  <StackItem>
                    <Validation name="type" validation={typeIsValid}>
                      <Select
                        label={UI_CONTENT.EDIT_REPORT_FORM.FIELD_LABEL_TYPE}
                        onChange={handleChangeType}
                        value={formState.type}
                        invalid={formState.validations?.type}
                      >
                        <SelectItem value={SYMBOLS.REPORT_TYPES.DASHBOARD}>
                          {UI_CONTENT.EDIT_REPORT_FORM.REPORT_TYPE_LABEL_DASHBOARD}
                        </SelectItem>
                        <SelectItem value={SYMBOLS.REPORT_TYPES.QUERY}>
                          {UI_CONTENT.EDIT_REPORT_FORM.REPORT_TYPE_LABEL_QUERY}
                        </SelectItem>
                      </Select>
                    </Validation>
                  </StackItem>

                  <StackItem className="form-wrapper">
                    {
                      formState.type === SYMBOLS.REPORT_TYPES.DASHBOARD ? (
                        <DashboardsField
                          report={report}
                          formState={formState}
                          updateFormState={updateFormState}
                        />
                      ) : (
                        <QueryField
                          report={report}
                          formState={formState}
                          updateFormState={updateFormState}
                        />
                      )
                    }
                  </StackItem>

                  <StackItem className="form-wrapper">
                    <PublishConfigurationsField
                      formState={formState}
                      updateFormState={updateFormState}
                    />
                  </StackItem>

                  <StackItem>
                    <Stack
                      spacingType={[
                        Stack.SPACING_TYPE.LARGE,
                        Stack.SPACING_TYPE.NONE,
                      ]}
                    >
                      <StackItem>
                        <Button
                          onClick={handleSave}
                          type={Button.TYPE.PRIMARY}
                          loading={writing}
                          spacingType={[
                            Button.SPACING_TYPE.NONE,
                            Button.SPACING_TYPE.SMALL,
                            Button.SPACING_TYPE.NONE,
                            Button.SPACING_TYPE.NONE,
                          ]}
                        >
                          {UI_CONTENT.GLOBAL.ACTION_LABEL_SAVE}
                        </Button>
                        <Button
                          onClick={handleSaveAndClose}
                          type={Button.TYPE.SECONDARY}
                          loading={writing}
                          spacingType={[
                            Button.SPACING_TYPE.NONE,
                            Button.SPACING_TYPE.SMALL,
                            Button.SPACING_TYPE.NONE,
                            Button.SPACING_TYPE.NONE,
                          ]}
                        >
                          {UI_CONTENT.GLOBAL.ACTION_LABEL_SAVE_AND_CLOSE}
                        </Button>
                        <Button
                          onClick={handleClose}
                          type={Button.TYPE.PLAIN}
                          spacingType={[
                            Button.SPACING_TYPE.NONE,
                            Button.SPACING_TYPE.SMALL,
                            Button.SPACING_TYPE.NONE,
                            Button.SPACING_TYPE.NONE,
                          ]}
                        >
                          {UI_CONTENT.GLOBAL.ACTION_LABEL_CANCEL}
                        </Button>
                      </StackItem>
                    </Stack>
                  </StackItem>

                </Stack>
              </Form>
            </CardBody>
          </Card>
        </LayoutItem>
        <CollapsibleLayoutItem
          triggerType={CollapsibleLayoutItem.TRIGGER_TYPE.INBUILT}
          type={LayoutItem.TYPE.SPLIT_RIGHT}
          className="right-gutter"
        >
          <Card>
            <CardHeader title={UI_CONTENT.EDIT_REPORT_SCREEN.HEADING_HISTORY} />
            <CardBody>
              <ReportHistoryList
                report={report}
              />
            </CardBody>
          </Card>
        </CollapsibleLayoutItem>
      </Layout>
    </div>
  )
}

export default function EditReportScreenWrapper(props) {
  const {
      params: {
        formState,
        selectedReportIndex,
      },
    } = useContext(RouteContext),
    {
      manifest,
    } = useContext(StorageContext),
    report = selectedReportIndex >= 0 ? (
      manifest.reports[selectedReportIndex]
    ) : newReport(),
    initFormState = useCallback(() => formState ? (
        formState
      ) : reportToFormState(report),
      [formState, report]
    )

  return withFormContext(
    <EditReportScreen
      {...props}
      report={report}
      selectedReportIndex={selectedReportIndex}
    />,
    initFormState,
  )
}
