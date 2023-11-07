import React, { useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import patterns from './patterns'
import { UI_CONTENT } from '../../constants'

const NRQL_STYLES = {
  keyword: 'color: #AA1BC8',
  function: 'color: #3B79B8',
  string: 'color: #4F8400',
  numeric: 'color: #AB6400',
  operator: 'color: #3D808A',
}

const lexer = (nrql) =>
  patterns.reduce(
    (acc, { name, regex } = {}) =>
      acc.replace(
        regex,
        (match) => `<span style="${NRQL_STYLES[name]}">${match}</span>`
      ),
    nrql
  )

export default function NrqlEditor2({
  nrql,
  onChange,
}) {
  const [displayNode, setDisplayNode] = useState(),
    scrollHandler = useCallback(
      ({ target: { scrollTop = 0 } = {} } = {}) => {
        if (displayNode) displayNode.scrollTop = scrollTop
      },
      [displayNode]
    ),
    displayNodeHandler = useCallback((node) => setDisplayNode(node), [])

  return (
    <div className="nrql-editor">
      <div className="color-coded-nrql">
        <div className="editor">
          <textarea
            className="u-unstyledInput entry"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            value={nrql}
            onChange={onChange}
            onScroll={scrollHandler}
            placeholder={UI_CONTENT.NRQL_EDITOR.QUERY_FIELD_PLACEHOLDER}
          />
          <pre ref={displayNodeHandler} className="display">
            <code dangerouslySetInnerHTML={{ __html: lexer(nrql) }} />
          </pre>
        </div>
      </div>
    </div>
  )
}
