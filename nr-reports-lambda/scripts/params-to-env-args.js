'use strict'

const yaml = require('js-yaml'),
  { schema } = require('yaml-cfn'),
  fs = require('fs'),
  // eslint-disable-next-line node/no-unpublished-require
  { constantCase } = require('change-case')

function normalizeKey(key) {
  const match = /^NR(.+)/u.exec(key)

  if (!match) {
    return key
  }

  if (key.toLowerCase() === 'nrloglevel') {
    return 'NewRelicExtensionLogLevel'
  }

  return `NewRelic${match[1]}`
}

const templateParams = yaml.load(fs.readFileSync(process.argv[2]), { schema }).Parameters,
  params = JSON.parse(fs.readFileSync(process.argv[3])),
  obj = Object.assign(
    Object.keys(templateParams).reduce((accumulator, key) => {
      if (templateParams[key].Default) {
        accumulator[normalizeKey(key)] = templateParams[key].Default
      }
      return accumulator
    }, {}),
    params.reduce((accumulator, value) => {
      accumulator[normalizeKey(value.ParameterKey)] = value.ParameterValue
      return accumulator
    }, {}),
  )

// eslint-disable-next-line no-console
console.log(
  Object.keys(obj).reduce((accumulator, value) => {
    let v = obj[value]

    if (typeof v === 'string') {
      v = v.replace(' ', '\\ ')
    }

    return `${accumulator} -e ${constantCase(value)}=${v}`
  }, ''),
)
