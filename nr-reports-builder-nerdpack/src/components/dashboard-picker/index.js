import { useCallback, useRef, useState } from "react";
import {
  Button,
  Form,
  HeadingText,
  Modal,
  Stack,
  StackItem,
  useEntitiesByDomainTypeQuery,
} from 'nr1'
import CheckboxItemList from "../checkbox-item-list";
import {
  SYMBOLS,
  UI_CONTENT,
} from "../../constants";

export default function DashboardPicker({ dashboards, open, onSubmit, onClose }) {
  const {
      loading,
      error,
      data,
      fetchMore,
    } = useEntitiesByDomainTypeQuery({
      entityType: SYMBOLS.ENTITY_TYPES.DASHBOARD,
      entityDomain: '',
    }),
    itemListRef = useRef(null),
    handleClose = useCallback(() => {
      onClose()
    }, [onClose]),
    handleSubmit = useCallback(() => {
      onSubmit(itemListRef.current.getSelectedItems())
    }, [onSubmit])

  return (
    <Modal hidden={!open} onClose={handleClose}>
      <Form className='dashboard-picker'>
        <HeadingText type={HeadingText.TYPE.HEADING_3}>
          {UI_CONTENT.DASHBOARD_PICKER.HEADING}
        </HeadingText>

        <CheckboxItemList
          loading={loading}
          error={error}
          items={data?.entities?.map(e => [e.guid, e.name])}
          count={data?.count}
          fetchMore={fetchMore}
          selectedItems={dashboards || []}
          ref={itemListRef}
        />

        <Stack
          spacingType={[
            Stack.SPACING_TYPE.LARGE,
            Stack.SPACING_TYPE.NONE,
          ]}
        >
          <StackItem>
            <Button
              onClick={handleSubmit}
              type={Button.TYPE.PRIMARY}
              spacingType={[
                Button.SPACING_TYPE.NONE,
                Button.SPACING_TYPE.SMALL,
                Button.SPACING_TYPE.NONE,
                Button.SPACING_TYPE.NONE,
              ]}
            >
              {UI_CONTENT.GLOBAL.ACTION_LABEL_OK}
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
      </Form>
    </Modal>
  )
}
