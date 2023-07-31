'use strict'

const fs = require('fs'),
  path = require('path'),
  { getOption } = require('../util'),
  { putS3Object } = require('../aws-util'),
  {
    S3_DEST_BUCKET_VAR,
    S3_DEST_BUCKET_KEY,
    S3_SOURCE_BUCKET_VAR,
    S3_SOURCE_BUCKET_KEY,
  } = require('../constants')

async function uploadToS3(context, manifest, report, channelConfig, output) {
  const bucket = context.get(S3_DEST_BUCKET_KEY, S3_DEST_BUCKET_VAR)

  /*
   * If the output is already a file output, just upload it to the s3 bucket.
   */
  if (output.isFile()) {
    for (let index = 0; index < output.files.length; index += 1) {
      const file = output.files[index],
        fileName = path.basename(file),
        stream = fs.createReadStream(file)

      await putS3Object(bucket, fileName, stream)
    }

    return
  }

  /*
   * Otherwise, render the output to a file and upload the result to the s3
   * bucket.
   */
  await putS3Object(
    bucket,
    output.getOutputFileName(context, report),
    await output.render(
      context,
      report,
      channelConfig,
    ),
  )
}

module.exports = {
  publish: uploadToS3,
  getChannelDefaults: options => ({
    bucket: (
      process.env.S3_DEST_BUCKET ||
      getOption(options, S3_SOURCE_BUCKET_KEY, S3_SOURCE_BUCKET_VAR)
    ),
  }),
}
