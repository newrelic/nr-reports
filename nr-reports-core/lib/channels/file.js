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

  /*
   * Ensure the destination directory and any directories along the path
   * exist.
   */
  await mkdir(destDir, { recursive: true })

  /*
   * Copy all output files to the destination directory. The basename of each
   * of the input files is used for the name of each output file in the
   * destination directory.
   */
  for (let index = 0; index < output.files.length; index += 1) {
    const file = output.files[index],
      fileName = path.basename(file)

    await copyFile(file, path.join(destDir, fileName))
  }
}

async function saveToFile(context, report, channelConfig, output) {
  const outputFileName = output.getOutputFileName(context, report)
  let outputPath = outputFileName

  /*
   * If the output file name is relative, ensure the destination directory
   * and any directories along the path exist and set the output path to the
   * destination directory plus the output file name.
   */
  if (!path.isAbsolute(outputPath)) {
    const destDir = context.get(
      FILE_DEST_DIR_KEY,
      FILE_DEST_DIR_VAR,
      FILE_DEST_DIR_DEFAULT,
    )

    await mkdir(destDir, { recursive: true })

    outputPath = path.join(destDir, outputFileName)
  }

  /*
   * Render the output and save it in the specified output file.
   */
  await writeFile(
    outputPath,
    await output.render(
      context,
      report,
      channelConfig,
    ),
  )
}

async function copyToDestDir(
  context,
  manifest,
  report,
  publishConfig,
  channelConfig,
  output,
) {

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
