import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Checkbox,
  List,
  ListItem,
  Spinner,
} from 'nr1'
import ErrorView from "../error-view";

function isItemSelected(selectedItems, item) {
  return selectedItems.findIndex(i => i[0] === item[0]) !== -1
}

const CheckboxItemList = forwardRef(function CheckboxItemList({
    className,
    loading,
    error,
    count,
    items,
    fetchMore,
    selectedItems = [],
  },
  ref
) {
  const pickRef = useRef(null),
    [checkedItems, setCheckedItems] = useState(selectedItems),
    getSelectedItems = useCallback(() => {
      return checkedItems
    }, [checkedItems]),
    handleSelectItem = useCallback(e => {
      const { target } = e,
        selected = target.checked,
        index = checkedItems.findIndex(i => i[0] === target.id)

      if (selected && index === -1) {
        setCheckedItems([ ...checkedItems, [target.value, target.dataset.itemName] ])
        return
      }

      if (!selected && index >= 0) {
        const newItems = [ ...checkedItems ]
        newItems.splice(index, 1)
        setCheckedItems(newItems)
      }
    }, [checkedItems, setCheckedItems]),
    View = useMemo(() => {
      if (loading && items && items.length === 0) {
        return <Spinner />
      }

      if (error) {
        // @TODO
        return (
          <ErrorView
            heading='oops'
            description='oops2'
            error={error}
          />
        )
      }

      return (
        <List
          className="checkbox-item-list-list"
          rowHeight={20}
          items={items}
          onLoadMore={fetchMore}
          rowCount={count}
        >
          {({ item }) => (
            <ListItem
              key={item[0]}
              className='checkbox-item-list-item'
              spacingType={[Checkbox.SPACING_TYPE.SMALL]}
            >
              <div className="checkbox-item-list-checkbox">
                {
                  isItemSelected(checkedItems, item) ? (
                    <input
                      id={item[0]}
                      type="checkbox"
                      value={item[0]}
                      data-item-name={item[1]}
                      onChange={handleSelectItem}
                      defaultChecked={true} />
                  ) : (
                    <input
                      id={item[0]}
                      type="checkbox"
                      value={item[0]}
                      data-item-name={item[1]}
                      onChange={handleSelectItem}
                      defaultChecked={false}
                    />
                  )
                }
                <label for={item[0]}>{item[1]}</label>
              </div>
            </ListItem>
          )}
        </List>
      )
    }, [loading, error, items, count, fetchMore, handleSelectItem, checkedItems])

  useImperativeHandle(ref, () => {
    return {
      getSelectedItems,
    }
  }, [getSelectedItems])

  return (
    <div className={`checkbox-item-list ${className || ''}`} ref={pickRef}>
      {View}
    </div>
  )
})

export default CheckboxItemList
