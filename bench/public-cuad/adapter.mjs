#!/usr/bin/env node
/**
 * Adapt CUAD v1 expert annotations into the dsh-contract-stance ledger shape.
 *
 * What this maps (and only this):
 *   - CUAD category            -> 条款主题 (topic)
 *   - CUAD answer span         -> 条款原文 (text), whitespace-collapsed
 *   - CUAD Document Name       -> header contractName
 *
 * What it deliberately does NOT map:
 *   - stance, riskLevel, riskNote, fallback, mustHave, owner, clauseNo
 *   - header party / counterparty / version / contractNo
 * CUAD contains no negotiation stance, risk rating, fallback bottom line,
 * must-have flag, owner, clause number, or own-side designation. Inventing
 * those values would let the benchmark manufacture passes; the fields are
 * therefore omitted and the dependent rules are excluded (see mapping.json
 * and evaluate.mjs). The literal string "not provided" is never written into
 * a ledger cell: the engine treats any non-empty cell as filled, so a sentinel
 * would be a fake pass rather than an honest absence.
 *
 * Selection is deterministic: for each of the 36 clause-like categories, the
 * first five eligible contracts in title order, one answer span each. An
 * answer is eligible when it is at least 40 characters after whitespace
 * collapsing and contains none of CS-007's placeholder terms, so a "clean"
 * case really is clean for both scored rules.
 *
 * Usage:
 *   node bench/public-cuad/adapter.mjs [CUADv1.json] [cases.json]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const input = process.argv[2] ?? join(here, '.data', 'CUADv1.json')
const output = process.argv[3] ?? join(here, 'cases.json')

/** Minimum length of a mapped answer span; shorter spans are names/dates/numbers. */
const MIN_TEXT_LENGTH = 40
/** One row per contract/category; five contracts per category keeps the subset inspectable. */
const PER_CATEGORY = 5
/** The exact term list used by CS-007; clean bases must not already contain one. */
const PLACEHOLDER_TERMS = ['【', '】', '{{', '}}', 'XXX', 'xxx', '待填', '待补充', 'TBD', 'todo', '示例']
/** Rules whose fields are carried by this mapping. */
const ELIGIBLE_RULES = ['CS-001', 'CS-007']

function normaliseText(value) {
  return String(value ?? '').replace(/[\s\u00a0\u3000]+/g, ' ').trim()
}

function hasPlaceholder(text) {
  return PLACEHOLDER_TERMS.some((term) => text.includes(term))
}

/** The qa id is `<contract title>__<category>`; titles may contain `__`, so split at the last separator. */
function categoryOf(qa) {
  const id = String(qa?.id ?? '')
  const at = id.lastIndexOf('__')
  if (at < 0 || at + 2 >= id.length) throw new Error(`CUAD qa id has no category suffix: ${id}`)
  return id.slice(at + 2)
}

/** The first non-empty answer span, with its source offset. */
function firstAnswer(qa) {
  const answers = Array.isArray(qa?.answers) ? qa.answers : []
  for (const answer of answers) {
    const text = normaliseText(answer?.text)
    if (text !== '') return { text, answerStart: Number.isInteger(answer?.answer_start) ? answer.answer_start : null }
  }
  return null
}

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

const mapping = JSON.parse(readFileSync(join(here, 'mapping.json'), 'utf8'))
const mappingByCategory = new Map(mapping.categories.map((entry) => [entry.category, entry]))
if (mappingByCategory.size !== 41) throw new Error(`mapping.json must cover 41 categories, got ${mappingByCategory.size}`)

const document = JSON.parse(readFileSync(input, 'utf8'))
if (!Array.isArray(document.data)) throw new Error(`${input}: expected a CUAD object with a data array`)

const seenCategories = new Set()
const candidates = new Map(mapping.categories.filter((entry) => entry.scope === 'row').map((entry) => [entry.category, []]))
let qaCount = 0
let contractCount = 0

for (const contract of document.data) {
  contractCount += 1
  const title = normaliseText(contract?.title) || '(untitled CUAD contract)'
  let documentName = ''
  const perCategory = new Map()

  for (const paragraph of Array.isArray(contract?.paragraphs) ? contract.paragraphs : []) {
    for (const qa of Array.isArray(paragraph?.qas) ? paragraph.qas : []) {
      qaCount += 1
      const category = categoryOf(qa)
      seenCategories.add(category)
      const conf = mappingByCategory.get(category)
      if (conf === undefined) throw new Error(`CUAD category is missing from mapping.json: ${category}`)
      const answer = firstAnswer(qa)
      if (answer === null) continue
      if (category === 'Document Name') {
        if (documentName === '') documentName = answer.text
        continue
      }
      if (!perCategory.has(category)) perCategory.set(category, answer)
    }
  }

  const contractName = documentName === '' ? title : documentName
  for (const [category, answer] of perCategory) {
    const conf = mappingByCategory.get(category)
    if (conf.scope !== 'row') continue
    if (answer.text.length < MIN_TEXT_LENGTH) continue
    if (hasPlaceholder(answer.text)) continue
    candidates.get(category).push({
      contract: title,
      contractName,
      category,
      text: answer.text,
      answerStart: answer.answerStart,
    })
  }
}

for (const entry of mapping.categories) {
  if (!seenCategories.has(entry.category)) throw new Error(`mapping.json category not present in CUAD data: ${entry.category}`)
}
for (const category of seenCategories) {
  if (!mappingByCategory.has(category)) throw new Error(`CUAD category not covered by mapping.json: ${category}`)
}

const cases = []
let index = 0
for (const entry of mapping.categories) {
  if (entry.scope !== 'row') continue
  const selected = (candidates.get(entry.category) ?? [])
    .sort((left, right) => compare(left.contract, right.contract) || (left.answerStart ?? 0) - (right.answerStart ?? 0))
    .slice(0, PER_CATEGORY)
  for (const item of selected) {
    index += 1
    cases.push({
      id: `cuad-${String(index).padStart(3, '0')}`,
      label: 'clean',
      category: item.category,
      contract: item.contract,
      answerStart: item.answerStart,
      ledger: {
        contractName: item.contractName,
        rows: [{ 条款主题: item.category, 条款原文: item.text }],
      },
      eligibleRules: [...ELIGIBLE_RULES],
      provenance: {
        dataset: 'CUAD v1',
        category: item.category,
        contract: item.contract,
        answerStart: item.answerStart,
        text: 'CUAD answer span, whitespace-collapsed; not rewritten',
      },
    })
  }
}

const fieldsNotProvided = Object.entries(mapping.fields)
  .filter(([, value]) => value.status === 'not-provided')
  .map(([field]) => field)
const headerNotProvided = Object.entries(mapping.headerFields)
  .filter(([, value]) => value.status === 'not-provided')
  .map(([field]) => field)

const payload = {
  dataset: mapping.dataset,
  source: mapping.source,
  revision: mapping.revision,
  license: mapping.license,
  dataFile: basename(input),
  generatedAt: new Date().toISOString(),
  selection: {
    contractsAvailable: contractCount,
    qasAvailable: qaCount,
    categoriesAvailable: seenCategories.size,
    rowCategories: [...candidates.keys()].length,
    perCategory: PER_CATEGORY,
    minTextLength: MIN_TEXT_LENGTH,
    excludedPlaceholderTerms: PLACEHOLDER_TERMS,
    note:
      'For each row category, the first five eligible contracts in title order, one answer span each. ' +
      'Eligible means the answer is at least 40 chars after whitespace collapsing and contains no CS-007 placeholder term.',
  },
  fields: mapping.fields,
  headerFields: mapping.headerFields,
  fieldsNotProvided,
  headerFieldsNotProvided: headerNotProvided,
  excludedRules: [
    { rule: 'CS-002', fields: ['stance'], reason: mapping.fields.stance.reason },
    { rule: 'CS-003', fields: ['riskLevel'], reason: mapping.fields.riskLevel.reason },
    { rule: 'CS-004', fields: ['mustHave', 'fallback', 'owner'], reason: 'CUAD has no must-have flag, fallback bottom line or owner.' },
    { rule: 'CS-005', fields: ['clauseNo'], reason: mapping.fields.clauseNo.reason },
    { rule: 'CS-006', fields: ['contractName', 'party'], reason: mapping.headerFields.party.reason },
  ],
  cases,
}

writeFileSync(output, JSON.stringify(payload, null, 2) + '\n')
const counts = cases.reduce((acc, item) => acc.set(item.category, (acc.get(item.category) ?? 0) + 1), new Map())
const missing = [...counts].filter(([, count]) => count < PER_CATEGORY)
console.log(`read ${contractCount} contracts / ${qaCount} qas / ${seenCategories.size} categories from ${input}`)
console.log(`wrote ${output}: ${cases.length} clean cases across ${counts.size} row categories (${[...counts].map(([c, n]) => `${c}=${n}`).join(', ')})`)
if (missing.length > 0) console.log(`note: categories with fewer than ${PER_CATEGORY} eligible contracts: ${missing.map(([c, n]) => `${c}=${n}`).join(', ')}`)
console.log(`not provided (never written as sentinels): ${fieldsNotProvided.join(', ')}; header: ${headerNotProvided.join(', ')}`)
