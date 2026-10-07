import { describeTablePlugin } from './table-plugin-suite.ts'
import { Config } from '../src/config.ts'
import { parseMaterial, runCheck, SPEC } from '../src/model.ts'
import { buildView } from '../src/view.ts'
import { inject, name, resolvePackageFile, TOOL_NAME } from '../src/index.ts'

describeTablePlugin({
  name,
  inject,
  TOOL_NAME,
  resolvePackageFile,
  Config,
  rulesFile: 'rules/contract-stance.yaml',
  parseMaterial,
  runCheck,
  buildView,
  columnNames: SPEC.columns,
  samples: {
    good: {
          "contractNo": "HT-2026-018",
          "contractName": "某某设备采购合同",
          "party": "某某公司",
          "counterparty": "某某供应商",
          "version": "第 3 轮谈判稿",
          "rows": [
                {
                      "条款号": "第 8.2 条",
                      "条款主题": "逾期付款违约金",
                      "条款原文": "买方逾期付款的，每逾期一日按未付金额的万分之五向卖方支付违约金。",
                      "本方立场": "可谈",
                      "风险等级": "中",
                      "风险说明": "违约金比例高于本方同类合同惯例，且未设上限",
                      "退让底线": "比例可降至万分之三，须增加违约金总额不超过合同额 5% 的上限",
                      "是否必保": "是",
                      "谈判责任人": "王经理"
                }
          ]
    },
    unknownColumn: { rows: [{ 备注: '甲' }] },
  },
})
