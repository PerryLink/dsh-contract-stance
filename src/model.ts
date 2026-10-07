/**
 * dsh-contract-stance — table shape and material contract.
 *
 * The plugin is data-only: this file declares which columns the material may use
 * and how they map onto canonical field names; the shared kit supplies the reader
 * and the check engine, and the rule pack declares every check. Adding a check
 * that fits an existing kind is a rule-pack edit, not a code change.
 */

import { canonicaliseRow, parseTable, type TableSpec } from './shared/table.ts'
import { runTableCheck, type TableCheckOptions, type TableInput } from './shared/rows.ts'
import type { Ruleset } from './shared/rules.ts'

/** Tool id exposed to the model, and the row id in `cordis.patch.yml`. */
export const TOOL_NAME = 'contract_stance'

/** The register's column aliases, declared once so both the spec and the guard see them. */
const COLUMNS = {
  clauseNo: ['条款号', '条号', '序号', 'clauseNo'],
  topic: ['条款主题', '事项', '主题', 'topic'],
  text: ['条款原文', '原文', '条款内容', 'text'],
  stance: ['本方立场', '立场', '接受态度', 'stance'],
  riskLevel: ['风险等级', '风险级别', '等级', 'riskLevel'],
  riskNote: ['风险说明', '风险点', '影响', 'riskNote'],
  fallback: ['退让底线', '备选方案', '替代方案', 'fallback'],
  mustHave: ['是否必保', '必保条款', '底线条款', 'mustHave'],
  owner: ['谈判责任人', '责任人', '负责人', 'owner'],
  note: ['备注', '说明', 'note', 'remark'],
} as const

/** How the material declares its table. */
export const SPEC: TableSpec = {
  rowKeys: ['rows', 'items', 'clauses', '条款'],
  columns: COLUMNS,
  header: {
  contractNo: ['contractNo', '合同编号', '协议编号'],
  contractName: ['contractName', '合同名称', '协议名称'],
  party: ['party', '本方', '本方名称'],
  counterparty: ['counterparty', '对方', '相对方'],
  version: ['version', '版本', '谈判稿版本'],
  checkedAt: ['checkedAt', '核对日期'],
  },
}

/** Fields the material must carry somewhere for the reader to accept it. */
export const REQUIRE_ANY_OF = [
  '条款原文',
  'text',
  '本方立场',
  'stance',
  '条款主题',
  'topic',
  '条款号',
  'clauseNo',
]

/**
 * Parse the material and attach its canonical field names.
 * @param source - JSON or YAML text.
 * @param target - description of where the material came from.
 * @returns the normalized table, with each row's aliases resolved to field names.
 */
export function parseMaterial(source: string, target: string): TableInput {
  const table = parseTable(source, target, {
    ...SPEC,
    ...(REQUIRE_ANY_OF === undefined ? {} : { requireAnyOf: REQUIRE_ANY_OF }),
  })
  for (const row of table.rows) canonicaliseRow(row, SPEC)
  return table
}

/**
 * Run the rule pack against the material.
 * @param input - normalized table.
 * @param ruleset - validated rule pack.
 * @param options - plugin identity, clock value, rule selection and overrides.
 * @returns the report.
 */
export function runCheck(input: TableInput, ruleset: Ruleset, options: TableCheckOptions) {
  return runTableCheck(input, ruleset, options)
}

export type { TableCheckOptions, TableInput }
