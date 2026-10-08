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

| सतह | स्थिति |
|---|---|
| Harness | peer रेंज `>=0.1.2-rc.1 <0.2.0 \|\| >=0.2.0-0 <0.3.0` — `0.2.0-rc.2` और `0.2.1-alpha.1` दोनों को स्वीकार करने के लिए सत्यापित। **`engines.dsh` जानबूझकर घोषित नहीं**: इसका कोई पाठक नहीं और यह किसी होस्ट को अस्वीकार नहीं कर सकता |
| Node | `^22.19.0 || >=24.0.0` |
| प्लेटफ़ॉर्म | सभी (शुद्ध ESM; कोई नेटिव कोड नहीं, कोई नेटवर्क नहीं, कोई मॉडल कॉल नहीं) |
| टूल मोड | `native`, `ptc` और `both` में काम करता है; पूरे फ़ोल्डर के लिए `ptc` चुनें |

## What it does

नियम-सूची, फ़ील्ड और विस्तृत व्यवहार [README.md](README.md#what-it-does) (अंग्रेज़ी मुख्य संस्करण) में हैं। यह प्लगइन केवल उद्धृत धाराओं के सामने शाब्दिक अंतर सूचीबद्ध करता है और हर न चल पाई जाँच को `skipped` में बताता है।

## Install

```sh
dsh plugin --profile <name> add dsh-contract-stance
dsh --profile <name> --dump-config | grep 'dsh-contract-stance'
```

## Configuration

सभी समायोज्य पैरामीटर `src/config.ts` की Schemastery स्कीमा में हैं, इसलिए कोड बदले बिना `cordis.yml` से बदले जा सकते हैं; प्रति-नियम सीमाएँ `rules/` के नियम-पैक में हैं। कुंजियाँ और प्रति-नियम पैरामीटर [README.md](README.md#configuration) (अंग्रेज़ी मुख्य संस्करण) में हैं।

## Material format

JSON या YAML स्वीकार्य है। पूरा फ़ील्ड उदाहरण [README.md](README.md#material-format) (अंग्रेज़ी मुख्य संस्करण) में है। पढ़ने की परत में फ़ील्ड वैकल्पिक हैं और जाँच इंजन उन्हें सत्यापित करता है, इसलिए आंशिक निर्यात पर क्रैश के बजाय "अनुपस्थित" श्रेणी के निष्कर्ष मिलते हैं।

## Rule sources

नियम-डेटा कोड से अलग है: प्रत्येक नियम में दस्तावेज़, संख्या, स्रोत की अपनी क्रमांकन-प्रणाली के अनुसार धारा, शब्दशः उद्धरण और स्रोत URL होता है। लोडर लागू करता है कि उद्धरण कम से कम आठ अक्षरों का वास्तविक उद्धरण हो, और जिस जाँच का आधार केवल सामान्य सिद्धांत (`kind: derived-from-principle`, अधिकतम `warn`) या स्थानीय नीति (`kind: institutional-configuration`, अधिकतम `info`) हो, उसे कभी `error` घोषित न किया जाए।

सत्यापित सीमाएँ और जान-बूझकर **न** कहे गए निष्कर्ष [README.md](README.md#rule-sources) (अंग्रेज़ी मुख्य संस्करण) और `rules/evidence/` में हैं।

## Troubleshooting

- **प्लगइन इंस्टॉल हो गया पर टूल दिखता नहीं**: जाँचें कि `main` `lib/index.mjs` पर जाता है और `pnpm run build` ने उसे बनाया है।
- **`dsh plugin add` असंगत बताकर मना करता है**: peer range `0.1.x` और `0.2.x` दोनों को कवर करती है; बाहर होने पर स्पष्ट छूट दें: `dsh plugin --profile <name> allow-version <pkg@ver> --dsh-version <runtime> --accept-risk`।
- **कोई नियम नहीं चला**: `skipped` सरणी देखें।
- **`check` में `manifest-peers` विफल दिखता है**: यह `dsh-plugin-dev` की ज्ञात अपस्ट्रीम समस्या है; रनटाइम इंस्टॉल के समय अनुकूलता लागू करता है।
- **समय खिसका हुआ लगता है**: सारी गणना दिए गए स्ट्रिंग पर वॉल-क्लॉक है।

## Development

```sh
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
node ../scripts/sync-shared.mjs dsh-contract-stance
```

अंतिम कमांड `../_shared` का साझा किट `src/shared/` में कॉपी करता है; हर साझा बदलाव के बाद इसे दोबारा चलाएँ।

## License

[Apache License 2.0](LICENSE) © 2026 dsh-contract-stance contributors.
