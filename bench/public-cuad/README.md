# Public-data benchmark: CUAD v1

End-to-end benchmark for `dsh-contract-stance` using the Contract
Understanding Atticus Dataset (CUAD v1).

- Data: <https://github.com/The-Atticus-Project/cuad>
- License: **CC BY 4.0** — The Atticus Project
- The archive / extracted `CUADv1.json` and the generated `cases.json` are
  **not committed**; `fetch.mjs` downloads and validates them.

## What CUAD can and cannot ground

CUAD has 510 English commercial contracts and 20,910 expert QA annotations
across 41 clause categories. It gives us real clause text and clause labels.
It does **not** give:

- negotiation stance;
- risk level;
- fallback bottom line;
- must-have flag;
- negotiation owner;
- clause number;
- own-side party (CUAD's "Parties" are signatories, not 本方).

The adapter therefore maps clause text and category only. It omits fields CUAD
does not carry — it never writes a "not provided" sentinel that could be read as
a filled value. Dependent rules (`CS-002`–`CS-006`) are excluded from the
score and documented in `mapping.json`/`RESULTS.md`.

## Scored rules

Only the rules CUAD actually grounds:

- `CS-001`: required clause text must not be blank.
- `CS-007`: clause text must not contain a template placeholder.

The evaluator takes real CUAD-derived clean ledgers, then injects one labelled
defect (blank text / appended `【待填】`). The real `contract_stance` tool from
`../../lib/index.mjs` is called; scoring filters by `ruleId`.

## Important finding

The shipped rule pack has **no stance-vs-fallback consistency rule** and **no
risk-level-vs-clause-type consistency rule**. Probes for those two desired
contradiction classes return zero findings because the checks do not exist, not
because the plugin passed them. This is recorded in `RESULTS.md` as a scope
gap.

## Run

```bash
node bench/public-cuad/fetch.mjs
node bench/public-cuad/adapter.mjs
node bench/public-cuad/evaluate.mjs
```

`fetch.mjs` supports `--zip` and `--json` for an existing download. No token is
used and no contract text is committed.
