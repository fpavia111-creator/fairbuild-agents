# Fairbuild

*由 Claude 翻译；尚待母语人士审校。以英文 [README](README.md) 为准。*

面向总承包商、分包商和专业工程与维修服务公司后台的 30 个小型 MCP 代理。每个代理只负责**一项工作**，读取你已经从 Procore、Sage 100/300 Contractor、Foundation、Vista、QuickBooks、Buildertrend、ServiceTitan 或电子表格导出的文件，并在你的电脑上写出报告和草稿。

MIT 许可证 · Node 20 或更高版本 · 仅本地文件 · 无需凭据 · 仅虚构测试数据

固定价格的部署服务：[Fairbuild](https://fair-agents.com/fairbuild.html)。

## 试用

```bash
npx -y rhine-of-costcodes demo
npx -y platte-of-releases demo
```

每个代理都有使用虚构文件的 `demo`、带自有测试用例的 `eval`，以及 MCP 服务器（`<agent> mcp --root <文件夹>`）。

## 代理列表

**项目成本、计量与现金:** [`rhine-of-costcodes`](packages/rhine-of-costcodes), [`danube-of-commitments`](packages/danube-of-commitments), [`volga-of-changeorders`](packages/volga-of-changeorders), [`seine-of-values`](packages/seine-of-values), [`thames-of-payapps`](packages/thames-of-payapps), [`loire-of-wip`](packages/loire-of-wip), [`nile-of-retainage`](packages/nile-of-retainage), [`lena-of-cashflow`](packages/lena-of-cashflow)

**分包商与应付账款:** [`yangtze-of-matching`](packages/yangtze-of-matching), [`platte-of-releases`](packages/platte-of-releases), [`tiber-of-waivers`](packages/tiber-of-waivers), [`ganges-of-insurance`](packages/ganges-of-insurance), [`indus-of-compliance`](packages/indus-of-compliance), [`orinoco-of-vendors`](packages/orinoco-of-vendors), [`brazos-of-backcharges`](packages/brazos-of-backcharges), [`mekong-of-tickets`](packages/mekong-of-tickets), [`tagus-of-salestax`](packages/tagus-of-salestax)

**工资与劳务:** [`hudson-of-wages`](packages/hudson-of-wages), [`yukon-of-fringes`](packages/yukon-of-fringes), [`columbia-of-timecards`](packages/columbia-of-timecards)

**现场、许可与竣工:** [`colorado-of-equipment`](packages/colorado-of-equipment), [`zambezi-of-permits`](packages/zambezi-of-permits), [`oder-of-submittals`](packages/oder-of-submittals), [`elbe-of-punchlists`](packages/elbe-of-punchlists), [`douro-of-closeout`](packages/douro-of-closeout)

**投标、在手订单与保函:** [`congo-of-bids`](packages/congo-of-bids), [`limpopo-of-backlog`](packages/limpopo-of-backlog), [`vistula-of-bonding`](packages/vistula-of-bonding)

**服务与保修:** [`shannon-of-service`](packages/shannon-of-service), [`murray-of-warranty`](packages/murray-of-warranty)

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
