#!/usr/bin/env node
/**
 * Evaluate CS-008/CS-009 against a seed set of real CUAD clauses with our own
 * stance/risk annotations. This is not a lawyer-reviewed gold set; see README.
 */
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as plugin from '../../lib/index.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const seed = JSON.parse(await readFile(join(here, 'seed.json'), 'utf8'))
const matrix = {
  'Governing Law': ['中', '低'],
  'Uncapped Liability': ['高'],
  'Non-Compete': ['高'],
}
const packText = await readFile(join(here, '../../rules/contract-stance.yaml'), 'utf8')
const configured = packText.replace('        matrix: {}', `        matrix: ${JSON.stringify(matrix)}`)
if (configured === packText) throw new Error('matrix placeholder not found in rule pack')
const dir = await mkdtemp(join(tmpdir(), 'contract-seed-'))
const rulesFile = join(dir, 'rules.yaml')
await writeFile(rulesFile, configured)

const registered = []
plugin.apply({ tools: { register: (tool) => { registered.push(tool); return () => {} } } }, plugin.Config ? plugin.Config({}) : {})
const tool = registered.find((item) => item.name === plugin.TOOL_NAME)
if (!tool) throw new Error('contract tool not registered')

async function run(rows) {
  const material = JSON.stringify({ contractName: seed.contractName, party: seed.party, rows })
  const result = await tool.execute({ material, rulesFile }, { signal: new AbortController().signal })
  return JSON.parse(result.reportJson).issues ?? []
}

const rows = seed.rows
const clean = await run(rows)
const cleanHas = (rule) => clean.some((issue) => issue.ruleId === rule)

for (const rule of ['CS-008', 'CS-009']) {
  let tp = 0, fp = 0, fn = 0, tn = 0
  for (const row of rows) {
    const mutated = rule === 'CS-008'
      ? { ...row, 退让底线等级: '9' }
      : { ...row, 风险等级: row.条款主题 === 'Governing Law' ? '高' : '低' }
    const positive = await run([mutated])
    if (positive.some((issue) => issue.ruleId === rule)) tp += 1
    else fn += 1
    const negative = await run([row])
    if (negative.some((issue) => issue.ruleId === rule)) fp += 1
    else tn += 1
  }
  const precision = tp + fp === 0 ? null : tp / (tp + fp)
  const recall = tp + fn === 0 ? null : tp / (tp + fn)
  console.log(`${rule}: TP ${tp} FP ${fp} FN ${fn} TN ${tn} P ${precision?.toFixed(3)} R ${recall?.toFixed(3)}`)
}
if (cleanHas('CS-008') || cleanHas('CS-009')) throw new Error('clean seed produced CS-008/CS-009 findings')
await rm(dir, { recursive: true, force: true })
