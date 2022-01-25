'use strict'

const fs = require('fs'),
  path = require('path'),
  { putS3Object } = require('../aws-util')

async function uploadToS3(channelConfig, files) {
  const bucket = channelConfig.bucket || process.env.S3_DEST_BUCKET

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index],
      fileName = path.basename(file),
      stream = fs.createReadStream(file)

    await putS3Object(bucket, fileName, stream)
  }
}

module.exports = uploadToS3
