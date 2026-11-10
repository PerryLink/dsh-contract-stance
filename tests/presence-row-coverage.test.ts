/**
 * Regression: once a required column exists anywhere in the material, a row
 * that omits the key entirely is still a missing value. The public CUAD
 * benchmark found the old implementation skipped that row silently.
 */
import { describe, expect, it } from 'vitest'
import { loadRuleset } from '../src/shared/ruleset.ts'
import { runTableCheck } from '../src/shared/rows.ts'
import type { TableInput } from '../src/shared/rows.ts'

const yaml = `
plugin: presence-probe
version: "2026.1"
rules:
  - id: P-001
    title: 条款原文必填
    severity: warn
    basis:
      document: 测试依据
      number: 测试条
      clause: 测试款
      excerpt: 这是一段足够长的测试原文，用于验证行级必填项的覆盖行为。
      kind: direct
      source: https://example.invalid/
    params:
      check:
        kind: presence
        field: text
    note: 测试探针。
disabled: []
`

describe('presence row coverage', () => {
  it('reports a row that omits a column carried by a sibling row', () => {
    const input: TableInput = {
      target: 'probe',
      header: { text: '' },
      columns: ['text'],
      rows: [
        { row: 1, fields: { text: 'present' } },
        { row: 2, fields: {} },
      ],
      warnings: [],
    }
    const report = runTableCheck(input, loadRuleset(yaml), { plugin: 'presence-probe', checkedAt: '2026-11-10T00:00:00.000Z', disabledRules: [], onlyRules: [] })
    expect(report.issues.map((issue) => issue.locator.row)).toContain(2)
  })
})
