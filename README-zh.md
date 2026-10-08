# dsh-contract-stance

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

| 项目 | 状态 |
|---|---|
| Harness | 对等版本范围 `>=0.1.2-rc.1 <0.2.0 \|\| >=0.2.0-0 <0.3.0` —— 已实测同时接受 `0.2.0-rc.2` 与 `0.2.1-alpha.1`。**刻意不声明 `engines.dsh`**：它没有任何读取者，也无法拒装任何宿主 |
| Node | `^22.19.0 || >=24.0.0` |
| 平台 | 全平台（纯 ESM；无原生代码、无联网、不调用模型） |
| 工具模式 | `native` / `ptc` / `both` 均可；批量校验整个目录时建议 `ptc`，schema 成本只付一次 |

## What it does

规则表、字段说明与行为细节见 [README.md](README.md#what-it-does)（英文主版本）。本插件只列出材料与所引条款之间的字面差异，并对无法执行的检查在 `skipped` 中逐项说明。

## Install

```sh
dsh plugin --profile <name> add dsh-contract-stance
dsh --profile <name> --dump-config | grep 'dsh-contract-stance'
```

## Configuration

全部可调参数都在 `src/config.ts` 的 Schemastery schema 中，只改 `cordis.yml` 即可生效，无需改代码；逐条阈值在 `rules/` 下的规则库文件里。配置键与逐条规则的参数说明见 [README.md](README.md#configuration)（英文主版本）。

## Material format

支持 JSON 与 YAML。完整字段示例见 [README.md](README.md#material-format)（英文主版本）。字段在读取层是可选的，由检查引擎校验，因此部分导出的材料会产生"缺项"类差异，而不是让程序崩溃。

## Rule sources

规则数据与代码分离，每条规则都带文件名、文号、按原文自身编号体系的条款号、逐字摘录与来源地址。加载期强制：摘录必须是真实引文且不少于八个字符；依据仅为原则性条款（`kind: derived-from-principle`，严重级上限 `warn`）或本机构配置（`kind: institutional-configuration`，上限 `info`）的检查不得标为 `error`。夸大依据的规则库会在加载期失败，而不会产出一份看起来很有底气的报告。

核验中确认的边界与"刻意没有作出的结论"见 [README.md](README.md#rule-sources)（英文主版本）与随包的 `rules/evidence/` 目录。

## Troubleshooting

- **插件装上了但工具不出现**：确认 `main` 指向 `lib/index.mjs` 且 `pnpm run build` 已生成该文件；`main` 写错会让加载器静默跳过该条目。
- **`dsh plugin add` 报版本不兼容**：peer 范围覆盖 `0.1.x` 与 `0.2.x`；若运行时在其之外，可显式豁免：`dsh plugin --profile <name> allow-version <包名@版本> --dsh-version <runtime> --accept-risk`
- **某条规则没有执行**：查看 `skipped` 数组，其中写明了规则 id 与原因。
- **`check` 报 `manifest-peers` 失败**：静态检查器比对的是一份早于 0.2 世代的硬编码 peer 范围；安装期的 peer 校验以运行时为准。这是 `dsh-plugin-dev` 的已知上游问题。
- **时间看起来偏移**：全部计算都是对输入字符串做墙上时钟运算，不做时区换算。

## Development

```sh
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
node ../scripts/sync-shared.mjs dsh-contract-stance
```

第 4 项把 `../_shared` 的共享件同步进 `src/shared/`；每次改动共享件后都要重跑。

## License

[Apache License 2.0](LICENSE) © 2026 dsh-contract-stance contributors.
