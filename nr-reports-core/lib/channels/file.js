'use strict'

const fs = require('fs'),
  path = require('path'),
  {
    FILE_DEST_DIR_VAR,
    FILE_DEST_DIR_KEY,
    FILE_DEST_DIR_DEFAULT,
  } = require('../constants')

const { mkdir, copyFile, writeFile } = fs.promises

async function copyFiles(context, output) {
  const destDir = context.get(
    FILE_DEST_DIR_KEY,
    FILE_DEST_DIR_VAR,
    FILE_DEST_DIR_DEFAULT,
  )

  await mkdir(destDir, { recursive: true })

  for (let index = 0; index < output.files.length; index += 1) {
    const file = output.files[index],
      fileName = path.basename(file)

    await copyFile(file, path.join(destDir, fileName))
  }
}

async function saveToFile(context, report, channelConfig, output) {
  const outputFileName = output.getOutputFileName(context, report)
  let outputPath = outputFileName

  if (!path.isAbsolute(outputPath)) {
    const destDir = context.get(
      FILE_DEST_DIR_KEY,
      FILE_DEST_DIR_VAR,
      FILE_DEST_DIR_DEFAULT,
    )

    await mkdir(destDir, { recursive: true })

    outputPath = path.join(destDir, outputFileName)
  }

  await writeFile(
    outputPath,
    await output.render(
      context,
      report,
      channelConfig,
    ),
  )
}
async function copyToDestDir(context, manifest, report, channelConfig, output) {

  /*
   * If the output is already a file output, just copy the files to the destDir.
   */
  if (output.isFile()) {
    await copyFiles(context, output)
    return
  }

  /*
   * Otherwise, save the rendered output to a file.
   */
  await saveToFile(context, report, channelConfig, output)
}

module.exports = {
  publish: copyToDestDir,
  getChannelDefaults: () => ({}),
}
