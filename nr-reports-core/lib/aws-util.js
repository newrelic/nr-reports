'use strict'

const {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
  } = require('@aws-sdk/client-s3'),
  {
    SecretsManagerClient,
    GetSecretValueCommand,
  } = require('@aws-sdk/client-secrets-manager'),
  {
    SchedulerClient,
    CreateScheduleCommand,
    DeleteScheduleCommand,
    GetScheduleCommand,
    ListSchedulesCommand,
    UpdateScheduleCommand,
    ResourceNotFoundException,
  } = require('@aws-sdk/client-scheduler'),
  { createLogger } = require('./logger')

// Create an Amazon S3 service client object.
const logger = createLogger('aws-util'),
  s3Client = new S3Client({}),
  secretsManagerClient = new SecretsManagerClient({}),
  schedulerClient = new SchedulerClient({})

async function getSecretAsJson(secretName) {
  const response = await secretsManagerClient.send(
    new GetSecretValueCommand({
      SecretId: secretName,
    }),
  )

  if (response.SecretBinary) {
    // We only support string-based secrets at this time because it is unclear
    // from the API docs if the data in the returned UInt8Array is base64
    // encoded or not and whether or not it is expected to be JSON.
    throw new Error('Unexpected binary secret found. Binary secrets are not supported.')
  }

  if (response.SecretString) {
    return JSON.parse(response.SecretString)
  }

  return {}
}

async function getSecretValue(secretName, secretKey) {
  const secretObj = await getSecretAsJson(secretName)

  return secretObj[secretKey]
}

async function getS3Object(bucket, key) {
  logger.trace(`Getting object with ${key} from bucket ${bucket}...`)

  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )

  logger.trace(`Got object with ${key} from bucket ${bucket}.`)

  return response
}

async function getS3ObjectAsString(bucket, key) {
  const response = await getS3Object(bucket, key)

  // Convert Body to a String
  return await response.Body.transformToString('utf-8')
}

async function putS3Object(bucket, key, content) {
  logger.trace(`Putting object with ${key} into bucket ${bucket}...`)

  const response = await s3Client.send(new PutObjectCommand({
    Body: content,
    Bucket: bucket,
    Key: key,
  }))

  logger.trace(`Put object with ${key} into bucket ${bucket}.`)

  return response
}

async function createSchedule(
  groupName,
  name,
  scheduleExpression,
  targetArn,
  targetRoleArn,
  input,
  description = '',
  enabled = true,
  startDate = null,
  endDate = null,
  flexTimeWindowMax = null,
) {
  logger.trace(`Creating schedule with name ${name} in group name ${groupName}...`)

  const target = {
      Arn: targetArn,
      Input: input,
      RoleArn: targetRoleArn,
    },
    flexibleTimeWindow = flexTimeWindowMax ? {
      MaximumWindowInMinutes: flexTimeWindowMax,
      Mode: 'FLEXIBLE',
    } : { Mode: 'OFF' },
    createScheduleParams = {
      GroupName: groupName,
      Name: name,
      Description: description,
      ScheduleExpression: scheduleExpression,
      FlexibleTimeWindow: flexibleTimeWindow,
      State: enabled ? 'ENABLED' : 'DISABLED',
      Target: target,
    }

  if (startDate) {
    createScheduleParams.StartDate = startDate
  }

  if (endDate) {
    createScheduleParams.EndDate = endDate
  }

  return await schedulerClient.send(
    new CreateScheduleCommand(createScheduleParams),
  )
}

async function listSchedulesHelper(groupName, nextToken = null, schedules = []) {
  const listScheduleParams = {
    GroupName: groupName,
  }

  if (nextToken) {
    listSchedulesParams.NextToken = nextToken
  }

  const response = await schedulerClient.send(
    new ListSchedulesCommand(listScheduleParams),
  )

  if (response.NextToken) {
    return await listSchedulesHelper(
      groupName,
      response.NextToken,
      schedules.concat(response.Schedules),
    )
  }

  if (!response.Schedules) {
    return schedules
  }

  return schedules.concat(response.Schedules)
}

async function listSchedules(groupName) {
  logger.trace(`Listing all schedules in group name ${groupName}...`)

  return await listSchedulesHelper(groupName)
}

async function getSchedule(groupName, name) {
  logger.trace(`Getting schedule with name ${name} in group name ${groupName}...`)

  try {
    return await schedulerClient.send(
      new GetScheduleCommand({
        GroupName: groupName,
        Name: name,
      }),
    )
  } catch (err) {
    if (!(err instanceof ResourceNotFoundException)) {
      throw err
    }

    return null
  }
}

async function updateSchedule(
  schedule,
) {
  logger.trace(`Updating schedule with name ${schedule.Name} in group name ${schedule.GroupName}...`)

  const updateScheduleParams = { ...schedule }

  delete updateScheduleParams.Arn
  delete updateScheduleParams.CreationDate
  delete updateScheduleParams.LastModificationDate

  return await schedulerClient.send(
    new UpdateScheduleCommand(updateScheduleParams),
  )
}

async function deleteSchedule(groupName, name) {
  logger.trace(`Deleting schedule with name ${name} in group name ${groupName}...`)

  return await schedulerClient.send(
    new DeleteScheduleCommand({
      GroupName: groupName,
      Name: name,
    }),
  )
}

module.exports = {
  createSchedule,
  listSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  getSecretAsJson,
  getSecretValue,
  getS3Object,
  getS3ObjectAsString,
  putS3Object,
}
