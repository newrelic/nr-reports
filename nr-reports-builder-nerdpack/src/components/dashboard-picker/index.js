import { useCallback, useRef, useState } from "react";
import {
  Button,
  Form,
  HeadingText,
  Modal,
  Stack,
  StackItem,
  TextField,
  useEntitiesByDomainTypeQuery,
  useEntitySearchQuery,
} from 'nr1'
import CheckboxItemList from "../checkbox-item-list";
import {
  SYMBOLS,
  UI_CONTENT,
} from "../../constants";

export default function DashboardPicker({ dashboards, open, onSubmit, onClose }) {
  const [filter, setFilter] = useState(''),
    [searchFilter, setSearchFilter] = useState(''),
    [isFiltered, setIsFiltered] = useState(false),
    {
      loading,
      error,
      data,
      fetchMore,
    } = useEntitiesByDomainTypeQuery({
      entityType: SYMBOLS.ENTITY_TYPES.DASHBOARD,
      entityDomain: '',
      skip: isFiltered,
    }), {
      loading: searchLoading,
      error: searchError,
      data: searchData,
      fetchMore: searchFetchMore,
    } = useEntitySearchQuery({
      entityType: SYMBOLS.ENTITY_TYPES.DASHBOARD,
      entityDomain: '',
      name: searchFilter,
      skip: !isFiltered,
    }),
    itemListRef = useRef(null),
    handleChangeFilter = useCallback(e => {
      setFilter(e.target.value)
    }, [setFilter]),
    handleApplyFilter = useCallback(() => {
      if (filter.trim() === '') {
        setIsFiltered(false)
        setSearchFilter('')
        return
      }

      setIsFiltered(true)
      setSearchFilter(filter)
    }, [setIsFiltered, setSearchFilter, filter]),
    handleClearFilter = useCallback(() => {
      setIsFiltered(false)
      setFilter('')
      setSearchFilter('')
    }, [setIsFiltered, setFilter, setSearchFilter]),
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

        <div className="search-bar">
          <TextField
            placeholder={UI_CONTENT.DASHBOARD_PICKER.SEARCH_FIELD_PLACEHOLDER}
            value={filter}
            onChange={handleChangeFilter}
            spacingType={[TextField.SPACING_TYPE.NONE]}
          />
          <Button
            onClick={handleApplyFilter}
            sizeType={Button.SIZE_TYPE.SMALL}
            spacingType={[
              Button.SPACING_TYPE.NONE,
              Button.SPACING_TYPE.NONE,
              Button.SPACING_TYPE.NONE,
              Button.SPACING_TYPE.MEDIUM,
            ]}
            disabled={filter === searchFilter}
            iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__SEARCH}
          />
          <Button
            onClick={handleClearFilter}
            sizeType={Button.SIZE_TYPE.SMALL}
            spacingType={[
              Button.SPACING_TYPE.NONE,
              Button.SPACING_TYPE.NONE,
              Button.SPACING_TYPE.NONE,
              Button.SPACING_TYPE.SMALL,
            ]}
            disabled={filter === '' && searchFilter === ''}
            iconType={Button.ICON_TYPE.INTERFACE__SIGN__CLOSE}
          />
        </div>

        <CheckboxItemList
          loading={isFiltered ? searchLoading: loading}
          error={isFiltered ? searchError : error}
          items={isFiltered ? (
            searchData?.entities?.map(e => [e.guid, e.name])
          ) : (
            data?.entities?.map(e => [e.guid, e.name])
          )}
          count={isFiltered ? searchData?.count : data?.count}
          fetchMore={isFiltered ? searchFetchMore : fetchMore}
          selectedItems={dashboards || []}
          noResultsMessage={UI_CONTENT.DASHBOARD_PICKER.NO_RESULTS_MESSAGE}
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
