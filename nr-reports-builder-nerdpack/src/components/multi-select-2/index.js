import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Icon,
} from 'nr1'
import GroupByIcon from './group.svg'
import Label from './label'

export const NO_ICON = Symbol("NO_ICON")

function handleClicksOutsideComponent(
  componentRef,
  showItemsRef,
  setShowItemsList,
) {
  return evt => {
    if (
      showItemsRef.current &&
      componentRef &&
      !componentRef.current.contains(evt.target)
    ) {
      setShowItemsList(false)
    }
  }
}

export default function MultiSelect2({
  items = [],
  value = [],
  className = '',
  icon = NO_ICON,
  showChips = true,
  placeholderText = '',
  labeler = () => '',
  invalid = '',
  onChange,
}) {
  const thisComponentRef = useRef(),
    inputFieldRef = useRef(),
    showItemsRef = useRef(),
    [showItemsList, setShowItemsList] = useState(false),
    checkHandler = useCallback((e, item, _, checked) => {
      e.stopPropagation()

      if (checked) {
        onChange(value.concat(item))
        return
      }

      const idx = value.findIndex(v => v.value === item.value)

      if (idx >= 0) {
        const newValue = [...value]

        newValue.splice(idx, 1)
        onChange(newValue)
      }
    }, [value, onChange]),
    removeAllHandler = useCallback(e => {
      e.stopPropagation()
      onChange([])
    }, [onChange]),
    showItemsListHandler = useCallback(e => {
      e.stopPropagation()

      setShowItemsList(!showItemsList)
    }, [setShowItemsList, showItemsList]),
    outsideClicksHandler = useMemo(() => {
      // We intentionally don't want this function to ever change so we use
      // [] as dependency list here.
      return handleClicksOutsideComponent(
        thisComponentRef,
        showItemsRef,
        setShowItemsList,
      )
    }, []),
    setupHandlers = () => {
      // Delay here so that we don't capture button click events that may have
      // triggered the overlay to open.
      setTimeout(() => {
        document.addEventListener('click', outsideClicksHandler)
      }, 200)
    },
    cleanupHandlers = () => {
      document.removeEventListener('click', outsideClicksHandler)
    }
  let itemsListWidth, checkboxWidth

  useEffect(() => {
    setupHandlers()
    return cleanupHandlers
  }, [])

  useEffect(() => {
    // These need to recalculate every time in case of resizes and such

    itemsListWidth = inputFieldRef && inputFieldRef.current ? (
      inputFieldRef.current.clientWidth - 14
    ) : 'auto'
    checkboxWidth = (
      inputFieldRef && inputFieldRef.current ? (itemsListWidth - 32) / 2 : 'auto'
    )
    showItemsRef.current = showItemsList
  })

  return (
    <div className={`multiselect ${className || ''}`} ref={thisComponentRef}>
      <div className="field" ref={inputFieldRef}>
        <div
          className={`input ${!value.length ? 'placeholder' : ''}`}
          onClick={showItemsListHandler}
        >
          { (value.length === 0) && <div>{placeholderText}</div> }
          {
            value.length > 0 && showChips && value.map((item, i) => (
              <Label
                key={i}
                value={labeler(item, i, value)}
                onRemove={e => checkHandler(e, item, i, false)}
              />
            ))
          }
          {
            value.length > 0 && !showChips && (
              <Label
                value={labeler(null, -1, value)}
                onRemove={removeAllHandler}
              />
            )
          }
        </div>
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
      </div>
      {
        invalid && (
          <div className="errorMessage">
            {invalid}
          </div>
        )
      }
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
                  value.length && value.findIndex(v => v.value === item.value) !== -1
                )}
                onChange={e => checkHandler(e, item, i, e.target.checked)}
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
