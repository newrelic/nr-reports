'use strict'

const { getOption, buildCsv, buildHtml, toNumber } = require('../util'),
  {
    QUERY_RESULTS_FORMAT_KEY,
    QUERY_RESULTS_FORMAT_VAR,
    QUERY_RESULTS_FORMAT_DEFAULT,
    QUERY_RESULTS_FORMAT_HTML,
    QUERY_RESULTS_FORMAT_JSON,
    QUERY_RESULTS_HTML_MAX_ROWS_KEY,
    QUERY_RESULTS_HTML_MAX_ROWS_VAR,
    QUERY_RESULTS_HTML_MAX_ROWS_DEFAULT,
  } = require('../constants')

async function render(
  context,
  report,
  channelConfig,
  output,
  preferredOutputFormat,
) {
  const { columns, rows } = output.data

  /*
   * If the output does not contain `columns` and `rows` properties, then
   * the query generator passed the raw graphql through. All we can do is turn
   * the graphql response into JSON.
   */
  if (!columns && !rows) {
    return JSON.stringify(output.data)
  }

  /*
   * Columns and rows were set by the query generator. Use the output format
   * specified in preferredOutputFormat or the channel configuration to
   * determine what to generate.
   */

  const outputFormat = getOption(
    channelConfig,
    QUERY_RESULTS_FORMAT_KEY,
    QUERY_RESULTS_FORMAT_VAR,
  ) || preferredOutputFormat || QUERY_RESULTS_FORMAT_DEFAULT

  if (outputFormat.toLowerCase() === QUERY_RESULTS_FORMAT_JSON) {
    return JSON.stringify(
      output.data.rows.map(row => (
        output.data.columns.reduce((accum, col) => {
          accum[col] = row[col] ? row[col] : null
          return accum
        }, {})
      )),
    )
  }

  if (outputFormat.toLowerCase() === QUERY_RESULTS_FORMAT_HTML) {
    const maxRows = toNumber(getOption(
      channelConfig,
      QUERY_RESULTS_HTML_MAX_ROWS_KEY,
      QUERY_RESULTS_HTML_MAX_ROWS_VAR,
      QUERY_RESULTS_HTML_MAX_ROWS_DEFAULT,
    ))

    return buildHtml(
      output.data.columns,
      output.data.rows,
      maxRows,
    )
  }

  return buildCsv(output.data.columns, output.data.rows)
}

module.exports = render
