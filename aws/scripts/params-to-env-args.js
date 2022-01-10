'use strict'

const yaml = require('js-yaml'),
  { schema } = require('yaml-cfn'),
  fs = require('fs'),
  // eslint-disable-next-line node/no-unpublished-require
  { constantCase } = require('change-case')

const templateParams = yaml.load(fs.readFileSync(process.argv[2]), { schema }).Parameters,
  params = JSON.parse(fs.readFileSync(process.argv[3])),
  obj = Object.assign(
    Object.keys(templateParams).reduce((accumulator, key) => {
      if (templateParams[key].Default) {
        accumulator[key] = templateParams[key].Default
      }
      return accumulator
    }, {}),
    params.reduce((accumulator, value) => {
      accumulator[value.ParameterKey] = value.ParameterValue
      return accumulator
    }, {}),
  )

// eslint-disable-next-line no-console
console.log(
  Object.keys(obj).reduce((accumulator, value) => (
    `${accumulator} -e ${constantCase(value)}="${obj[value]}"`
  ), ''),
)
