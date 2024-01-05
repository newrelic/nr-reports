import { useCallback, useContext } from 'react'
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Icon,
  Tabs,
  TabItem,
} from 'nr1'
import { ROUTES, UI_CONTENT } from "../../../constants"
import EmptyView from "../../empty-view"
import ReportTable from '../../report-table'
import {
  RouteContext,
  RouteDispatchContext,
  StorageContext,
} from '../../../contexts'
import { useManifestWriter } from '../../../hooks'
import PublishConfigsTable from '../../publish-configs-table'
import ChannelsTable from '../../channels-table'

function ChannelsView() {
  const { navigate } = useContext(RouteDispatchContext),
    {
      channels: metaChannels,
    } = useContext(StorageContext),
    { deleteChannels } = useManifestWriter(),
    handleCreateChannel = useCallback(() => {
      navigate(ROUTES.EDIT_CHANNEL, { selectedChannel: -1 })
    }, [navigate]),
    handleEditChannel = useCallback(index => {
      navigate(ROUTES.EDIT_CHANNEL, { selectedChannel: index })
    }, [navigate]),
    handleDeleteChannel = useCallback(index => {
      if (!confirm(
        UI_CONTENT.HOME.CHANNELS.DELETE_CHANNEL_PROMPT
      )) {
        return
      }

      deleteChannels([index])
    }, [deleteChannels])

  if (
    !metaChannels ||
    metaChannels.channels.length === 0
  ) {
    return (
      <EmptyView
        heading={UI_CONTENT.HOME.CHANNELS.EMPTY_STATE.HEADING}
        description={(
          <Button
            type={Button.TYPE.PRIMARY}
            iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS}
            spacingType={[Button.SPACING_TYPE.LARGE]}
            onClick={handleCreateChannel}
          >
            {UI_CONTENT.HOME.CHANNELS.EMPTY_STATE.DESCRIPTION}
          </Button>
        )}
      />
    )
  }

  return (
    <Card>
      <CardHeader title={UI_CONTENT.HOME.CHANNELS.HEADING}>
        <Button
          type={Button.TYPE.PRIMARY}
          iconType={Icon.TYPE.INTERFACE__SIGN__PLUS}
          sizeType={Button.SIZE_TYPE.SMALL}
          onClick={handleCreateChannel}
        >
          {UI_CONTENT.HOME.CHANNELS.BUTTON_LABEL_CREATE_CHANNEL}
        </Button>
      </CardHeader>
      <CardBody>
        <ChannelsTable
          channels={metaChannels.channels}
          onEditChannel={handleEditChannel}
          onDeleteChannel={handleDeleteChannel}
        />
      </CardBody>
    </Card>
  )
}

function PublishConfigurationsView() {
  const { navigate } = useContext(RouteDispatchContext),
    {
      publishConfigs: metaPublishConfigs,
    } = useContext(StorageContext),
    { deletePublishConfigs } = useManifestWriter(),
    handleCreateConfig = useCallback(() => {
      navigate(ROUTES.EDIT_PUBLISH_CONFIG, { selectedConfig: -1 })
    }, [navigate]),
    handleEditConfig = useCallback(index => {
      navigate(ROUTES.EDIT_PUBLISH_CONFIG, {
        selectedConfig: index,
      })
    }, [navigate]),
    handleDeleteConfig = useCallback(index => {
      if (!confirm(
        UI_CONTENT.HOME.PUBLISH_CONFIGS.DELETE_PUBLISH_CONFIG_PROMPT
      )) {
        return
      }

      deletePublishConfigs([index])
    }, [deletePublishConfigs])

  if (
    !metaPublishConfigs ||
    metaPublishConfigs.publishConfigs.length === 0
  ) {
    return (
      <EmptyView
        heading={UI_CONTENT.HOME.PUBLISH_CONFIGS.EMPTY_STATE.HEADING}
        description={(
          <Button
            type={Button.TYPE.PRIMARY}
            iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS}
            spacingType={[Button.SPACING_TYPE.LARGE]}
            onClick={handleCreateConfig}
          >
            {UI_CONTENT.HOME.PUBLISH_CONFIGS.EMPTY_STATE.DESCRIPTION}
          </Button>
        )}
      />
    )
  }

  return (
    <Card>
      <CardHeader title={UI_CONTENT.HOME.PUBLISH_CONFIGS.HEADING}>
        <Button
          type={Button.TYPE.PRIMARY}
          iconType={Icon.TYPE.INTERFACE__SIGN__PLUS}
          sizeType={Button.SIZE_TYPE.SMALL}
          onClick={handleCreateConfig}
        >
          {UI_CONTENT.HOME.PUBLISH_CONFIGS.BUTTON_LABEL_CREATE_PUBLISH_CONFIG}
        </Button>
      </CardHeader>
      <CardBody>
        <PublishConfigsTable
          publishConfigs={metaPublishConfigs.publishConfigs}
          onEditConfig={handleEditConfig}
          onDeleteConfig={handleDeleteConfig}
        />
      </CardBody>
    </Card>
  )
}

function ReportsView() {
  const { navigate } = useContext(RouteDispatchContext),
    {
      manifest,
    } = useContext(StorageContext),
    { del } = useManifestWriter(),
    handleCreateReport = useCallback(() => {
      navigate(ROUTES.EDIT_REPORT, { selectedReportIndex: -1 })
    }, [navigate]),
    handleEditReport  = useCallback(index => {
      navigate(
        ROUTES.EDIT_REPORT,
        { selectedReportIndex: index }
      )
    }, [navigate]),
    handleDeleteReport = useCallback(index => {
      if (!confirm(UI_CONTENT.HOME.REPORTS.DELETE_REPORT_PROMPT)) {
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
        heading={UI_CONTENT.HOME.REPORTS.EMPTY_STATE.HEADING}
        description={(
          <Button
            type={Button.TYPE.PRIMARY}
            iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS}
            spacingType={[Button.SPACING_TYPE.LARGE]}
            onClick={handleCreateReport}
          >
            {UI_CONTENT.HOME.REPORTS.EMPTY_STATE.DESCRIPTION}
          </Button>
        )}
      />
    )
  }

  return (
    <Card>
      <CardHeader title={UI_CONTENT.HOME.REPORTS.HEADING}>
        <Button
          type={Button.TYPE.PRIMARY}
          iconType={Icon.TYPE.INTERFACE__SIGN__PLUS}
          sizeType={Button.SIZE_TYPE.SMALL}
          onClick={handleCreateReport}
        >
          {UI_CONTENT.HOME.REPORTS.BUTTON_LABEL_CREATE_REPORT}
        </Button>
      </CardHeader>
      <CardBody>
        <ReportTable
          reports={manifest.reports}
          onSelectReport={handleEditReport}
          onDeleteReport={handleDeleteReport}
        />
      </CardBody>
    </Card>
  )
}

export default function HomeScreen() {
  const {
    params: {
      tab,
    }
  } = useContext(RouteContext)

  return (
    <Tabs defaultValue={tab || 'reports'}>
      <TabItem
        value="reports"
        label={UI_CONTENT.HOME.TAB_LABEL_REPORTS}
      >
        <ReportsView />
      </TabItem>
      <TabItem
        value="publishConfigs"
        label={UI_CONTENT.HOME.TAB_LABEL_PUBLISH_CONFIGS}
      >
        <PublishConfigurationsView />
      </TabItem>
      <TabItem
        value="channels"
        label={UI_CONTENT.HOME.TAB_LABEL_CHANNELS}
      >
        <ChannelsView />
      </TabItem>
    </Tabs>
  )
}
