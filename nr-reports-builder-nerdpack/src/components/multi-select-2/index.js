import React, { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Icon,
} from 'nr1'
import GroupByIcon from './group.svg'
import Label from './label'

export const NO_ICON = Symbol("NO_ICON")

export default function MultiSelect2({
  items = [],
  value = [],
  className = '',
  icon = NO_ICON,
  placeholderText = '',
  onChange,
}) {
  const thisComponent = useRef(),
    inputField = useRef(),
    [showItemsList, setShowItemsList] = useState(false),
    checkHandler = useCallback((item, _, checked) => {
      if (checked) {
        onChange(value.concat(item))
        return
      }

      const idx = value.findIndex(v => v === item)

      if (idx >= 0) {
        const newValue = [...value]

        newValue.splice(idx, 1)
        onChange(newValue)
      }
    }, [value, onChange]),
    showItemsListHandler = useCallback(() => {
      setShowItemsList(!showItemsList)
    }),
    handleClicksOutsideComponent = useCallback(evt => {
      if (
        showItemsList &&
        thisComponent &&
        !thisComponent.current.contains(evt.target)
      ) {
        setShowItemsList(false)
      }
    }, [thisComponent, showItemsList, setShowItemsList]),
    cleanupClickHandler = useCallback(() => {
      document.removeEventListener('click', handleClicksOutsideComponent)
    }, [handleClicksOutsideComponent])
  let itemsListWidth, checkboxWidth

  useEffect(() => {
    itemsListWidth = inputField && inputField.current ? (
      inputField.current.clientWidth - 14
    ) : 'auto'
    checkboxWidth = (
      inputField && inputField.current ? (itemsListWidth - 32) / 2 : 'auto'
    )

    document.addEventListener('click', handleClicksOutsideComponent)

    return cleanupClickHandler
  })

  return (
    <div className={`multiselect ${className || ''}`} ref={thisComponent}>
      <div className="field" ref={inputField}>
        {
          icon && icon !== NO_ICON && (
            <div className="icon" onClick={showItemsListHandler}>
              <Icon type={icon} />
            </div>
          )
        }
        {
          !icon && (
            <div className="icon" onClick={showItemsListHandler}>
              <img src={GroupByIcon} alt="group by" />
            </div>
          )
        }
        <div
          className={`input ${!value.length ? 'placeholder' : ''}`}
          onClick={showItemsListHandler}
        >
          {value.map((item, i) => (
            <Label
              key={i}
              value={item.label}
              onRemove={() => checkHandler(item, i, false)}
            />
          ))}
          {!value.length && placeholderText}
        </div>
      </div>
      {showItemsList ? (
        <div className="list" style={{ width: itemsListWidth }}>
          {items.map((item, i) => (
            <div
              className="item"
              style={{ width: checkboxWidth }}
              key={i}
            >
              <input
                type="checkbox"
                value={item.value}
                id={item.value}
                checked={(
                  value.length && value.findIndex(v => v === item) !== -1
                )}
                onChange={e => checkHandler(item, i, e.target.checked)}
              />
              <label htmlFor={item.value}>
                {item.label}
              </label>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
