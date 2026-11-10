#!/usr/bin/env node
/**
 * Build a small, self-annotated seed set from CUAD clause text.
 *
 * CUAD provides the contracts and clause-category labels (CC BY 4.0). The
 * stance/risk/fallback annotations below are our seed labels, not lawyer
 * review and not CUAD labels. They are published as CC BY 4.0 with attribution.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(here, '../public-cuad/.data/CUADv1.json'), 'utf8'))
const ANNOTATIONS = {
  'Uncapped Liability': { riskLevel: '高', stance: 'prefer', stanceRank: '3', fallbackRank: '2', mustHave: '是', note: '无上限责任是高风险条款；至少争取责任上限。', fallback: '以 12 个月费用为责任上限' },
  'Indemnification': { riskLevel: '高', stance: 'prefer', stanceRank: '3', fallbackRank: '2', mustHave: '是', note: '赔偿范围可能过宽；争取互相赔偿并设上限。', fallback: '限于直接损失且设责任上限' },
  'Limitation of Liability': { riskLevel: '高', stance: 'review', stanceRank: '3', fallbackRank: '2', mustHave: '是', note: '责任限制可能排除关键救济。', fallback: '保留重大过失与保密违约除外' },
  'Non-Compete': { riskLevel: '高', stance: 'review', stanceRank: '3', fallbackRank: '1', mustHave: '是', note: '竞业限制影响后续经营。', fallback: '缩短期限并限定地域' },
  'IP Ownership Assignment': { riskLevel: '高', stance: 'prefer', stanceRank: '3', fallbackRank: '2', mustHave: '是', note: '知识产权归属可能转移核心资产。', fallback: '仅转让项目交付物，保留背景 IP' },
  'Termination for Convenience': { riskLevel: '中', stance: 'review', stanceRank: '2', fallbackRank: '1', mustHave: '否', note: '任意解除可能造成投入损失。', fallback: '增加通知期与未摊薄成本补偿' },
  'Governing Law': { riskLevel: '中', stance: 'review', stanceRank: '2', fallbackRank: '1', mustHave: '否', note: '适用法律影响争议解决。', fallback: '选择中性法域或仲裁地' },
  'Confidentiality': { riskLevel: '中', stance: 'review', stanceRank: '2', fallbackRank: '1', mustHave: '否', note: '保密期限与范围需核对。', fallback: '保密期 3 年，排除公开信息' },
  'Notice': { riskLevel: '低', stance: 'accept', stanceRank: '1', fallbackRank: '1', mustHave: '否', note: '通知条款通常为程序性。', fallback: '保留书面通知即可' },
  'Severability': { riskLevel: '低', stance: 'accept', stanceRank: '1', fallbackRank: '1', mustHave: '否', note: '可分割条款通常为程序性。', fallback: '接受标准可分割条款' },
}

const rows = []
for (const contract of data.data) {
  const qas = contract.paragraphs?.[0]?.qas ?? []
  for (const qa of qas) {
    const category = String(qa.question ?? '').match(/related to "([^"]+)"/)?.[1]
    if (!category || !(category in ANNOTATIONS)) continue
    const answer = (qa.answers ?? []).find((item) => String(item.text ?? '').trim().length >= 40)
    if (!answer) continue
    if (rows.filter((row) => row.条款主题 === category).length >= 5) continue
    const a = ANNOTATIONS[category]
    rows.push({
      条款号: `${rows.length + 1}`,
      条款主题: category,
      条款原文: String(answer.text).replace(/\s+/gu, ' ').trim(),
      本方立场: a.stance,
      立场等级: a.stanceRank,
      风险等级: a.riskLevel,
      风险说明: a.note,
      退让底线: a.fallback,
      退让底线等级: a.fallbackRank,
      是否必保: a.mustHave,
      谈判责任人: 'Legal',
    })
  }
}
const out = {
  contractName: 'CUAD seed (multiple contracts)',
  party: 'Company',
  annotationLicense: 'CC BY 4.0 (our seed annotations); clause text CC BY 4.0, The Atticus Project',
  source: 'https://github.com/The-Atticus-Project/cuad',
  rows,
}
writeFileSync(join(here, 'seed.json'), JSON.stringify(out, null, 2) + '\n')
console.log(`wrote seed.json: ${rows.length} rows / ${new Set(rows.map((row) => row.条款主题)).size} topics`)
