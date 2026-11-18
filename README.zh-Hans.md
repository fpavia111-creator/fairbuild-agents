# Fairbuild

*由 Claude 翻译；尚待母语人士审校。以英文 [README](README.md) 为准。*

面向总承包商、分包商和专业工程与维修服务公司后台的 30 个小型 MCP 代理。每个代理只负责**一项工作**，读取你已经从 Procore、Sage 100/300 Contractor、Foundation、Vista、QuickBooks、Buildertrend、ServiceTitan 或电子表格导出的文件，并在你的电脑上写出报告和草稿。

MIT 许可证 · Node 20 或更高版本 · 仅本地文件 · 无需凭据 · 仅虚构测试数据

固定价格的部署服务：[Fairbuild](https://fair-agents.com/fairbuild.html)。

## 试用

```bash
npx -y fairbuild-job-cost demo
npx -y fairbuild-payment-release demo
```

每个代理都有使用虚构文件的 `demo`、带自有测试用例的 `eval`，以及 MCP 服务器（`<agent> mcp --root <文件夹>`）。

## 代理列表

**项目成本、计量与现金:** [`fairbuild-job-cost`](packages/fairbuild-job-cost), [`fairbuild-commitments`](packages/fairbuild-commitments), [`fairbuild-change-orders`](packages/fairbuild-change-orders), [`fairbuild-schedule-of-values`](packages/fairbuild-schedule-of-values), [`fairbuild-pay-applications`](packages/fairbuild-pay-applications), [`fairbuild-wip-schedule`](packages/fairbuild-wip-schedule), [`fairbuild-retainage`](packages/fairbuild-retainage), [`fairbuild-job-cash-flow`](packages/fairbuild-job-cash-flow)

**分包商与应付账款:** [`fairbuild-three-way-match`](packages/fairbuild-three-way-match), [`fairbuild-payment-release`](packages/fairbuild-payment-release), [`fairbuild-lien-waivers`](packages/fairbuild-lien-waivers), [`fairbuild-insurance-certificates`](packages/fairbuild-insurance-certificates), [`fairbuild-sub-compliance`](packages/fairbuild-sub-compliance), [`fairbuild-duplicate-vendors`](packages/fairbuild-duplicate-vendors), [`fairbuild-backcharges`](packages/fairbuild-backcharges), [`fairbuild-delivery-tickets`](packages/fairbuild-delivery-tickets), [`fairbuild-sales-tax`](packages/fairbuild-sales-tax)

**工资与劳务:** [`fairbuild-certified-payroll`](packages/fairbuild-certified-payroll), [`fairbuild-union-fringes`](packages/fairbuild-union-fringes), [`fairbuild-timecards`](packages/fairbuild-timecards)

**现场、许可与竣工:** [`fairbuild-equipment-rentals`](packages/fairbuild-equipment-rentals), [`fairbuild-permits`](packages/fairbuild-permits), [`fairbuild-submittals`](packages/fairbuild-submittals), [`fairbuild-punch-lists`](packages/fairbuild-punch-lists), [`fairbuild-closeout`](packages/fairbuild-closeout)

**投标、在手订单与保函:** [`fairbuild-bid-leveling`](packages/fairbuild-bid-leveling), [`fairbuild-backlog`](packages/fairbuild-backlog), [`fairbuild-bonding-capacity`](packages/fairbuild-bonding-capacity)

**服务与保修:** [`fairbuild-service-tickets`](packages/fairbuild-service-tickets), [`fairbuild-warranty-callbacks`](packages/fairbuild-warranty-callbacks)

## 如何保证安全

- **仅本地文件。** 不登录财务或项目管理系统、银行、担保公司、保险公司或政府门户；无网络调用，无遥测。
- **付款、申报和发送由人完成。** 付款、登记或解除留置权、提交或批准进度款申请、记账和发送邮件都会被拒绝。草稿即使在 Auto 模式下也要等待指定人员点击。
- **在模型看到之前先做掩码。** 工人姓名和编号、社会保障号码以及业主联系方式会变成化名（`PERSON-3f9a1c2e`）。
- **用设置代替隐藏规则。** 保留金比例、通知天数、阈值和工资标准都来自你掌控的设置文件。
- **全程留痕。** 每次调用都写入哈希链式审计日志。

## 局限

不提供法律、税务、保险、担保或会计建议。各导出文件的列名尚未在真实导出文件上验证；首次部署时会与你一起确认。可读取九种语言的文件（编码、数字、日期、列名）；结果和 CSV 保持英文，报告页面可用全部九种语言生成（`--lang`）。

## 许可证

MIT。见 [LICENSE](LICENSE)。
