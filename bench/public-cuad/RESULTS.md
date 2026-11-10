# Results — CUAD public benchmark

Generated: 2026-11-10T11:55:10.890Z

Dataset: **CUAD v1 (The Atticus Project)** — 510 contracts, 20910 expert QA annotations, 41 categories.
Source: <https://github.com/The-Atticus-Project/cuad> · License: **CC BY 4.0**.
Tool: `contract_stance` from `../../lib/index.mjs` (package 0.2.12, ruleset 2026.1).
Cases: **180** clean CUAD-derived ledgers across **36** clause categories; each case is one expert-annotated clause excerpt.

## Scored rules (CUAD-groundable)

| rule | field | injected defect | TP | FP | FN | TN | precision | recall |
|---|---|---|---:|---:|---:|---:|---:|---:|
| CS-001 | text | blank-clause-text | 180 | 0 | 0 | 180 | 1.000 | 1.000 |
| CS-007 | text | append-template-placeholder | 180 | 0 | 0 | 180 | 1.000 | 1.000 |

**Overall: precision 1.000 · recall 1.000** (TP 360 · FP 0 · FN 0 · TN 360).

The positives are one-defect clones: CS-001 blanks the real answer span; CS-007 appends `【待填】` to it. The negatives are the same clean CUAD-derived ledgers. This is a detection test, not a prevalence estimate.

## Excluded rules (no CUAD equivalent)

| rule | required fields | why excluded | observed on the representative full-pack run |
|---|---|---|---|
| CS-002 | stance | CUAD annotates clause presence/type, never a negotiation stance or acceptance attitude; CS-002 is excluded. | skipped: 规则库未配置 values：「stance」的取值口径由本机构规定，本引擎不硬编码 |
| CS-003 | riskLevel | CUAD has no risk rating (high/medium/low). A category such as Uncapped Liability is a clause type, not a risk level; CS-003 is excluded. | skipped: 规则库未配置 values：「riskLevel」的取值口径由本机构规定，本引擎不硬编码 |
| CS-004 | mustHave, fallback, owner | CUAD has no must-have flag, fallback bottom line or negotiation owner, so the conditional-presence check has no condition to trigger. | skipped: 材料中没有满足「mustHave」条件的行，本条不适用 |
| CS-005 | clauseNo | CUAD has no clause numbers. qa ids are annotation ids (contract title + category), not clause numbers; using them would fake uniqueness. | skipped: 材料没有「clauseNo」列，本条不适用 |
| CS-006 | contractName, party | CUAD Parties is all signatories, not 本方; CS-006 is excluded. | issue: 材料表头缺少 party |

The literal string “not provided” is **never** written into a ledger cell; a non-empty sentinel would be treated as a filled value and could fake a pass. The fields are omitted instead, and the dependent rules are excluded from the score. See `mapping.json` for the 41-category, field-by-field decision table.

## All rules at a glance

| rule | status | precision | recall |
|---|---|---:|---:|
| CS-001 | scored | 1.000 | 1.000 |
| CS-007 | scored | 1.000 | 1.000 |
| CS-002 | excluded (not CUAD-groundable) | n/a | n/a |
| CS-003 | excluded (not CUAD-groundable) | n/a | n/a |
| CS-004 | excluded (not CUAD-groundable) | n/a | n/a |
| CS-005 | excluded (not CUAD-groundable) | n/a | n/a |
| CS-006 | excluded (contractName maps; party does not) | n/a | n/a |

Full-pack observed behaviour for the excluded rules is in the table above; none of them is counted as a pass or a fail in the P/R numbers.

## Contradiction probes (not scored)

| probe | rules invoked | expected | findings |
|---|---|---|---:|
| stance vs fallback bottom line | CS-002, CS-003, CS-004 | No finding expected: the rule pack has no stance-vs-fallback consistency rule; CS-002/003/004 skip because their fields/values are not provided. | 0 |
| risk level vs clause type | CS-003 | No finding expected: CS-003 only checks membership in a configured vocabulary; it has no clause-vs-risk comparison, and its values are unconfigured. | 0 |
| missing required field: 条款原文 | CS-001 | CS-001 fires: the required clause text is present but blank. | 1 |
| missing required field: contractName | CS-006 | CS-006 fires, but CS-006 is excluded from the CUAD score because party is not provided either. | 1 |

Two requested contradiction classes — stance vs fallback bottom line, and risk level vs clause — are **not implemented by this rule pack**. The plugin has seven rules; none compares those fields. The probes document that absence honestly instead of counting a zero as a missed detection.

## Boundary probes (not scored)

| probe | expected | findings | assessment |
|---|---|---:|---|
| one row omits the 条款原文 key while another row carries it | CS-001 should report row 2: every clause must quote its text. | 0 | gap: row 2 is not covered because the presence engine only holds rows that carry the column to the check |
| the 条款原文 column is absent from the whole ledger | CS-001 should skip with an explicit reason, not silently pass. | 0 | correctly skipped: the rule is not applicable, and the skip reason is reported |

The second boundary probe is the correct behaviour: when the text column is absent from the whole ledger, the rule skips with a reason and the report does not silently read as a pass. The first is a real coverage gap: a row that omits the field key while a sibling row carries it is not covered, so the plugin can miss a missing clause quotation. This is reported as a limitation, not folded into the P/R numbers.

## Full-pack evidence

On clean case `cuad-001` (Renewal Term), the default tool call produced 1 issue(s) and 4 skipped rule(s):

```json
{
  "issues": [
    {
      "rule": "CS-006",
      "severity": "warn",
      "found": "材料表头缺少 party"
    }
  ],
  "skipped": [
    {
      "reason": "规则库未配置 values：「stance」的取值口径由本机构规定，本引擎不硬编码",
      "rule": "CS-002"
    },
    {
      "reason": "规则库未配置 values：「riskLevel」的取值口径由本机构规定，本引擎不硬编码",
      "rule": "CS-003"
    },
    {
      "reason": "材料中没有满足「mustHave」条件的行，本条不适用",
      "rule": "CS-004"
    },
    {
      "reason": "材料没有「clauseNo」列，本条不适用",
      "rule": "CS-005"
    }
  ],
  "execution": {
    "executed": 3,
    "manual": 0,
    "skipped": 4,
    "total": 7,
    "unsupported": 0
  }
}
```

`CS-006` reports the missing `party`: CUAD has no own-side designation, so the adapter omits the field rather than filling it with all signatories. The skip entries are the plugin’s own reasons, not benchmark prose.

## Limits

- CUAD is a corpus of English commercial contracts (US); this is not a Chinese contract, Chinese law, or Chinese enterprise-ledger sample.
- Only CS-001 and CS-007 are CUAD-groundable. CS-002..CS-006 are excluded; no stance, risk rating, fallback, must-have flag, owner, clause number, own-side party, counterparty or version is synthesized.
- The rule pack contains no stance-vs-fallback or risk-level-vs-clause consistency rule. The corresponding probes return zero findings by design/scope, not because a declared check missed them.
- P/R measures detection of one-defect clones of real CUAD-derived rows, not prevalence, legal accuracy, or performance on unseen negotiations.
- The adapter keeps one expert answer span per contract/category, only for 36 clause-like categories, at most five contracts per category, and filters spans shorter than 40 characters or already containing a CS-007 placeholder term.
- The full-pack run on the CUAD ledger reports CS-006 missing party. That is a true statement about the adapted ledger (party is not provided), not a false positive of a scored rule.
- cases.json and .data/ are gitignored; no contract text is committed. CUAD is CC BY 4.0 and attribution is in README.md.
- The tool's only argument collapses unselected rules into one skipped entry; evaluation filters issues by ruleId. This is a reporting detail, not a scoring shortcut.
- Known gap (boundary probe): CS-001 does not report a row that omits the 条款原文 key entirely while another row carries the column; the engine only holds rows that carry the column to the presence check. A row with an explicit blank string is reported correctly and is the scored positive.

## Reproduce

```bash
node bench/public-cuad/fetch.mjs
node bench/public-cuad/adapter.mjs
node bench/public-cuad/evaluate.mjs
```

`fetch.mjs` supports `--zip <path>` for an already-downloaded `data.zip` and `--json <path>` for an already-extracted `CUADv1.json`; the normal path downloads/resumes the GitHub archive and validates it with Python `zipfile`. No token is used and no contract text is committed.
