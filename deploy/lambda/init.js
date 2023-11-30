/* eslint-disable */
const { readFileSync: rfs, existsSync: es } = require('fs'),
  tp = require('js-yaml').load(rfs(`${process.argv[2]}/cf-template.yaml`), {schema: require('yaml-cfn').schema}).Parameters,
  pj = es(`${process.argv[2]}/../package.json`) && JSON.parse(rfs(`${process.argv[2]}/../package.json`)),
  o = Object.assign(
    Object.keys(tp).reduce((m,k) => (m[k]=tp[k].Default, m),{}),
    JSON.parse(rfs(`${process.argv[2]}/cf-params.${process.argv[3]}.json`)).reduce((m,k) => (m[k.ParameterKey]=k.ParameterValue,m),{}),
    pj ? { appName: pj.name, appVersion: pj.version } : {},
  )
console.log(`${Object.keys(o).reduce((m,k) => (`${m}${require('change-case').constantCase(k)}=${typeof o[k] === 'string'?o[k].replace(' ', '\\ '):o[k]||''}\n`),'')}`)
