# CUAD seed annotations for CS-008 / CS-009

This is a small **self-annotated** seed set built on real CUAD clause text.

- Clause text: CUAD v1, The Atticus Project, **CC BY 4.0**
- Source: <https://github.com/The-Atticus-Project/cuad>
- Seed annotations (`stance`, `stanceRank`, `riskLevel`, `fallbackRank`,
  `fallback`, `riskNote`): **CC BY 4.0**, this repository's authors.
- 15 clauses from 3 categories: Governing Law, Uncapped Liability, Non-Compete.
- `generate.mjs` selects the clauses from `.data/CUADv1.json` (gitignored).
- `evaluate.mjs` configures a local risk matrix and calls the real
  `contract_stance` tool.

## Important limits

- **Not lawyer-reviewed.** These are seed labels written to exercise the rule
  engine, not a gold legal standard.
- Only 3 categories; no claim of dataset-level representativeness.
- The risk matrix (`Governing Law: 中/低`, `Uncapped Liability: 高`,
  `Non-Compete: 高`) is our local seed policy, not law.
- CUAD is English/US commercial contract data, not Chinese contracts.

## Run

```bash
node bench/annotations-cuad/generate.mjs
node bench/annotations-cuad/evaluate.mjs
```

Clean seed: no CS-008/CS-009 findings.
Mutation: CS-008 raises fallback rank above stance rank; CS-009 changes the
risk level outside the matrix.
