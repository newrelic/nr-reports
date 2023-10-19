import { forwardRef, useCallback, useMemo, useRef, useImperativeHandle } from "react";
import {
  Checkbox,
  List,
  ListItem,
  Spinner,
} from 'nr1'
import ErrorView from "../error-view";

const CheckboxItemList = forwardRef(function CheckboxItemList({
    className,
    loading,
    error,
    count,
    items,
    fetchMore,
    isItemSelected,
  },
  ref
) {
  const pickRef = useRef(null),
    getSelectedItems = useCallback(() => {
      const inputs = pickRef.current.querySelectorAll(
          '.checkbox-item-list input:checked'
        ),
        items = []

      for (const item of inputs.values()) {
        items.push([item.value, item.dataset.itemName])
      }

      return items
    }, [pickRef]),
    View = useMemo(() => {
      if (loading) {
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
                  isItemSelected(item) ? (
                    <input id={item[0]} type="checkbox" value={item[0]} data-item-name={item[1]} defaultChecked={true} />
                  ) : (
                    <input id={item[0]} type="checkbox" value={item[0]} data-item-name={item[1]} defaultChecked={false} />
                  )
                }
                <label for={item[0]}>{item[1]}</label>
              </div>
            </ListItem>
          )}
        </List>
      )
    }, [loading, error, items, count, fetchMore, isItemSelected])

  useImperativeHandle(ref, () => {
    return {
      getSelectedItems,
    }
  }, [])

  return (
    <div className={`checkbox-item-list ${className || ''}`} ref={pickRef}>
      {View}
    </div>
  )
})

export default CheckboxItemList
