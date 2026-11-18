# Fairbuild Payment Release (`fairbuild-payment-release`)

Checks each subcontractor invoice before it is paid: project manager approval, the owner paid for that month (pay-when-paid, when you use it), a conditional lien waiver, a current insurance certificate, a W-9 on file and retainage at the subcontract rate. Clears or holds each invoice with its reasons and records payment releases only after one named person's click. Paying is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-payment-release demo
npx -y fairbuild-payment-release mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `invoices` (required) | Subcontractor invoices waiting for payment under --root (CSV, Excel or JSON): invoice, subcontractor, job, commitment, date, amount, retainage withheld, project manager approval |
| `owner_payments` | Optional owner payments by job and month (period YYYY-MM, received yes or no), for pay-when-paid |
| `waivers` | Optional lien waiver log: subcontractor, invoice, waiver type, received date |
| `vendors` | Optional subcontractor status: insurance certificate expiry, W-9 on file, retainage rate |
| `settings` | Optional settings JSON (release_settings schema): pay_when_paid, require_waiver |

Only `invoices` is required. Each optional file turns on the checks that need it.

## Checks

What `payment_release_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `owner_not_paid` | The owner has not paid job 24-102 for 2026-11. Under pay-when-paid this invoice waits. |
| `coi_expired` | Sample Mechanical Inc's insurance certificate expired on 2026-10-31. |
| `not_approved` | The project manager has not approved this invoice. |
| `no_conditional_waiver` | No conditional waiver on file for SP-13. |
| `no_w9` | No W-9 on file for Test Drywall Co. |
| `retainage_short` | Retainage withheld is 0; 10% of 3000 is 300. Release 2700, not 3000. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-payment-release demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Payment Release demo (fictional subcontractor invoices), Auto mode on for drafts

▶ Check six invoices before the payment run
  status: executed  decision: allow
  6 subcontractor invoice(s): 1 clear to release, 1 to release at a corrected amount, 4 held. 38700 can be released, 79200 is held for approval, owner payment, waivers, insurance or W-9.
    ER-7002  Example Roofing LLC     55000 releasable  49500  hold     owner_not_paid
    SM-50    Sample Mechanical Inc   12000 releasable  10800  hold     coi_expired
    SP-13    Sample Painting Co       3000 releasable   2700  hold     not_approved, owner_not_paid, no_conditional_waiver
    TD-101   Test Drywall Co         18000 releasable  16200  hold     no_w9
    EE-5502  Example Electric Inc     3000 releasable   2700  review   retainage_short
    EC-2231  Example Concrete LLC    40000 releasable  36000  release  

▶ Explain SP-13
  status: executed  decision: allow
  SP-13 Sample Painting Co (job 24-102) 3000: hold; releasable 2700 after retainage. The project manager has not approved this invoice. The owner has not paid job 24-102 for 2026-11. Under pay-when-paid this invoice waits. No conditional waiver on file for SP-13.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 6 subcontractor invoice(s): 1 clear to release, 1 to release at a corrected amount, 4 held. 38700 can be released, 79200 is held for approval, owner payment, waivers, insurance or W-9.

▶ Draft a payment status notice (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  notice Sample Painting Co drafted with 2 open marker(s) ([TO CONFIRM subcontractor contact], [TO CONFIRM your name and company]). Nothing was sent.

▶ Approve releasing EC-2231: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: move_money stays one-click, even in Auto

▶ Agent tries to pay the invoice itself
  status: blocked  decision: block
  reason: Fairbuild Payment Release never pays; accounts payable pays after a recorded release approval.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `payment_release_check` | Per invoice: project manager approval, the owner paid that job for the month (pay-when-paid), a conditional waiver on file, a current insurance certificate, a W-9 on file and retainage at the subcontract rate. | runs |
| `payment_release_explain` | Show one invoice's release check with every finding. | runs |
| `payment_release_write_report` | Write the release worklist as payment-release.csv (one row per item, blank decision columns for people to fill in) and payment-release.html into out_dir (default fairbuild-out/payment-release). | runs |
| `payment_release_draft_notice` | Write drafts/notice-<vendor>.md: a payment status notice to one subcontractor listing its held invoices and what clears them. | asks first (Auto can be opted in) |
| `payment_release_request_send` | After one named human click (even in Auto), record that the reviewed notice draft is approved in notice-requests.csv. | one named click, even in Auto (`binding_send`) |
| `payment_release_request_release` | After one named human click (even in Auto), record in release-approvals.csv that accounts payable may pay one subcontractor invoice, up to its releasable amount. | one named click, even in Auto (`move_money`) |
| `ap_pay_invoice` | Fairbuild Payment Release never pays; accounts payable pays after a recorded release approval. | refused |
| `payment_batch_release` | Fairbuild Payment Release never releases a payment batch in your accounting or banking system. | refused |
| `email_send` | Fairbuild Payment Release never sends the notice; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Subcontractor invoices (`invoices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `invoice_number` (required) | text | Invoice Number, Invoice, Invoice No, Invoice #, Inv No, Bill # | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `vendor` | text | Vendor, Vendor Name, Subcontractor, Sub, Supplier, Contract Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `vendor_id` | text | Vendor ID, Vendor Number, Vendor No, Vendor Code, Supplier ID | Lieferantennummer, Code fournisseur, 仕入先コード, 供应商编号 |
| `job` | text | Job, Job Number, Job No, Job #, Job No., Job ID | Projekt, Chantier, 工事番号, 项目编号 |
| `cost_code` | text | Cost Code, Costcode, Cost Code Number, Phase, Phase Code, Phase/Cost Code | Leistungsposition, Code de coût, 工種, 成本科目 |
| `cost_type` | text | Cost Type, Category, Cost Category, Cost Class, CostType, Type Code | Kostenart, Nature de coût, 原価区分, 成本类型 |
| `invoice_date` | date | Invoice Date, Date, Bill Date, Inv Date | Rechnungsdatum, Date de facture, 請求日, 发票日期 |
| `due_date` | date | Due Date, Due, Pay By | Fälligkeitsdatum, Date d'échéance, 期日, 截止日期 |
| `received_date` | date | Received Date, Date Received, Entered, Entry Date | Eingangsdatum, Date de réception, 受領日, 收到日期 |
| `amount` | amount | Amount, Invoice Amount, Invoice Total, Total, Gross Amount, Bill Amount | Betrag, Montant, 金額, 金额 |
| `retainage` | amount | Retainage, Retainage Withheld, Retention, Retainage Amount | Einbehalt, Retenue de garantie, 保留金, 质保金 |
| `tax` | amount | Tax, Sales Tax, Tax Amount, Use Tax | Steuer, TVA, 消費税, 税额 |
| `commitment` | text | Commitment, PO, PO Number, PO #, Purchase Order, Subcontract | Auftragsnummer NU, N° de commande, 発注番号, 合同编号 |
| `status` | text | Status, Invoice Status, Approval Status, Pay Status | Status, Statut, ステータス, 状态 |
| `paid_date` | date | Paid Date, Payment Date, Date Paid, Check Date | Zahlungsdatum, Date de paiement, 支払日, 付款日期 |
| `paid_amount` | amount | Paid Amount, Amount Paid, Payment Amount, Paid | Bezahlt, Montant payé, 支払額, 已付金额 |
| `check_number` | text | Check Number, Check #, Check No, Payment Number, Payment Ref | Zahlungsnummer, N° de paiement, 支払番号, 付款编号 |
| `description` | text | Description, Memo, Notes, Title | Beschreibung, Description, 摘要, 摘要 |
| `pm_approved` | yes/no | PM Approved, Approved, Approved by PM, Project Manager Approval | PL-Freigabe, Visa conducteur, 所長承認, 项目经理审批 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Sage 300 Construction and Real Estate | AP invoice register exported to Excel or CSV | Vendor, Invoice, Invoice Date, Retainage | no |
| Buildertrend | Bills list, export to Excel | Bill #, Assigned To, Total | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Owner payments by job and month (`owner_payments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project | Projekt, Chantier, 工事番号, 项目编号 |
| `period` | text | Period, Month, Billing Period, Application Period | Zeitraum, Période, 期間, 期间 |
| `received` | yes/no | Received, Paid, Owner Paid, Collected | - |

### Lien waiver log (`waivers`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `vendor` (required) | text | Vendor, Subcontractor, Claimant | Lieferant, Fournisseur, 仕入先, 供应商 |
| `invoice_number` | text | Invoice Number, Invoice, Pay App, Payment Ref | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `waiver_type` | text | Waiver Type, Type, Form | Art der Verzichtserklärung, Type de renonciation, 権利放棄書の種類, 弃权书类型 |
| `received_date` | date | Received Date, Received, Date | Eingangsdatum, Date de réception, 受領日, 收到日期 |

### Subcontractor status (`vendors`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `vendor` (required) | text | Vendor, Subcontractor, Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `coi_expires` | date | COI Expires, Insurance Expires, Certificate Expires, Insurance Expiry | Versicherungsnachweis gültig bis, Attestation valable jusqu'au, 保険証明期限, 保险证明到期 |
| `w9_on_file` | yes/no | W-9 on File, W9 on File, W-9, W9 | Steuerformular vorhanden, Formulaire fiscal reçu, 税務書類受領, 税表已收 |
| `retainage_pct` | number | Retainage %, Retainage Percent, Retainage Rate | Einbehalt %, Retenue de garantie %, 保留率, 质保金比例 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-payment-release inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-payment-release demo
npx -y fairbuild-payment-release mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-payment-release": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-payment-release",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-payment-release -- npx -y fairbuild-payment-release mcp --root .`, or install the `fairbuild-payment-release` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-payment-release approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-payment-release approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-payment-release kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-payment-release tools                 # every tool, its policy and arguments
fairbuild-payment-release sources               # the columns each input is read from
fairbuild-payment-release inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-payment-release call payment_release_check '{"invoices":"<invoices>"}'
fairbuild-payment-release eval                  # the private eval cases on the fictional fixtures
fairbuild-payment-release demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Whether pay-when-paid or a waiver requirement applies is set by your subcontracts and state law; Fairbuild Payment Release applies the rules you turn on.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
