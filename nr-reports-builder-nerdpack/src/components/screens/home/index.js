import { useCallback, useContext } from 'react'
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Icon,
} from 'nr1'
import { ROUTES, UI_CONTENT } from "../../../constants"
import EmptyView from "../../empty-view"
import ReportTable from '../../report-table'
import {
  RouteDispatchContext,
  StorageContext,
} from '../../../contexts'
import { useManifestWriter } from '../../../hooks'

export default function HomeScreen() {
  const { navigate } = useContext(RouteDispatchContext),
    {
      manifest,
    } = useContext(StorageContext),
    { del } = useManifestWriter(),
    handleCreateReport = useCallback(() => {
      navigate(ROUTES.EDIT_REPORT, { selectedReportIndex: -1 })
    }, [navigate]),
    handleDeleteReport = useCallback(index => {
      if (!confirm(UI_CONTENT.HOME.DELETE_REPORT_PROMPT)) {
        return
      }

      del([index])
    }, [del])

  if (
    !manifest ||
    manifest.reports.length === 0
  ) {
    return (
      <EmptyView
        heading={UI_CONTENT.GLOBAL.EMPTY_STATE.HEADING}
        description={(
          <Button
            type={Button.TYPE.PRIMARY}
            iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS}
            spacingType={[Button.SPACING_TYPE.LARGE]}
            onClick={handleCreateReport}
          >
            {UI_CONTENT.GLOBAL.EMPTY_STATE.DESCRIPTION}
          </Button>
        )}
      />
    )
  }

  return (
    <Card>
      <CardHeader title={UI_CONTENT.HOME.HEADING}>
        <Button
          type={Button.TYPE.PRIMARY}
          iconType={Icon.TYPE.INTERFACE__SIGN__PLUS}
          sizeType={Button.SIZE_TYPE.SMALL}
          onClick={handleCreateReport}
        >
          {UI_CONTENT.HOME.BUTTON_LABEL_CREATE_REPORT}
        </Button>
      </CardHeader>
      <CardBody>
        <ReportTable
          reports={manifest.reports}
          onSelectReport={index => navigate(
            ROUTES.EDIT_REPORT,
            { selectedReportIndex: index }
          )}
          onDeleteReport={handleDeleteReport}
        />
      </CardBody>
    </Card>
  )
}
