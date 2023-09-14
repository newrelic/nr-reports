'use strict'

const S3 = require('aws-sdk/clients/s3'),
  SecretsManager = require('aws-sdk/clients/secretsmanager'),
  { createLogger } = require('./logger')


// Create an Amazon S3 service client object.
const logger = createLogger('aws-util'),
  s3 = new S3(),
  secretsManager = new SecretsManager()

function getSecret(secretName) {
  const getParams = {
    SecretId: secretName,
  }

  return new Promise((resolve, reject) => {
    logger.trace(`Retrieving secret ${secretName}...`)

    secretsManager.getSecretValue(getParams, (err, data) => {
      if (err) {
        reject(err)
        return
      }

      let secret

      // Decrypts secret using the associated KMS CMK.
      // Depending on whether the secret is a string or binary, one of these fields will be populated.
      if ('SecretString' in data) {
        logger.trace(`Found SecretString in secret ${secretName}.`)
        secret = data.SecretString
      } else {
        logger.trace(`No SecretString in secret ${secretName}. Decoding SecretBinary...`)

        const buff = Buffer.from(data.SecretBinary, 'base64')

        secret = buff.toString('ascii')
      }

      resolve(secret)
    })
  })
}

function getSecretAsJson(secretName) {
  return getSecret(secretName)
    .then(secret => {
      logger.trace(`Parsing secret value for ${secretName} as JSON...`)

      return JSON.parse(secret)
    })
}

function getSecretValue(secretName, secretKey) {
  logger.trace(`Retrieving secret value for secret ${secretName} with key ${secretKey}...`)

  return getSecretAsJson(secretName)
    .then(secretObj => secretObj[secretKey])
}

function getS3Object(bucket, key) {
  const getParams = {
    Bucket: bucket, // your bucket name,
    Key: key, // path to the object you're looking for
  }

  return new Promise((resolve, reject) => {
    logger.trace(`Getting object with ${key} from bucket ${bucket}...`)

    s3.getObject(getParams, (err, data) => {

      // Handle any error and exit
      if (err) {
        reject(err)
        return
      }

      logger.trace(`Got object with ${key} from bucket ${bucket}.`)

      resolve(data)
    })
  })
}

async function getS3ObjectAsString(bucket, key) {
  const data = await getS3Object(bucket, key)

  // Convert Body from a Buffer to a String
  return data.Body.toString('utf-8')
}

function putS3Object(bucket, key, content) {
  const putParams = {
    Body: content,
    Bucket: bucket,
    Key: key,
  }

  return new Promise((resolve, reject) => {
    logger.trace(`Putting object with ${key} into bucket ${bucket}...`)

    s3.putObject(putParams, (err, data) => {

      // Handle any error and exit
      if (err) {
        reject(err)
        return
      }

      logger.trace(`Put object with ${key} into bucket ${bucket}.`)

      resolve(data)
    })
  })
}

module.exports = {
  getSecret,
  getSecretAsJson,
  getSecretValue,
  getS3Object,
  getS3ObjectAsString,
  putS3Object,
}
