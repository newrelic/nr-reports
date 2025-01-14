'use strict'

const { getOption, buildCsv, buildHtml, toNumber } = require('../util'),
  { renderTemplate } = require('../template-engines'),
  {
    FILE_TEMPLATE_NAME_KEY,
    FILE_TEMPLATE_VAR,
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
  const template = getOption(
    channelConfig,
    FILE_TEMPLATE_NAME_KEY,
    FILE_TEMPLATE_VAR,
  )

  /*
   * If no template was specified, return the unprocessed raw data or
   * build a CSV.
   */
  if (!template) {
    const { columns, rows } = output.data

    /*
     * If the output does not contain `columns` and `rows` properties, then
     * the query generator passed the raw graphql through. If there is no
     * template (which is a weird case), all we can do is turn the graphql
     * response into JSON.
     */
    if (!columns && !rows) {
      return JSON.stringify(output.data)
    }

    /*
     * Columns and rows were set by the query generator. Use the output format
     * specified in preferredOutputFormat or the channel configuration to
     * determine what to generate.
     */

    const outputFormat = preferredOutputFormat || (
      getOption(
        channelConfig,
        QUERY_RESULTS_FORMAT_KEY,
        QUERY_RESULTS_FORMAT_VAR,
        QUERY_RESULTS_FORMAT_DEFAULT,
      )
    )

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

  /*
   * Otherwise, render the template with the output data. The data could be
   * either the processed columns and rows or an array of the raw GraphQL
   * results (if passThrough was specified on the query).
   *
   * TODO: This would re-render the template for every channel which calls
   * output.render() for a given report.
   */
  return await renderTemplate(
    context.context({ result: output.data }),
    report,
    template,
  )
}

module.exports = render
