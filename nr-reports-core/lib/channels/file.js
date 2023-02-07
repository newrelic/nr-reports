'use strict'

const fs = require('fs').promises,
  path = require('path')

async function copyToDestDir(report, channelConfig, files) {
  const destDir = channelConfig.destDir || process.env.FILE_DEST_DIR || '.'

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
