import nodeModuleAssert from 'assert'
import { createOptionParser, OPTION_CONFIG_PRESET } from './OptionParser'

const { describe, it } = global
global.__DEV__ = false

const optionData = {
  prefixENV: 'prefix-ENV',
  prefixJSON: 'prefix-JSON',
  formatList: [
    { name: 'option-name-a', shortName: 'a', argumentCount: 0 },
    { name: 'option-name-b', shortName: 'b', optional: true, ...OPTION_CONFIG_PRESET.SingleInteger },
    { name: 'option-name-c', shortName: 'c', ...OPTION_CONFIG_PRESET.AllNumber, argumentCount: 2 },
    { name: 'option-name-aa', shortName: 'A', optional: true, argumentCount: '0+', description: 'TEST DESCRIPTION A' },
    { name: 'option-name-bb', shortName: 'B', optional: true, ...OPTION_CONFIG_PRESET.AllString, argumentCount: '1+', description: 'TEST DESCRIPTION B\nTEST DESCRIPTION B\nTEST DESCRIPTION B' },
    { name: 'option-name-cc', shortName: 'C', optional: true, ...OPTION_CONFIG_PRESET.AllNumber, argumentCount: '2+', description: 'TEST DESCRIPTION C\n' }
  ]
}
const optionNameList = optionData.formatList.map(({ name }) => name)
const { parseCLI, parseENV, parseJSON, processOptionMap, formatUsage } = createOptionParser(optionData)

const checkArgumentList = (optionMap) => {
  nodeModuleAssert.ok(optionMap[ 'option-name-a' ].argumentList.length === 0)

  nodeModuleAssert.ok(optionMap[ 'option-name-b' ].argumentList.length === 1)
  nodeModuleAssert.ok(optionMap[ 'option-name-b' ].argumentList[ 0 ] === 1)

  nodeModuleAssert.ok(optionMap[ 'option-name-c' ].argumentList.length === 2)
  nodeModuleAssert.ok(optionMap[ 'option-name-c' ].argumentList[ 0 ] === 1)
  nodeModuleAssert.ok(optionMap[ 'option-name-c' ].argumentList[ 1 ] === 2.2)

  nodeModuleAssert.ok(optionMap[ 'option-name-aa' ].argumentList.length === 0)

  nodeModuleAssert.ok(optionMap[ 'option-name-bb' ].argumentList.length === 1)
  nodeModuleAssert.ok(optionMap[ 'option-name-bb' ].argumentList[ 0 ] === '1')

  nodeModuleAssert.ok(optionMap[ 'option-name-cc' ].argumentList.length === 4)
  nodeModuleAssert.ok(optionMap[ 'option-name-cc' ].argumentList[ 0 ] === 1)
  nodeModuleAssert.ok(optionMap[ 'option-name-cc' ].argumentList[ 1 ] === 2.2)
  nodeModuleAssert.ok(optionMap[ 'option-name-cc' ].argumentList[ 2 ] === 3.3)
  nodeModuleAssert.ok(optionMap[ 'option-name-cc' ].argumentList[ 3 ] === 4.4)
}

describe('OptionParser.formatUsage', () => {
  const message = 'TEST_MESSAGE'
  it('should pass formatUsage()', () => nodeModuleAssert.ok(formatUsage().length > 0))
  it('should pass formatUsage(message)', () => nodeModuleAssert.ok(formatUsage(message).includes(message)))
  it('should pass formatUsage(error)', () => nodeModuleAssert.ok(formatUsage(new Error(message)).includes(message)))
})

describe('OptionParser.parseCLI', () => {
  const optionMap0 = parseCLI([
    'NODE',
    'SCRIPT.js',
    '--option-name-a',
    '--option-name-b=1',
    '--option-name-c=1', '2.2',
    '--option-name-cc=1', '2.2', '3.3', '4.4',
    '--option-name-bb', '1',
    '--option-name-aa'
  ])
  it('should pass use name', () => nodeModuleAssert.ok(optionNameList.every((name) => (name in optionMap0))))
  it('should pass processOptionMap use name', () => processOptionMap(optionMap0))
  it('should pass checkArgumentList use name', () => checkArgumentList(optionMap0))

  const optionMap1 = parseCLI([
    'NODE',
    'SCRIPT.js',
    '-a',
    '-b=1',
    '-c=1', '2.2',
    '-A',
    '-B', '1',
    '-C=1', '2.2', '3.3', '4.4'
  ])
  it('should pass use shortName', () => nodeModuleAssert.ok(optionNameList.every((name) => (name in optionMap1))))
  it('should pass processOptionMap use shortName', () => processOptionMap(optionMap1))
  it('should pass checkArgumentList use shortName', () => checkArgumentList(optionMap1))

  const optionMap2 = parseCLI([
    'NODE',
    'SCRIPT.js',
    '-ab=1',
    '-AB', '1',
    '-c=1', '2.2',
    '-C=1', '2.2', '3.3', '4.4'
  ])
  it('should pass use combined shortName', () => nodeModuleAssert.ok(optionNameList.every((name) => (name in optionMap2))))
  it('should pass processOptionMap use combined shortName', () => processOptionMap(optionMap2))
  it('should pass checkArgumentList use combined shortName', () => checkArgumentList(optionMap2))
})

describe('OptionParser.parseENV', () => {
  const optionMap = parseENV({
    PREFIX_ENV_OPTION_NAME_A: '[]',
    PREFIX_ENV_OPTION_NAME_B: '[ "1" ]',
    PREFIX_ENV_OPTION_NAME_C: '[ 1, "2.2" ]',
    PREFIX_ENV_OPTION_NAME_AA: '[]',
    PREFIX_ENV_OPTION_NAME_BB: '"1"',
    PREFIX_ENV_OPTION_NAME_CC: '[ 1, "2.2", 3.3, "4.4" ]'
  })
  it('should pass use nameENV', () => nodeModuleAssert.ok(optionNameList.every((name) => (name in optionMap))))
  it('should pass processOptionMap use nameENV', () => processOptionMap(optionMap))
  it('should pass checkArgumentList use nameENV', () => checkArgumentList(optionMap))
})

describe('OptionParser.parseJSON', () => {
  const optionMap = parseJSON({
    prefixJSONOptionNameA: [],
    prefixJSONOptionNameB: [ 1 ],
    prefixJSONOptionNameC: [ 1, '2.2' ],
    prefixJSONOptionNameAa: [],
    prefixJSONOptionNameBb: [ 1 ],
    prefixJSONOptionNameCc: [ 1, '2.2', 3.3, '4.4' ]
  })
  it('should pass use nameJSON', () => nodeModuleAssert.ok(optionNameList.every((name) => (name in optionMap))))
  it('should pass processOptionMap use nameJSON', () => processOptionMap(optionMap))
  it('should pass checkArgumentList use nameJSON', () => checkArgumentList(optionMap))
})