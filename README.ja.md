# Fairbuild

*Claude による翻訳です。ネイティブスピーカーによる確認は未了です。英語の [README](README.md) が正本です。*

ゼネコン、専門工事会社、設備・サービス会社のバックオフィス向けの小さな MCP エージェント 30 個。各エージェントは**一つの仕事**だけを担当し、Procore、Sage 100/300 Contractor、Foundation、Vista、QuickBooks、Buildertrend、ServiceTitan や表計算からすでにエクスポートしているファイルを読み、あなたのコンピューター上にレポートと下書きを書き出します。

MIT ライセンス · Node 20 以降 · ローカルファイルのみ · 認証情報不要 · 架空のテストデータのみ

固定価格の導入サービス：[Fairbuild](https://fair-agents.com/fairbuild.html)。

## 試してみる

```bash
npx -y rhine-of-costcodes demo
npx -y platte-of-releases demo
```

各エージェントには架空のファイルで動く `demo`、独自のテストケースを持つ `eval`、MCP サーバー（`<agent> mcp --root <folder>`）があります。

## エージェント一覧

**工事原価・請求・資金:** [`rhine-of-costcodes`](packages/rhine-of-costcodes), [`danube-of-commitments`](packages/danube-of-commitments), [`volga-of-changeorders`](packages/volga-of-changeorders), [`seine-of-values`](packages/seine-of-values), [`thames-of-payapps`](packages/thames-of-payapps), [`loire-of-wip`](packages/loire-of-wip), [`nile-of-retainage`](packages/nile-of-retainage), [`lena-of-cashflow`](packages/lena-of-cashflow)

**協力会社と買掛金:** [`yangtze-of-matching`](packages/yangtze-of-matching), [`platte-of-releases`](packages/platte-of-releases), [`tiber-of-waivers`](packages/tiber-of-waivers), [`ganges-of-insurance`](packages/ganges-of-insurance), [`indus-of-compliance`](packages/indus-of-compliance), [`orinoco-of-vendors`](packages/orinoco-of-vendors), [`brazos-of-backcharges`](packages/brazos-of-backcharges), [`mekong-of-tickets`](packages/mekong-of-tickets), [`tagus-of-salestax`](packages/tagus-of-salestax)

**給与と労務:** [`hudson-of-wages`](packages/hudson-of-wages), [`yukon-of-fringes`](packages/yukon-of-fringes), [`columbia-of-timecards`](packages/columbia-of-timecards)

**現場・許可・竣工:** [`colorado-of-equipment`](packages/colorado-of-equipment), [`zambezi-of-permits`](packages/zambezi-of-permits), [`oder-of-submittals`](packages/oder-of-submittals), [`elbe-of-punchlists`](packages/elbe-of-punchlists), [`douro-of-closeout`](packages/douro-of-closeout)

**入札・受注残・ボンド:** [`congo-of-bids`](packages/congo-of-bids), [`limpopo-of-backlog`](packages/limpopo-of-backlog), [`vistula-of-bonding`](packages/vistula-of-bonding)

**サービスと保証:** [`shannon-of-service`](packages/shannon-of-service), [`murray-of-warranty`](packages/murray-of-warranty)

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
