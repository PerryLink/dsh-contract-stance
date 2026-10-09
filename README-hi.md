# dsh-contract-stance — संविदा खंड पक्ष-रुख रजिस्टर की पूर्णता और आंतरिक सुसंगति की जाँच

[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)

`dsh-contract-stance` संविदा खंडों के पक्ष-रुख रजिस्टर को पढ़ता है — संविदा का हेडर और प्रत्येक खंड की एक पंक्ति — और उसी रजिस्टर की पूर्णता तथा आंतरिक सुसंगति की जाँच करता है: क्या प्रत्येक खंड का मूल पाठ दर्ज है, क्या आपका पक्ष-रुख आपकी अपनी शब्दावली से लिया गया है और जोखिम-श्रेणी भी, क्या अनिवार्य खंड में छूट की सीमा और ज़िम्मेदार व्यक्ति दोनों दर्ज हैं, क्या खंड-संख्याएँ अद्वितीय हैं, क्या रजिस्टर संविदा और आपके पक्ष का उल्लेख करता है, और क्या खंड के पाठ में कोई अपरिवर्तित टेम्पलेट प्लेसहोल्डर शेष नहीं है।

## आउटपुट कैसा दिखता है

![Terminal demo of dsh-contract-stance: real output over its CS-001 fixture](https://raw.githubusercontent.com/PerryLink/dsh-contract-stance/main/docs/assets/dsh-contract-stance-demo.png)

इस प्लगइन का अपने ही `CS-001` टेस्ट फ़िक्स्चर पर वास्तविक आउटपुट — कोई नकली चित्र नहीं। नियम-पैक उद्धरण नहीं गढ़ता, इसलिए हर निष्कर्ष लागू किए गए खंड का नाम और यह भी बताता है कि उसका मूल पाठ इस बार प्राप्त नहीं हुआ।

## यह किन सवालों का जवाब देता है

| आपका सवाल | इसका जवाब |
|---|---|
| किसी पंक्ति में विषय भरा है, पर खंड-पाठ का कॉलम खाली है। क्या यह दर्ज होता है? | हाँ। `CS-001` हर पंक्ति में `text` कॉलम की अपेक्षा करता है: पाठ के बिना यह जाँचा ही नहीं जा सकता कि पक्ष-रुख किस शब्दावली पर है। नियम केवल यह देखता है कि पाठ दर्ज है; यह नहीं आँकता कि खंड स्वीकार्य है या उसमें विधिक जोखिम है। |
| पक्ष-रुख और जोखिम-श्रेणी दोनों भरे हैं, फिर भी हर पंक्ति `skipped` आती है। क्यों? | क्योंकि दोनों मान-सूचियाँ फ़ैक्टरी से खाली आती हैं। `CS-002` पक्ष-रुख केवल उसके लिए कॉन्फ़िगर की गई सूची से स्वीकार करता है, और `CS-003` जोखिम-श्रेणी के साथ वही करता है; सूची कॉन्फ़िगर न हो तो कोई भी नियम चल नहीं सकता, इसलिए दोनों चुपचाप पास होने के बजाय स्वयं को `skipped` में दर्ज करते हैं। `CS-002` केवल यह देखता है कि मान आपकी सूची में है, यह नहीं कि पक्ष-रुख उपयुक्त है; `CS-003` केवल यह देखता है कि मान सूची में है, यह नहीं कि उस खंड का वास्तविक जोखिम कितना ऊँचा है। |
| एक खंड अनिवार्य चिह्नित है, पर कहीं नहीं लिखा कि कहाँ तक छूट दी जा सकती है और निर्णय कौन लेगा। | `CS-004` रजिस्टर के अपने अनिवार्य-कॉलम को पढ़ता है: जब उसमें `是`, `Y`, `yes`, `true`, `必保` या `√` हो (मान `conditionValues` से तय होते हैं), तो `fallback` और `owner` दोनों कॉलम भरे होने चाहिए। यह केवल यह देखता है कि ये दोनों भरे हैं, यह नहीं कि छूट की सीमा उचित है; कौन-से खंड अनिवार्य हैं, यह पूरी तरह परियोजना पर निर्भर है और नियम इसका निर्णय नहीं करता। |
| एक ही खंड-संख्या दो पंक्तियों में है, हर मसौदे के लिए एक। क्या यह दोष है? | `CS-005` दोहराई गई खंड-संख्या दर्ज करता है और तुलना में रिक्त स्थान छोड़ देता है। दोहरी संख्या से किसी एक खंड की सटीक पहचान नहीं हो पाती। एक खंड का प्रति-मसौदा एक बार आना सामान्य है: संख्या दोहराने के बजाय संस्करण कॉलम में उसे अलग दिखाएँ। कोई खंड यह नहीं कहता कि संख्याएँ अद्वितीय हों — अद्वितीयता रजिस्टर की संदर्भ-योग्यता के लिए है। |
| हेडर में नहीं लिखा कि यह कौन-सी संविदा है और हमारा पक्ष कौन है। | `CS-006` अपेक्षा करता है कि सामग्री का हेडर `contractName` और `party` दर्ज करे: इन दोनों के बिना पक्ष-रुख किसी विशेष सौदे और पक्ष तक नहीं जोड़ा जा सकता। यदि आपके फ़ॉर्म में मसौदों के लिए संस्करण कॉलम है, तो उसे उस नियम के `fields` में जोड़ दें। नियम केवल यह देखता है कि हेडर ये दोनों घोषित करता है। |
| खंड-पाठ सीधे किसी नमूना-प्रारूप से कॉपी किया गया है और उसमें अब भी 【】 या TBD है। | `CS-007` ऐसे पाठ को दर्ज करता है जिसमें उसके प्लेसहोल्डर शब्द अब भी हैं: `【`, `】`, `{{`, `}}`, `XXX`, `xxx`, `待填`, `待补充`, `TBD`, `todo`, `示例` — इन्हें अपने प्रारूप के अनुसार बदला जा सकता है। नमूना-प्रारूप देखना अनुमत है; ख़तरा यह है कि टेम्पलेट का प्लेसहोल्डर पहले से समीक्षित शब्दावली मान लिया जाए। नियम केवल पाठ-कॉलम में इन शब्दों को खोजता है, खंड की समीक्षा नहीं करता। |

## यह किन मानकों पर आधारित है

| दस्तावेज़ | संख्यांक | इन्हें उद्धृत करने वाले नियम |
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

सभी समायोज्य पैरामीटर `src/config.ts` की Schemastery स्कीमा में हैं, इसलिए कोड बदले बिना `cordis.yml` से बदले जा सकते हैं; प्रति-नियम सीमाएँ `rules/` के नियम-पैक में हैं।

| कुंजी | प्रकार | डिफ़ॉल्ट | विवरण |
|---|---|---|---|
| `rulesFile` | string | `rules/contract-stance.yaml` | नियम-पैक का पथ, पैकेज रूट के सापेक्ष |
| `disabledRules` | string[] | `[]` | बंद करने वाले नियम id; प्रत्येक `skipped` में दिखता है |
| `onlyRules` | string[] | `[]` | केवल ये नियम चलाएँ; खाली होने पर सभी नियम चलते हैं |
| `skipNotes` | string | `""` | हर `skipped` कारण के आगे जोड़ी जाने वाली टिप्पणी |
| `timeoutMs` | number | `120000` | उपकरण का सहकारी समय-सीमा बजट |

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
