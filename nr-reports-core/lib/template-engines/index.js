'use strict'

const nunjucks = require('./nunjucks'),
  { getS3ObjectAsString } = require('../aws-util')

const templateEngines = {
  nunjucks,
}

function init(context) {
  Object.getOwnPropertyNames(templateEngines)
    .forEach(engineId => templateEngines[engineId].init(context))
}

function getTemplateEngine(context) {
  const engineId = context.get('templateEngine', null, 'nunjucks'),
    templateEngine = templateEngines[engineId]

  if (!templateEngine) {
    throw new Error(`Invalid template engine ${engineId}`)
  }

  return templateEngine
}

async function renderTemplate(context, report, templateName = null, template = null) {
  const { parameters } = report,
    templateEngine = getTemplateEngine(context),
    renderContext = context.context(parameters)

  if (template !== null) {
    return await templateEngine.fromString(
      template,
      renderContext,
    )
  }

  return await templateEngine(templateName, renderContext)
}

async function processTemplate(
  context,
  manifest,
  report,
) {
  const { templateName } = report

  if (report.S3Bucket) {
    const template = await getS3ObjectAsString(
      report.S3Bucket,
      report.templateName,
    )

    return await renderTemplate(context, report, null, template)
  }

  return await renderTemplate(context, report, templateName)
}

module.exports = {
  init,
  getTemplateEngine,
  processTemplate,
  renderTemplate,
}
