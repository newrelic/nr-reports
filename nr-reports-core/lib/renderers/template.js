'use strict'

const { getOption, toString } = require('../util'),
  { renderTemplate } = require('../template-engines'),
  {
    FILE_TEMPLATE_NAME_KEY,
    FILE_TEMPLATE_VAR,
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
   * If no template was specified, return the raw data as a string.
   */
  if (!template) {
    return toString(output.data)
  }

  /*
   * Otherwise, render the template with the output data.
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
