'use strict'

const { createWriteStream } = require('fs'),
  path = require('path'),
  fetch = require('node-fetch'),
  { pipeline } = require('stream'),
  { promisify } = require('util'),
  PDFMerger = require('pdf-merger-js'),
  { createLogger } = require('../logger'),
  { NerdgraphClient } = require('../nerdgraph')

const logger = createLogger('dashboard-generator'),
  streamPipeline = promisify(pipeline)

async function downloadDashboardPdf(apiKey, dashboard, downloadDir) {
  const query = `{
      dashboardCreateSnapshotUrl(guid: $guid)
    }`,
    options = {
      nextCursonPath: null,
      mutation: true,
      headers: {},
    },
    nerdgraph = new NerdgraphClient(),
    results = await nerdgraph.query(
      apiKey,
      query,
      { guid: ['EntityGuid!', dashboard] },
      options,
    ),
    dashboardPdfFileName = path.join(
      downloadDir,
      `dashboard-${dashboard}.pdf`,
    ),
    dashboardUrl = results[0].dashboardCreateSnapshotUrl

  // todo: check for errors

  logger.verbose(`Fetching dashboard ${dashboardUrl}...`)

  const response = await fetch(dashboardUrl)

  if (!response.ok) {
    throw new Error(`Download PDF at ${dashboardUrl} failed: status=${response.status}`)
  }

  logger.verbose(`Writing PDF to ${dashboardPdfFileName}...`)
  await streamPipeline(response.body, createWriteStream(dashboardPdfFileName))
  logger.verbose(`Wrote PDF to ${dashboardPdfFileName}...`)

  return dashboardPdfFileName
}

async function mergePdfs(dashboardPdfs, consolidatedPdf) {
  const merger = new PDFMerger()

  logger.verbose(log => {
    log(`Merging ${dashboardPdfs.length} PDFs to ${consolidatedPdf}...`)
    dashboardPdfs.forEach(pdf => log(pdf))
  })

  dashboardPdfs.forEach(dashboard => merger.add(dashboard))

  logger.verbose(`Creating consolidated PDF ${consolidatedPdf}...`)
  await merger.save(consolidatedPdf)
}

async function generateDashboardReport(
  context,
  manifest,
  report,
  tempDir,
) {
  let consolidatedPdf

  try {
    const {
      dashboards,
      combinePdfs,
    } = report

    logger.verbose(`Running dashboard report for dashboards [${dashboards}]...`)

    const promises = dashboards.map(async dashboard => (
        await downloadDashboardPdf(context.apiKey, dashboard, tempDir)
      )),
      dashboardPdfs = await Promise.all(promises)

    if (combinePdfs && dashboardPdfs.length > 1) {
      consolidatedPdf = path.join(tempDir, 'consolidated_dashboards.pdf')
      await mergePdfs(dashboardPdfs, consolidatedPdf)
    }

    return combinePdfs ? [consolidatedPdf] : dashboardPdfs
  } catch (err) {
    logger.error(err)
  }

  return null
}

module.exports = {
  generate: generateDashboardReport,
}
