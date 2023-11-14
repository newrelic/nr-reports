'use strict'

const {
  template: templateRenderer,
  query: queryRenderer,
} = require('./renderers')

function getExtension(context, defaultExtension = null) {
  const fileExtension = context.get('fileExtension', 'FILE_EXTENSION')

  if (fileExtension) {
    return fileExtension
  }

  return defaultExtension || 'txt'
}

function getDefaultOutputFileName(report, extension) {
  return `${report.id}.${extension}`
}

function getOutputFileName(context, report, defaultExtension = null) {
  if (context.outputFileName) {
    return context.outputFileName
  }

  return getDefaultOutputFileName(
    report,
    getExtension(context, defaultExtension),
  )
}

class Output {
  constructor(data, renderer = templateRenderer) {
    this.data = data
    this.renderer = renderer
  }

  isFile() {
    return false
  }

  getOutputFileName(context, report) {
    return getOutputFileName(context, report)
  }

  async render(context, report, channelConfig) {
    return await this.renderer(context, report, channelConfig, this)
  }
}

class QueryOutput {
  constructor(data, isProcessed) {
    this.output = new Output(data, queryRenderer)
    this.isProcessed = isProcessed
  }

  isFile() {
    return false
  }

  getOutputFileName(context, report) {
    return getOutputFileName(context, report, this.isProcessed && 'csv')
  }

  async render(context, report, channelConfig) {
    return await this.output.render(context, report, channelConfig)
  }
}

class FileOutput {
  constructor(files) {
    this.files = files
    this.renderer = null
  }

  isFile() {
    return true
  }
}

module.exports = {
  getDefaultOutputFileName,
  Output,
  QueryOutput,
  FileOutput,
}
