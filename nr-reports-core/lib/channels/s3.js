'use strict'

const fs = require('fs'),
  path = require('path'),
  { putS3Object } = require('../aws-util'),
  { getOption, getProperty } = require('../util')

async function uploadToS3(manifest, report, channelConfig, files) {
  const bucket = getProperty(
    'bucket',
    'S3_DEST_BUCKET',
    null,
    channelConfig,
    manifest.config.s3,
  )

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index],
      fileName = path.basename(file),
      stream = fs.createReadStream(file)

    await putS3Object(bucket, fileName, stream)
  }
}

module.exports = {
  publish: uploadToS3,
  getChannelDefaults: options => ({
    bucket: (
      process.env.S3_DEST_BUCKET ||
      getOption(options, 'sourceBucket', 'S3_SOURCE_BUCKET')
    ),
  }),
}
