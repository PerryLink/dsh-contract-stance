# Public-data benchmark: CUAD → `dsh-contract-stance`

This directory runs the **real** `contract_stance` tool (imported from
`../../lib/index.mjs`, never reimplemented) over ledgers adapted from CUAD, the
Contract Understanding Atticus Dataset. It is a public, reproducible check that
the text-presence and template-placeholder rules fire on the right cells and
stay quiet on expert-annotated clean rows.

It is **not** a Chinese-contract benchmark, a legal-accuracy test, or a test of
the five rules whose fields CUAD does not carry. Those exclusions are the main
finding, and they are recorded in `mapping.json`, `summary.json` and
`RESULTS.md`.

## Data and license

- **Dataset:** CUAD v1, The Atticus Project — <https://github.com/The-Atticus-Project/cuad>
- **Pinned revision:** `67faa0e6023b04fcaae6cc09497ab00e5d63a2a2` (2021-10-21). `fetch.mjs` downloads the archive from that commit, not a moving branch.
- **Archive:** `data.zip` → `CUADv1.json` (510 contracts, 41 expert clause
  categories, 20,910 QA annotations).
- **License:** **CC BY 4.0** — <https://creativecommons.org/licenses/by/4.0/>.
  The dataset is attributed to Hendrycks, Burns, Chen and Ball, *CUAD: An
  Expert-Annotated NLP Dataset for Legal Contract Review* (NeurIPS 2021).
  The benchmark code itself is part of this Apache-2.0 repository; the CUAD
  data remains CC BY 4.0.
- **Not committed:** `data.zip` and `CUADv1.json` are downloaded into `.data/`,
  which is gitignored. `cases.json` (which contains clause excerpts) is also
  gitignored. If you regenerate it, CC BY 4.0 and the attribution above apply.
- No token, credential or private data is used. The only network access is the
  public GitHub archive (or a path supplied with `--zip` / `--json`).

## The plugin contract this reads

`contract_stance` reads one contract-level ledger: optional header scalars plus
a `rows` / `items` / `clauses` list. The canonical row fields are `clauseNo`,
`topic`, `text`, `stance`, `riskLevel`, `riskNote`, `fallback`, `mustHave`,
`owner`, `note`; the header fields are `contractNo`, `contractName`, `party`,
`counterparty`, `version`, `checkedAt`. The real rule pack has seven rules
(`CS-001`…`CS-007`). Reports always name the rules they could not execute in
`skipped`; a skip is never a pass.

## Mapping, deliberately conservative

CUAD annotates **clause categories and answer spans**, not negotiation
positions. The mapping therefore uses only:

| CUAD evidence | Ledger field | Rule(s) |
|---|---|---|
| 36 clause-like category labels | `条款主题` / `topic` | none consume it; it identifies the row |
| The expert-annotated answer span | `条款原文` / `text` (whitespace-collapsed) | `CS-001`, `CS-007` |
| `Document Name` answer (or contract title) | header `contractName` | `CS-006` half only |

**Nothing in CUAD maps to `stance`, `riskLevel`, `riskNote`, `fallback`,
`mustHave`, `owner`, `clauseNo`, header `party`, `counterparty`, `contractNo` or
`version`.** A category such as `Uncapped Liability` is a clause *type*, not a
risk rating; calling it `riskLevel: high` would be a fabricated label. CUAD's
`Parties` is the set of all signatories; it never says which side is 本方 (our
side), so writing it into `party` would fake the own-party field.

The 36 row categories are: Renewal Term; Notice Period To Terminate Renewal;
Governing Law; Most Favored Nation; Non-Compete; Exclusivity; No-Solicit Of
Customers; Competitive Restriction Exception; No-Solicit Of Employees;
Non-Disparagement; Termination For Convenience; Rofr/Rofo/Rofn; Change Of
Control; Anti-Assignment; Revenue/Profit Sharing; Price Restrictions; Minimum
Commitment; Volume Restriction; Ip Ownership Assignment; Joint Ip Ownership;
License Grant; Non-Transferable License; Affiliate License-Licensor; Affiliate
License-Licensee; Unlimited/All-You-Can-Eat-License; Irrevocable Or Perpetual
License; Source Code Escrow; Post-Termination Services; Audit Rights; Uncapped
Liability; Cap On Liability; Liquidated Damages; Warranty Duration; Insurance;
Covenant Not To Sue; Third Party Beneficiary.

`Document Name` maps to `contractName`; `Parties` and the three date categories
(`Agreement Date`, `Effective Date`, `Expiration Date`) are **not provided**.
`mapping.json` is the machine-readable decision table for all 41 categories and
every ledger/header field.

“Not provided” means **omitted from the ledger**, not the literal string
`not provided`. The engine treats any non-empty cell as filled, so writing a
sentinel would produce a fake pass. The dependent rules are excluded from the
score instead:

| Rule | Field(s) CUAD lacks | Why excluded |
|---|---|---|
| `CS-002` | `stance` | CUAD has no negotiation stance; the pack's `values` is empty by design. |
| `CS-003` | `riskLevel` | CUAD has no risk rating; a clause category is not a risk level. |
| `CS-004` | `mustHave`, `fallback`, `owner` | No must-have flag, fallback bottom line or owner exists in CUAD. |
| `CS-005` | `clauseNo` | CUAD has no clause numbers; annotation ids are not clause numbers. |
| `CS-006` | `contractName`, `party` | `contractName` maps, but `party` (本方) does not; the rule is excluded rather than half-scored. |

Only **`CS-001`** and **`CS-007`** are CUAD-groundable and scored.

## Method

1. `fetch.mjs` downloads `data.zip` from GitHub with `curl -L -C -` resume,
   validates the **complete** archive with Python `zipfile` (a partial ZIP is
   rejected), and extracts `CUADv1.json` into `.data/`. `--zip` and `--json`
   accept an existing archive/extract for slow networks.
2. `adapter.mjs` reads `mapping.json` and `CUADv1.json`, maps the 36 clause
   categories to `条款主题` and their first answer span to `条款原文`, and writes
   `cases.json`. Selection is deterministic: up to five contracts per category
   in title order, one answer per contract/category, answer spans shorter than
   40 characters or already containing a `CS-007` placeholder term are excluded.
   This yields 180 clean cases across all 36 row categories.
3. `evaluate.mjs` registers the real tool from `../../lib/index.mjs`, runs each
   scored rule with `only: [rule]`, takes the clean CUAD ledger as a negative,
   clones it and injects exactly that rule's defect as a positive, and records
   TP/FP/FN/TN. It also runs the full pack on one case to record the real skip
   reasons, and runs four contradiction probes.

Defects injected (one per scored rule):

| Rule | Mutation | Expected |
|---|---|---|
| `CS-001` | set `条款原文` to `""` (field present, blank) | one finding |
| `CS-007` | append `【待填】` to the real answer span | one finding |

The two probes the task names — **stance vs fallback bottom line** and **risk
level vs clause** — are run, but they are **not scored**, because the rule pack
has no consistency rule for either relation. They return zero findings; that is
the honest scope of the plugin, not a missed detection of a declared rule. The
other two probes exercise the required-field behaviour of `CS-001` and the
excluded `CS-006`.

## Results

- `summary.json` — machine-readable counts, per-rule P/R, excluded rules,
  probes, full-pack evidence, mapping and limitations.
- `RESULTS.md` — the same in a short Markdown report.
- `mapping.json` — all 41 categories and all ledger/header fields.

This run: **180 clean cases**, `CS-001` and `CS-007` each 180 TP / 0 FP / 0 FN /
180 TN (precision 1.000, recall 1.000). These are detection numbers on
one-defect clones of real CUAD spans, not prevalence or legal-accuracy claims.

## Limits and known failures

- CUAD is English/US commercial contracts. It says nothing about Chinese law,
  Chinese enterprise ledgers, or the plugin's Chinese legal citations.
- Five of seven rules are excluded; the benchmark cannot speak to their
  accuracy. Their skip reasons are recorded from the real full-pack run.
- No stance-vs-fallback and no risk-level-vs-clause rule exists in the pack.
  Injecting those contradictions is a scope probe, not a scored negative.
- Answers are expert excerpts, sometimes partial sentences; whitespace is
  collapsed. One answer per contract/category and at most five contracts per
  category were sampled.
- The full pack on these ledgers reports `CS-006` missing `party`; that is a
  true statement about the adapted ledger, not a false positive of a scored
  rule.
- The tool's `only` argument collapses unselected rules into one `skipped`
  entry; the evaluator filters issues by `ruleId`. This is a reporting detail,
  not a scoring shortcut.

## Run

```bash
node bench/public-cuad/fetch.mjs        # download/resume, validate, extract
node bench/public-cuad/adapter.mjs      # CUADv1.json -> cases.json
node bench/public-cuad/evaluate.mjs     # real tool -> summary.json + RESULTS.md
```

Offline/known-file forms:

```bash
node bench/public-cuad/fetch.mjs --zip /path/to/data.zip
node bench/public-cuad/fetch.mjs --json /path/to/CUADv1.json
```

`fetch.mjs` needs `curl` for the normal download path and Python 3 for the
ZIP validation/extraction. `--json` validates the extracted JSON in Node and
does not need Python. The evaluation itself is pure Node and the built plugin.
