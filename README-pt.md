# dsh-contract-stance — Verificação da completude e da coerência interna do registo de posições sobre cláusulas contratuais

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)

`dsh-contract-stance` lê um registo de posições sobre cláusulas —o cabeçalho do contrato mais uma linha por cláusula— e verifica a completude e a coerência interna desse registo: se o texto de cada cláusula está registado, se a sua posição vem do seu próprio vocabulário e se a classificação de risco também, se uma cláusula irrenunciável regista tanto um limite de cedência como um responsável, se os números de cláusula são únicos, se o registo declara o contrato e a sua própria parte e se não resta nenhum marcador de modelo por substituir no texto da cláusula.

## Install

```sh
dsh plugin --profile <name> add dsh-contract-stance
dsh --profile <name> --dump-config | grep 'dsh-contract-stance'
```

## Como é a saída

![Terminal demo of dsh-contract-stance: real output over its CS-001 fixture](https://raw.githubusercontent.com/PerryLink/dsh-contract-stance/main/docs/assets/dsh-contract-stance-hero.png)

![Animated terminal demo of dsh-contract-stance](https://raw.githubusercontent.com/PerryLink/dsh-contract-stance/main/docs/assets/dsh-contract-stance-demo.gif)

Saída real deste plugin sobre o seu próprio fixture de teste `CS-001` — não é uma simulação. O pacote de regras não inventa citações: cada achado nomeia a cláusula aplicada e se o seu excerpt é uma citação literal ou uma inferência de princípio.

## O que ele responde

| Você pergunta | O que ele responde |
|---|---|
| Uma linha tem tema, mas a coluna do texto da cláusula está vazia. Isso é reportado? | Sim. `CS-001` exige a coluna `text` em todas as linhas: sem o texto não é possível verificar a que redação se refere a posição. A regra verifica apenas que o texto está registado; não julga se a cláusula deve ser aceite nem se envolve risco jurídico. |
| A posição e a classificação de risco estão preenchidas, mas todas as linhas voltam como `skipped`. Porquê? | Porque as duas listas de valores vêm vazias de fábrica. `CS-002` só aceita uma posição da lista configurada para ele, e `CS-003` faz o mesmo com a classificação de risco; sem lista configurada nenhuma das regras consegue correr, por isso cada uma se reporta em `skipped` em vez de passar em silêncio. `CS-002` verifica apenas se o valor consta da sua lista, não se a posição é adequada; `CS-003` verifica apenas se consta da lista, não quão alto é o risco real dessa cláusula. |
| Uma cláusula está marcada como irrenunciável, mas ninguém escreveu até onde se pode ceder nem quem decide. | `CS-004` lê a própria coluna de irrenunciável do registo: quando a linha traz `是`, `Y`, `yes`, `true`, `必保` ou `√` (valores definidos por `conditionValues`) exige que as colunas `fallback` e `owner` estejam preenchidas. Verifica apenas que ambas estão preenchidas, não se o limite de cedência é razoável; que cláusulas são irrenunciáveis depende inteiramente do projeto e a regra não o decide. |
| O mesmo número de cláusula aparece em duas linhas, uma por minuta de negociação. É um achado? | `CS-005` reporta um número de cláusula repetido, comparando sem considerar os espaços. Um número repetido impede apontar com precisão uma única cláusula. Uma cláusula surgir uma vez por minuta é uma forma normal: distinga-a na coluna de versão em vez de reutilizar o número. Nenhuma cláusula exige que os números sejam únicos: a unicidade é o que torna o registo referenciável. |
| O cabeçalho não diz de que contrato se trata nem qual é a nossa parte. | `CS-006` exige que o cabeçalho do material declare `contractName` e `party`: sem esses dois dados a posição não pode ser rastreada até uma operação e uma parte concretas. Se o seu formulário tiver uma coluna de versão para as minutas, acrescente-a aos `fields` dessa regra. A regra verifica apenas que o cabeçalho declara os dois. |
| O texto da cláusula foi copiado tal e qual de um modelo e ainda contém 【】 ou TBD. | `CS-007` reporta o texto da coluna `text` que ainda contém algum dos seus termos de modelo: `【`, `】`, `{{`, `}}`, `XXX`, `xxx`, `待填`, `待补充`, `TBD`, `todo`, `示例`, ajustáveis ao seu próprio modelo. Recorrer a um modelo é permitido; o perigo é um marcador de modelo ser lido como redação já revista. A regra procura apenas esses termos na coluna de texto, não examina a cláusula. |

## Normas que segue

| Documento | Número | Regras que o citam |
|---|---|---|
| 《中华人民共和国民法典》 | 现行版本与条号本次未核实 | CS-001, CS-002, CS-003, CS-004, CS-005, CS-006, CS-007 |

**Boundary:** this plugin checks a **合同条款立场台账** for what a register can be held to — that each clause's
text is recorded, that your stance comes from your vocabulary, that the risk grade does too, that a must-have
clause records both a fallback position and an owner, that clause numbers are unique, that the register names
the contract and your side, and that no placeholder survives. It does **not** decide whether a clause should be
accepted, whether a risk is bearable, whether to sign, or whether a negotiating strategy is sound. **Those
depend on the deal, the counterparty's leverage and your own risk appetite.**

> ### ⚠️ What the citation rests on — and one thing this plugin must never be given
>
> **《中华人民共和国民法典》was obtained and read verbatim**, and `rules/evidence/clause-verification.md`
> records what was quoted: article 465 (a contract lawfully formed is protected by law), article 470 (contract
> content **一般包括** the parties, subject matter, quantity, quality, price, performance terms and liability for
> breach), article 509, article 577 (the consequences of breach) and article 584 (damages include expected
> profits but are capped by **foreseeability**).
>
> **The contract part does not regulate a negotiation register.** It governs formation, validity, performance and
> liability; the register's columns come from your enterprise's own contract management rules. So the `excerpt`
> fields still say "本次未取得" and every rule stays `warn` or `info`: **"this column is blank" must not be read
> as "this breaches the Civil Code".** Note also that article 470 says **一般包括**, not 应当包括 — one more
> reason `CS-001` does not claim a direct obligation.
>
> ⚠️ **Do not add a limitation-period rule to this plugin.** The Code *does* fix numbers — article 188 sets a
> three-year limitation (twenty years at the outside) and article 203 rolls a period forward off a public
> holiday — which makes "just compare the dates" look tempting. It is not workable here: the period runs from
> **when the creditor knew or ought to have known** of the harm and the debtor, a finding of fact the register
> does not record; the period is also subject to suspension (article 194) and interruption (article 195), and
> article 196 lists claims the limitation does not apply to at all. A date-arithmetic rule would dress a factual
> finding up as a calculation, which is precisely the over-claim this family avoids.
>
> **No judgement about the substance of a clause is made anywhere in this plugin.** It reads your own columns
> and checks only that they are filled and drawn from your vocabulary. Two vocabularies ship **empty** — the
> stance list (`CS-002`) and the risk grades (`CS-003`) — so with nothing configured those rules report
> themselves in `skipped` rather than passing quietly.

## Compatibility

| Superfície | Estado |
|---|---|
| Harness | Faixa de peers `>=0.1.2-rc.1 <0.2.0 \|\| >=0.2.0-0 <0.3.0` — verificada para aceitar tanto `0.2.0-rc.2` quanto `0.2.1-rc.2`. **`engines.dsh` é declarado como `>=0.2.1-0 <0.3.0`** e o host o aplica desde 0.2.1 |
| Node | `^22.19.0 || >=24.0.0` |
| Plataformas | Todas (ESM puro; sem código nativo, sem rede, sem chamada ao modelo) |
| Modo de ferramenta | Funciona em `native` e `ptc`; para um diretório inteiro use `ptc` |

## What it does

A tabela de regras, os campos e o comportamento detalhado estão em [README.md](README.md#what-it-does) (versão principal em inglês). O plugin apenas lista divergências literais frente às cláusulas citadas e indica em `skipped` cada verificação que não pôde ser executada.

## Configuration

Todos os parâmetros ajustáveis ficam no esquema Schemastery de `src/config.ts`, portanto mudam pelo `cordis.yml` sem editar código; os limites por regra ficam no pacote de regras sob `rules/`.

| Chave | Tipo | Padrão | Descrição |
|---|---|---|---|
| `rulesFile` | string | `rules/contract-stance.yaml` | Caminho do pacote de regras, relativo à raiz do pacote |
| `disabledRules` | string[] | `[]` | Ids de regras a desativar; cada uma aparece em `skipped` |
| `onlyRules` | string[] | `[]` | Executar apenas estas regras; vazio executa todas |
| `skipNotes` | string | `""` | Nota acrescentada a cada motivo de `skipped` |
| `timeoutMs` | number | `120000` | Orçamento de tempo limite cooperativo da ferramenta |

## Material format

Aceita JSON ou YAML. O exemplo completo de campos está em [README.md](README.md#material-format) (versão principal em inglês). Os campos são opcionais na camada de leitura e validados pelo motor, de modo que uma exportação parcial gera achados sobre o que falta em vez de falhar.

## Rule sources

Os dados das regras ficam separados do código: cada regra traz documento, número, cláusula na numeração própria da fonte, trecho literal e URL de origem. O carregador impõe que o trecho seja citação real de pelo menos oito caracteres e que uma verificação baseada apenas em princípio geral (`kind: derived-from-principle`, teto `warn`) ou em política local (`kind: institutional-configuration`, teto `info`) nunca seja declarada `error`.

Os limites verificados e as conclusões deliberadamente **não** afirmadas estão em [README.md](README.md#rule-sources) (versão principal em inglês) e em `rules/evidence/`.

## Troubleshooting

- **O plugin instala mas a ferramenta não aparece**: confirme que `main` resolve para `lib/index.mjs` e que `pnpm run build` o gerou.
- **`dsh plugin add` recusa o pacote**: a faixa de peers cobre `0.1.x` e `0.2.x`; fora dela, conceda isenção explícita com `dsh plugin --profile <name> allow-version <pkg@ver> --dsh-version <runtime> --accept-risk`.
- **Uma regra não executou**: leia o arranjo `skipped`.
- **`check` informa `manifest-peers` como falha**: problema conhecido do `dsh-plugin-dev`; o runtime aplica a compatibilidade na instalação.
- **Os horários parecem deslocados**: toda a aritmética é de hora local sobre as cadeias fornecidas.

## Development

```sh
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
node ../scripts/sync-shared.mjs dsh-contract-stance
```

O último comando copia o kit compartilhado de `../_shared` para `src/shared/`; execute-o novamente após cada alteração compartilhada.

## PerryLink DSH Plugin Family

Este projeto faz parte da família de plugins do DeepSeek Harness da [PerryLink](https://github.com/PerryLink). O registro fica recolhido abaixo para que cada README mantenha uma primeira tela curta; expanda para ver cada linha e seu status.

<details>
<summary>Expandir todos os plugins</summary>

| Plugin | Status |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** |  |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver o README do repositório |

</details>

## License

[Apache License 2.0](LICENSE) © 2026 dsh-contract-stance contributors.
