/* eslint-disable */
const { readFileSync: rfs } = require('fs'),
  tp = require('js-yaml').load(rfs(`${process.argv[2]}/cf-template.yaml`), {schema: require('yaml-cfn').schema}).Parameters,
  o = Object.assign(
    Object.keys(tp).reduce((m,k) => (m[k]=tp[k].Default, m),{}),
    JSON.parse(rfs(`${process.argv[2]}/cf-params.${process.argv[3]}.json`)).reduce((m,k) => (m[k.ParameterKey]=k.ParameterValue,m),{}),
  )
console.log(`${Object.keys(o).reduce((m,k) => (`${m}${require('change-case').constantCase(k)}=${typeof o[k] === 'string'?o[k].replace(' ', '\\ '):o[k]||''}\n`),'')}`)
