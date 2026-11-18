# Fairbuild

*Claude による翻訳です。ネイティブスピーカーによる確認は未了です。英語の [README](README.md) が正本です。*

ゼネコン、専門工事会社、設備・サービス会社のバックオフィス向けの小さな MCP エージェント 30 個。各エージェントは**一つの仕事**だけを担当し、Procore、Sage 100/300 Contractor、Foundation、Vista、QuickBooks、Buildertrend、ServiceTitan や表計算からすでにエクスポートしているファイルを読み、あなたのコンピューター上にレポートと下書きを書き出します。

MIT ライセンス · Node 20 以降 · ローカルファイルのみ · 認証情報不要 · 架空のテストデータのみ

固定価格の導入サービス：[Fairbuild](https://fair-agents.com/fairbuild.html)。

## 試してみる

```bash
npx -y fairbuild-job-cost demo
npx -y fairbuild-payment-release demo
```

各エージェントには架空のファイルで動く `demo`、独自のテストケースを持つ `eval`、MCP サーバー（`<agent> mcp --root <folder>`）があります。

## エージェント一覧

**工事原価・請求・資金:** [`fairbuild-job-cost`](packages/fairbuild-job-cost), [`fairbuild-commitments`](packages/fairbuild-commitments), [`fairbuild-change-orders`](packages/fairbuild-change-orders), [`fairbuild-schedule-of-values`](packages/fairbuild-schedule-of-values), [`fairbuild-pay-applications`](packages/fairbuild-pay-applications), [`fairbuild-wip-schedule`](packages/fairbuild-wip-schedule), [`fairbuild-retainage`](packages/fairbuild-retainage), [`fairbuild-job-cash-flow`](packages/fairbuild-job-cash-flow)

**協力会社と買掛金:** [`fairbuild-three-way-match`](packages/fairbuild-three-way-match), [`fairbuild-payment-release`](packages/fairbuild-payment-release), [`fairbuild-lien-waivers`](packages/fairbuild-lien-waivers), [`fairbuild-insurance-certificates`](packages/fairbuild-insurance-certificates), [`fairbuild-sub-compliance`](packages/fairbuild-sub-compliance), [`fairbuild-duplicate-vendors`](packages/fairbuild-duplicate-vendors), [`fairbuild-backcharges`](packages/fairbuild-backcharges), [`fairbuild-delivery-tickets`](packages/fairbuild-delivery-tickets), [`fairbuild-sales-tax`](packages/fairbuild-sales-tax)

**給与と労務:** [`fairbuild-certified-payroll`](packages/fairbuild-certified-payroll), [`fairbuild-union-fringes`](packages/fairbuild-union-fringes), [`fairbuild-timecards`](packages/fairbuild-timecards)

**現場・許可・竣工:** [`fairbuild-equipment-rentals`](packages/fairbuild-equipment-rentals), [`fairbuild-permits`](packages/fairbuild-permits), [`fairbuild-submittals`](packages/fairbuild-submittals), [`fairbuild-punch-lists`](packages/fairbuild-punch-lists), [`fairbuild-closeout`](packages/fairbuild-closeout)

**入札・受注残・ボンド:** [`fairbuild-bid-leveling`](packages/fairbuild-bid-leveling), [`fairbuild-backlog`](packages/fairbuild-backlog), [`fairbuild-bonding-capacity`](packages/fairbuild-bonding-capacity)

**サービスと保証:** [`fairbuild-service-tickets`](packages/fairbuild-service-tickets), [`fairbuild-warranty-callbacks`](packages/fairbuild-warranty-callbacks)

## 安全に保つ仕組み

- **ローカルファイルのみ。** 会計・工事管理システム、銀行、保証会社、保険会社、行政ポータルにはログインしません。ネットワーク通信もテレメトリもありません。
- **支払い・届出・送信は人が行います。** 支払、先取特権の登録や解除、出来高請求の提出や承認、仕訳の計上、メール送信はすべて拒否されます。下書きは Auto モードでも、名前のある担当者のクリックを待ちます。
- **モデルに渡る前にマスク。** 作業員の氏名と ID、社会保障番号、施主の連絡先は仮名（`PERSON-3f9a1c2e`）になります。
- **隠れたルールではなく設定。** 保留金率、通知日数、しきい値、賃率はあなたが管理する設定ファイルから読みます。
- **すべて記録。** すべての呼び出しはハッシュで連結された監査ログに残ります。

## 限界

法律、税務、保険、保証、会計に関する助言ではありません。各エクスポートの列名はまだ実際のエクスポートで検証されていません。最初の導入時に一緒に確認します。9 言語のファイル（文字コード、数値、日付、列名）を読みます。結果と CSV は英語のままで、レポートページは 9 言語すべてで出力できます（`--lang`）。

## ライセンス

MIT。[LICENSE](LICENSE) を参照してください。
