#!/usr/bin/env node
/**
 * End-to-end evaluation of the real dsh-contract-stance tool on CUAD-derived ledgers.
 *
 * The tool is imported from ../../lib/index.mjs and registered through its own
 * Cordis `apply` hook; this file never reimplements the checker. For each
 * CUAD-groundable rule it takes clean CUAD ledgers as negatives, clones one and
 * injects exactly that rule's defect as a positive, and records TP/FP/FN/TN.
 *
 * Only CS-001 (text presence) and CS-007 (template placeholders in text) are
 * scored. CS-002..CS-006 need stance, riskLevel, mustHave/fallback/owner,
 * clauseNo or party, none of which CUAD provides; see mapping.json. A full-pack
 * run is included to show the exact skip reasons, and contradiction probes show
 * that the rule pack has no stance-vs-fallback or risk-vs-clause check.
 *
 * Usage:
 *   node bench/public-cuad/evaluate.mjs [cases.json]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as plugin from '../../lib/index.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const casesPath = process.argv[2] ?? join(here, 'cases.json')
const casesDocument = JSON.parse(readFileSync(casesPath, 'utf8'))
const cases = casesDocument.cases
if (!Array.isArray(cases) || cases.length === 0) throw new Error(`${casesPath}: no cases`)
const packageJson = JSON.parse(readFileSync(join(here, '..', '..', 'package.json'), 'utf8'))

/** Register the real tool exactly as the quickstart does. */
const registered = []
plugin.apply(
  { tools: { register: (tool) => { registered.push(tool); return () => {} } } },
  plugin.Config ? plugin.Config({}) : {},
)
const tool = registered.find((item) => item.name === plugin.TOOL_NAME)
if (tool === undefined) throw new Error(`tool not registered: ${plugin.TOOL_NAME}`)

const signal = () => new AbortController().signal

/**
 * Execute the real tool on one ledger and parse its canonical report.
 * @param {object} ledger - the plugin's ledger shape.
 * @param {string[] | undefined} only - rule ids to run; undefined runs the full pack.
 * @returns {Promise<object>} the canonical report.
 */
async function execute(ledger, only) {
  const args = { material: JSON.stringify(ledger) }
  if (only !== undefined) args.only = only
  const result = await tool.execute(args, { signal: signal() })
  return JSON.parse(result.reportJson)
}

/** The findings a report carries for one rule. */
function issuesFor(report, rule) {
  return report.issues.filter((issue) => issue.ruleId === rule)
}

/** One injected defect per scored rule. */
const MUTATIONS = {
  'CS-001': {
    label: 'blank-clause-text',
    description: 'Set 条款原文 to an empty string (the required field is present but blank).',
    apply(ledger) {
      ledger.rows[0]['条款原文'] = ''
    },
  },
  'CS-007': {
    label: 'append-template-placeholder',
    description: 'Append the placeholder token 【待填】 to the real CUAD answer span.',
    apply(ledger) {
      ledger.rows[0]['条款原文'] = `${ledger.rows[0]['条款原文']}【待填】`
    },
  },
}

const scoredRules = []
let total = { tp: 0, fp: 0, fn: 0, tn: 0 }

for (const [rule, mutation] of Object.entries(MUTATIONS)) {
  let tp = 0
  let fp = 0
  let fn = 0
  let tn = 0
  let skippedRuns = 0
  let sampleFinding = null
  let sampleCleanFinding = null

  for (const item of cases) {
    if (!item.eligibleRules.includes(rule)) continue
    const cleanLedger = structuredClone(item.ledger)
    const positiveLedger = structuredClone(item.ledger)
    mutation.apply(positiveLedger)

    const cleanReport = await execute(cleanLedger, [rule])
    const positiveReport = await execute(positiveLedger, [rule])
    if (cleanReport.execution?.executed === 0) skippedRuns += 1

    const cleanIssues = issuesFor(cleanReport, rule)
    const positiveIssues = issuesFor(positiveReport, rule)

    if (cleanIssues.length === 0) tn += 1
    else {
      fp += 1
      sampleCleanFinding ??= cleanIssues[0].found
    }
    if (positiveIssues.length > 0) {
      tp += 1
      sampleFinding ??= positiveIssues[0].found
    } else fn += 1
  }

  const precision = tp + fp === 0 ? null : tp / (tp + fp)
  const recall = tp + fn === 0 ? null : tp / (tp + fn)
  scoredRules.push({
    rule,
    field: 'text',
    mutation: { label: mutation.label, description: mutation.description },
    cleanCases: tn + fp,
    positives: tp + fn,
    tp,
    fp,
    fn,
    tn,
    precision,
    recall,
    skippedRuns,
    sampleFinding,
    sampleCleanFinding,
  })
  total = { tp: total.tp + tp, fp: total.fp + fp, fn: total.fn + fn, tn: total.tn + tn }
}

const overall = {
  ...total,
  precision: total.tp + total.fp === 0 ? null : total.tp / (total.tp + total.fp),
  recall: total.tp + total.fn === 0 ? null : total.tp / (total.tp + total.fn),
}

/** The full pack on one clean CUAD ledger: the default behaviour, warts included. */
const fullReport = await execute(structuredClone(cases[0].ledger))
const fullPackRun = {
  caseId: cases[0].id,
  category: cases[0].category,
  rulesetVersion: fullReport.rulesetVersion,
  issueCount: fullReport.issues.length,
  issues: fullReport.issues.map((issue) => ({ rule: issue.ruleId, severity: issue.severity, found: issue.found })),
  skipped: fullReport.skipped,
  execution: fullReport.execution,
}

const excludedRules = [
  {
    rule: 'CS-002',
    fields: ['stance'],
    status: 'excluded (not CUAD-groundable)',
    reason: casesDocument.fields.stance.reason,
  },
  {
    rule: 'CS-003',
    fields: ['riskLevel'],
    status: 'excluded (not CUAD-groundable)',
    reason: casesDocument.fields.riskLevel.reason,
  },
  {
    rule: 'CS-004',
    fields: ['mustHave', 'fallback', 'owner'],
    status: 'excluded (not CUAD-groundable)',
    reason: 'CUAD has no must-have flag, fallback bottom line or negotiation owner, so the conditional-presence check has no condition to trigger.',
  },
  {
    rule: 'CS-005',
    fields: ['clauseNo'],
    status: 'excluded (not CUAD-groundable)',
    reason: casesDocument.fields.clauseNo.reason,
  },
  {
    rule: 'CS-006',
    fields: ['contractName', 'party'],
    status: 'excluded (contractName maps; party does not)',
    reason: casesDocument.headerFields.party.reason,
  },
].map((entry) => {
  const skip = fullReport.skipped.find((item) => item.rule.split(',').includes(entry.rule))
  const issue = fullReport.issues.find((item) => item.ruleId === entry.rule)
  return {
    ...entry,
    observed: issue !== undefined ? `issue: ${issue.found}` : skip !== undefined ? `skipped: ${skip.reason}` : 'not observed in the representative full-pack run',
  }
})

/**
 * Contradiction probes. These are deliberately outside the P/R score: two of
 * them exercise contradictions the rule pack has no check for, and two confirm
 * required-field behaviour. They are labelled so a reader cannot mistake a
 * zero for a missed detection of a declared rule.
 */
const uncapped = cases.find((item) => item.category === 'Uncapped Liability') ?? cases[0]
const controlSpecs = [
  {
    id: 'stance-vs-fallback',
    label: 'stance vs fallback bottom line',
    caseItem: cases[0],
    only: ['CS-002', 'CS-003', 'CS-004'],
    expected: 'No finding expected: the rule pack has no stance-vs-fallback consistency rule; CS-002/003/004 skip because their fields/values are not provided.',
    apply(ledger) {
      ledger.rows[0]['本方立场'] = '接受'
      ledger.rows[0]['退让底线'] = ''
      ledger.rows[0]['风险等级'] = '低'
    },
  },
  {
    id: 'risk-level-vs-clause',
    label: 'risk level vs clause type',
    caseItem: uncapped,
    only: ['CS-003'],
    expected: 'No finding expected: CS-003 only checks membership in a configured vocabulary; it has no clause-vs-risk comparison, and its values are unconfigured.',
    apply(ledger) {
      ledger.rows[0]['风险等级'] = '低'
    },
  },
  {
    id: 'missing-required-text',
    label: 'missing required field: 条款原文',
    caseItem: cases[0],
    only: ['CS-001'],
    expected: 'CS-001 fires: the required clause text is present but blank.',
    apply(ledger) {
      ledger.rows[0]['条款原文'] = ''
    },
  },
  {
    id: 'missing-required-header',
    label: 'missing required field: contractName',
    caseItem: cases[0],
    only: ['CS-006'],
    expected: 'CS-006 fires, but CS-006 is excluded from the CUAD score because party is not provided either.',
    apply(ledger) {
      delete ledger.contractName
    },
  },
]

const controls = []
for (const spec of controlSpecs) {
  const ledger = structuredClone(spec.caseItem.ledger)
  spec.apply(ledger)
  const report = await execute(ledger, spec.only)
  const targeted = report.issues.filter((issue) => spec.only.includes(issue.ruleId))
  controls.push({
    id: spec.id,
    label: spec.label,
    caseId: spec.caseItem.id,
    category: spec.caseItem.category,
    rules: spec.only,
    expected: spec.expected,
    issueCount: targeted.length,
    issues: targeted.map((issue) => ({ rule: issue.ruleId, found: issue.found })),
    skipped: report.skipped,
  })
}

const categoriesUsed = [...new Set(cases.map((item) => item.category))]
const summary = {
  benchmark: 'public-cuad',
  title: 'CUAD -> dsh-contract-stance ledger end-to-end benchmark',
  dataset: casesDocument.dataset,
  source: casesDocument.source,
  license: casesDocument.license,
  generatedAt: new Date().toISOString(),
  tool: {
    plugin: plugin.name,
    tool: plugin.TOOL_NAME,
    packageVersion: packageJson.version,
    rulesetVersion: fullPackRun.rulesetVersion,
    entry: '../../lib/index.mjs',
  },
  data: {
    file: casesDocument.dataFile,
    contracts: casesDocument.selection.contractsAvailable,
    qas: casesDocument.selection.qasAvailable,
    categories: casesDocument.selection.categoriesAvailable,
  },
  selection: casesDocument.selection,
  cases: {
    total: cases.length,
    clean: cases.length,
    rowCategories: categoriesUsed.length,
    expectedEveryRule: 'each case is a clean base for CS-001 and CS-007',
  },
  scoredRules,
  overall,
  excludedRules,
  controls,
  fullPackRun,
  mapping: {
    fields: casesDocument.fields,
    headerFields: casesDocument.headerFields,
    fieldsNotProvided: casesDocument.fieldsNotProvided,
    headerFieldsNotProvided: casesDocument.headerFieldsNotProvided,
  },
  commands: [
    'node bench/public-cuad/fetch.mjs',
    'node bench/public-cuad/adapter.mjs',
    'node bench/public-cuad/evaluate.mjs',
  ],
  limitations: [
    'CUAD is a corpus of English commercial contracts (US); this is not a Chinese contract, Chinese law, or Chinese enterprise-ledger sample.',
    'Only CS-001 and CS-007 are CUAD-groundable. CS-002..CS-006 are excluded; no stance, risk rating, fallback, must-have flag, owner, clause number, own-side party, counterparty or version is synthesized.',
    'The rule pack contains no stance-vs-fallback or risk-level-vs-clause consistency rule. The corresponding probes return zero findings by design/scope, not because a declared check missed them.',
    'P/R measures detection of one-defect clones of real CUAD-derived rows, not prevalence, legal accuracy, or performance on unseen negotiations.',
    'The adapter keeps one expert answer span per contract/category, only for 36 clause-like categories, at most five contracts per category, and filters spans shorter than 40 characters or already containing a CS-007 placeholder term.',
    'The full-pack run on the CUAD ledger reports CS-006 missing party. That is a true statement about the adapted ledger (party is not provided), not a false positive of a scored rule.',
    'cases.json and .data/ are gitignored; no contract text is committed. CUAD is CC BY 4.0 and attribution is in README.md.',
    'The tool\'s only argument collapses unselected rules into one skipped entry; evaluation filters issues by ruleId. This is a reporting detail, not a scoring shortcut.',
  ],
}

writeFileSync(join(here, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')

const fmt = (value) => (value === null ? 'n/a' : value.toFixed(3))
const percent = (value) => (value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`)

const lines = []
lines.push('# Results — CUAD public benchmark')
lines.push('')
lines.push(`Generated: ${summary.generatedAt}`)
lines.push('')
lines.push(`Dataset: **${summary.dataset}** — ${summary.data.contracts} contracts, ${summary.data.qas} expert QA annotations, ${summary.data.categories} categories.`)
lines.push(`Source: <${summary.source}> · License: **${summary.license}**.`)
lines.push(`Tool: \`${summary.tool.tool}\` from \`${summary.tool.entry}\` (package ${summary.tool.packageVersion}, ruleset ${summary.tool.rulesetVersion}).`)
lines.push(`Cases: **${summary.cases.total}** clean CUAD-derived ledgers across **${summary.cases.rowCategories}** clause categories; each case is one expert-annotated clause excerpt.`)
lines.push('')
lines.push('## Scored rules (CUAD-groundable)')
lines.push('')
lines.push('| rule | field | injected defect | TP | FP | FN | TN | precision | recall |')
lines.push('|---|---|---|---:|---:|---:|---:|---:|---:|')
for (const row of scoredRules) {
  lines.push(`| ${row.rule} | ${row.field} | ${row.mutation.label} | ${row.tp} | ${row.fp} | ${row.fn} | ${row.tn} | ${fmt(row.precision)} | ${fmt(row.recall)} |`)
}
lines.push('')
lines.push(`**Overall: precision ${fmt(overall.precision)} · recall ${fmt(overall.recall)}** (TP ${overall.tp} · FP ${overall.fp} · FN ${overall.fn} · TN ${overall.tn}).`)
lines.push('')
lines.push('The positives are one-defect clones: CS-001 blanks the real answer span; CS-007 appends `【待填】` to it. The negatives are the same clean CUAD-derived ledgers. This is a detection test, not a prevalence estimate.')
lines.push('')
lines.push('## Excluded rules (no CUAD equivalent)')
lines.push('')
lines.push('| rule | required fields | why excluded | observed on the representative full-pack run |')
lines.push('|---|---|---|---|')
for (const row of excludedRules) {
  lines.push(`| ${row.rule} | ${row.fields.join(', ')} | ${row.reason} | ${row.observed} |`)
}
lines.push('')
lines.push('The literal string “not provided” is **never** written into a ledger cell; a non-empty sentinel would be treated as a filled value and could fake a pass. The fields are omitted instead, and the dependent rules are excluded from the score. See `mapping.json` for the 41-category, field-by-field decision table.')
lines.push('')
lines.push('## Contradiction probes (not scored)')
lines.push('')
lines.push('| probe | rules invoked | expected | findings |')
lines.push('|---|---|---|---:|')
for (const row of controls) {
  lines.push(`| ${row.label} | ${row.rules.join(', ')} | ${row.expected} | ${row.issueCount} |`)
}
lines.push('')
lines.push('Two requested contradiction classes — stance vs fallback bottom line, and risk level vs clause — are **not implemented by this rule pack**. The plugin has seven rules; none compares those fields. The probes document that absence honestly instead of counting a zero as a missed detection.')
lines.push('')
lines.push('## Full-pack evidence')
lines.push('')
lines.push(`On clean case \`${fullPackRun.caseId}\` (${fullPackRun.category}), the default tool call produced ${fullPackRun.issueCount} issue(s) and ${fullPackRun.skipped.length} skipped rule(s):`)
lines.push('')
lines.push('```json')
lines.push(JSON.stringify({ issues: fullPackRun.issues, skipped: fullPackRun.skipped, execution: fullPackRun.execution }, null, 2))
lines.push('```')
lines.push('')
lines.push('`CS-006` reports the missing `party`: CUAD has no own-side designation, so the adapter omits the field rather than filling it with all signatories. The skip entries are the plugin’s own reasons, not benchmark prose.')
lines.push('')
lines.push('## Limits')
lines.push('')
for (const item of summary.limitations) lines.push(`- ${item}`)
lines.push('')
lines.push('## Reproduce')
lines.push('')
lines.push('```bash')
for (const command of summary.commands) lines.push(command)
lines.push('```')
lines.push('')
lines.push('`fetch.mjs` supports `--zip <path>` for an already-downloaded `data.zip` and `--json <path>` for an already-extracted `CUADv1.json`; the normal path downloads/resumes the GitHub archive and validates it with Python `zipfile`. No token is used and no contract text is committed.')
lines.push('')

writeFileSync(join(here, 'RESULTS.md'), lines.join('\n'))
console.log(`scored: ${scoredRules.map((row) => `${row.rule} P=${fmt(row.precision)} R=${fmt(row.recall)}`).join(' · ')}`)
console.log(`overall: precision ${fmt(overall.precision)} · recall ${fmt(overall.recall)} (TP ${overall.tp} FP ${overall.fp} FN ${overall.fn} TN ${overall.tn})`)
console.log(`wrote ${join(here, 'summary.json')} and ${join(here, 'RESULTS.md')}`)
