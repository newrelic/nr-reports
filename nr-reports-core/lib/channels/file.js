'use strict'

const fs = require('fs').promises,
  path = require('path'),
  { getProperty } = require('../util')

async function copyToDestDir(manifest, report, channelConfig, files) {
  const destDir = getProperty(
    'destDir',
    'FILE_DEST_DIR',
    '.',
    channelConfig,
    manifest.config.file,
  )

  await fs.mkdir(destDir, { recursive: true })

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index],
      fileName = path.basename(file)

    await fs.copyFile(file, path.join(destDir, fileName))
  }
}

module.exports = {
  publish: copyToDestDir,
  getChannelDefaults: () => ({}),
}
