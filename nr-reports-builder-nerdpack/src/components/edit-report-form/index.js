import React, { useCallback, useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Button,
  Form,
  HeadingText,
  Select,
  SelectItem,
  Stack,
  StackItem,
  TextField,
  Toast,
} from 'nr1'
import ChannelsForm from '../channels-form'
import DashboardsForm from '../dashboards-form'
import QueryForm from '../query-form'
import { RouteDispatchContext, StorageContext } from '../../contexts'
import { clone } from '../../utils'
import {
  ROUTES,
  SYMBOLS,
  UI_CONTENT,
} from '../../constants'

function reportToFormState(report) {
  return {
    error: null,
    name: report.name,
    type: report.query ? (
      SYMBOLS.REPORT_TYPES.QUERY
    ) : SYMBOLS.REPORT_TYPES.DASHBOARD,
    query: report.query,
    accountIds: report.accountIds,
    lastModifiedDate: report.lastModifiedDate,
    channels: report.channels ? clone(report.channels) : [],
    schedule: report.schedule,
    loadedDashboards: report.dashboards ? false : true,
    dirty: false,
  }
}

function reportFromFormState(formState) {
  console.log(formState)

  const report = {
    name: formState.name,
    lastModifiedDate: new Date().getTime(),
    schedule: formState.schedule,
    channels: formState.channels,
  }

  if (formState.type === 'query') {
    report.query = formState.query
    report.accountIds = formState.accountIds.map(a => a.value)
  } else {
    report.dashboards = formState.dashboards.map(d => d[0])
  }

  return report
}

export default function EditReportForm({
  accountId,
  selectedReportIndex,
  report,
  onSubmit,
}) {
  const navigate = useContext(RouteDispatchContext),
    {
      writing,
      writeError,
      writeFinished,
    } = useContext(StorageContext),
    [formState, setFormState] = useState(reportToFormState(report)),
    [closeOnSave, setCloseOnSave] = useState(false),
    updateFormState = useCallback((updates, dirty) => {
      setFormState({
        ...formState,
        ...updates,
        dirty: typeof dirty === 'undefined' ? true : dirty
      })
    }, [formState] ),
    handleChangeName = useCallback(e => {
      updateFormState({ name: e.target.value })
    }, [updateFormState]),
    handleChangeType = useCallback((_, v) => {
      updateFormState({ type: v })
    }, [updateFormState]),
    handleChangeSchedule = useCallback(e => {
      updateFormState({ schedule: e.target.value })
    }, [updateFormState]),
    handleSave = useCallback(() => {
      onSubmit(
        selectedReportIndex,
        reportFromFormState(formState)
      )
    }, [selectedReportIndex, formState]),
    handleClose = useCallback(() => {
      if (formState.dirty) {
        if (!confirm(UI_CONTENT.EDIT_REPORT_SCREEN.CANCEL_PROMPT)) {
          return
        }
      }

      navigate(ROUTES.HOME, { selectedReportIndex: -1 })
    }, [formState, navigate]),
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

      updateFormState({}, false)

      if (closeOnSave) {
        navigate(ROUTES.HOME, { selectedReportIndex: -1 })
      }
    }
  }, [error, writeError, writeFinished, formState.name, updateFormState, handleSave, handleClose, navigate])

  return (
    <>
      <Form
        className="edit-report-form"
        spacingType={[Form.SPACING_TYPE.LARGE]}
      >
        <HeadingText
          type={HeadingText.TYPE.HEADING_2}
          spacingType={[
            HeadingText.SPACING_TYPE.OMIT,
            HeadingText.SPACING_TYPE.OMIT,
            HeadingText.SPACING_TYPE.LARGE,
            HeadingText.SPACING_TYPE.OMIT,
          ]}
        >
          {UI_CONTENT.EDIT_REPORT_FORM.HEADING}
        </HeadingText>

        <Stack
          spacingType={[
            Stack.SPACING_TYPE.NONE,
          ]}
          directionType={Stack.DIRECTION_TYPE.VERTICAL}
          fullWidth
        >
          <StackItem>
            <TextField
              placeholder={
                UI_CONTENT.EDIT_REPORT_FORM.REPORT_NAME_FIELD_PLACEHOLDER
              }
              label={UI_CONTENT.EDIT_REPORT_FORM.FIELD_LABEL_NAME}
              value={formState.name}
              onChange={handleChangeName}
            />
          </StackItem>

          <StackItem>
            <Select
              label={UI_CONTENT.EDIT_REPORT_FORM.FIELD_LABEL_TYPE}
              onChange={handleChangeType}
              value={formState.type}
            >
              <SelectItem value={SYMBOLS.REPORT_TYPES.DASHBOARD}>
                {UI_CONTENT.EDIT_REPORT_FORM.REPORT_TYPE_LABEL_DASHBOARD}
              </SelectItem>
              <SelectItem value={SYMBOLS.REPORT_TYPES.QUERY}>
                {UI_CONTENT.EDIT_REPORT_FORM.REPORT_TYPE_LABEL_QUERY}
              </SelectItem>
            </Select>
          </StackItem>

          <StackItem className="form-wrapper">
            {
              formState.type === SYMBOLS.REPORT_TYPES.DASHBOARD ? (
                <DashboardsForm
                  report={report}
                  formState={formState}
                  updateFormState={updateFormState}
                />
              ) : (
                <QueryForm
                  report={report}
                  formState={formState}
                  updateFormState={updateFormState}
                />
              )
            }
          </StackItem>

          <StackItem className="form-wrapper">
            <ChannelsForm
              accountId={accountId}
              formState={formState}
              updateFormState={updateFormState}
            />
          </StackItem>

          <StackItem>
            <TextField
              placeholder={
                UI_CONTENT.EDIT_REPORT_FORM.SCHEDULE_FIELD_PLACEHOLDER
              }
              label={UI_CONTENT.EDIT_REPORT_FORM.FIELD_LABEL_SCHEDULE}
              value={formState.schedule}
              onChange={handleChangeSchedule}
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
                  type={Button.TYPE.TERTIARY}
                  spacingType={[
                    Button.SPACING_TYPE.NONE,
                    Button.SPACING_TYPE.SMALL,
                    Button.SPACING_TYPE.NONE,
                    Button.SPACING_TYPE.NONE,
                  ]}
                >
                  {UI_CONTENT.GLOBAL.ACTION_LABEL_CLOSE}
                </Button>
              </StackItem>
            </Stack>
          </StackItem>

        </Stack>
      </Form>
    </>
  )
}
