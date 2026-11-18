# Yangtze of Matching (`yangtze-of-matching`)

Three-way match for construction: each AP invoice against its subcontract or PO and the work or delivery the project manager approved. Flags invoices with no commitment, the wrong vendor or job, cumulative billing past the commitment or past the approved work, no receipt or approval, and retainage not withheld. Records one-click payment approvals; paying is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y yangtze-of-matching demo
npx -y yangtze-of-matching mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `invoices` (required) | AP invoices under --root (CSV, Excel or JSON): invoice, vendor, job, the commitment billed against, date, amount, retainage withheld. Sage 300 and Buildertrend layouts are recognised |
| `commitments` (required) | Subcontracts and POs: number, vendor, job, value (revised amount), retainage rate. Procore and Buildertrend layouts are recognised |
| `approvals` | Optional receipts and project manager approvals: commitment, date, amount approved as received or in place to date |
| `settings` | Optional settings JSON (match_settings schema): tolerance, require_approval |

Only `invoices` and `commitments` are required. Each optional file turns on the checks that need it.

## Checks

What `yangtze_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `over_approved` | With this invoice SC-103 is billed 45000; 40000 was approved as received or in place (2026-10-26). |
| `job_mismatch` | Invoice is coded to job 24-102; SC-103 is on job 24-101. |
| `retainage_missing` | SC-103 carries 10% retainage and none was withheld on this invoice. |
| `no_commitment` | Commitment "SC-199" is not in the commitment list. Get the commitment issued or coded before approving. |
| `over_commitment` | With this invoice PO-201 is billed 14400 against its value of 9000. |
| `no_receipt` | No receipt or approval on file for PO-204. Ask the project manager to confirm the work or delivery. |

<!-- generated:start -->

## A demo run

`npx -y yangtze-of-matching demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Yangtze of Matching demo (fictional invoices, commitments and approvals), Auto mode on for drafts

▶ Three-way match eight invoices
  status: executed  decision: allow
  8 invoice(s), 183000: 2 matched (96000), 1 to review (4800), 5 on hold (82200) for no commitment, the wrong vendor, or billing past the commitment or the approved work.
    EE-5501   Example Electric Inc     45000  hold     over_approved
    EE-5502   Example Electric Inc      3000  hold     over_approved, job_mismatch, retainage_missing
    EX-77     Example Glazing LLC       8800  hold     no_commitment
    SL-88120  Sample Lumber Supply     14400  hold     over_commitment, over_approved
    SL-88341  Sample Lumber Supply     11000  hold     over_commitment, over_approved
    SG-55     Sample Glass Co           4800  review   no_receipt
    EC-2210   Example Concrete LLC     56000  matched  
    EC-2231   Example Concrete LLC     40000  matched  

▶ Explain EE-5501
  status: executed  decision: allow
  EE-5501 Example Electric Inc (SC-103, job 24-101) 45000: hold. Commitment value 92000, billed with this 45000, approved to date 40000. With this invoice SC-103 is billed 45000; 40000 was approved as received or in place (2026-10-26).

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 8 invoice(s), 183000: 2 matched (96000), 1 to review (4800), 5 on hold (82200) for no commitment, the wrong vendor, or billing past the commitment or the approved work.

▶ Draft a hold notice (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  notice Sample Lumber Supply drafted with 2 open marker(s) ([TO CONFIRM vendor contact], [TO CONFIRM your name and company]). Nothing was sent.

▶ Approve paying EC-2231 less retainage: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: move_money stays one-click, even in Auto

▶ Agent tries to pay the invoice itself
  status: blocked  decision: block
  reason: Yangtze never pays; accounts payable pays after a recorded approval.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `yangtze_check` | Per invoice in date order: a commitment on file for the same vendor and job, cumulative billing within the commitment value and within the amount approved as received or in place, a receipt or approval on file, and re… | runs |
| `yangtze_explain` | Show one invoice against its commitment and approval with every finding. | runs |
| `yangtze_write_report` | Write the matching worklist as yangtze-match.csv (one row per item, blank decision columns for people to fill in) and yangtze-match.html into out_dir (default fairbuild-out/yangtze). | runs |
| `yangtze_draft_notice` | Write drafts/notice-<vendor>.md: a notice to one vendor listing its invoices on hold and why. | asks first (Auto can be opted in) |
| `yangtze_request_send` | After one named human click (even in Auto), record that the reviewed notice draft is approved in notice-requests.csv. | one named click, even in Auto (`binding_send`) |
| `yangtze_request_approval` | After one named human click (even in Auto), record in payment-approvals.csv that accounts payable may pay one invoice, up to its amount less retainage. | one named click, even in Auto (`move_money`) |
| `ap_pay_invoice` | Yangtze never pays; accounts payable pays after a recorded approval. | refused |
| `invoice_post` | Yangtze never posts or codes invoices in your accounting system. | refused |
| `email_send` | Yangtze never sends the notice; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### AP invoices (`invoices`)

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

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Sage 300 Construction and Real Estate | AP invoice register exported to Excel or CSV | Vendor, Invoice, Invoice Date, Retainage | no |
| Buildertrend | Bills list, export to Excel | Bill #, Assigned To, Total | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Subcontracts and purchase orders (`commitments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `commitment` (required) | text | Commitment, Commitment Number, Number, Contract Number, Subcontract, Subcontract Number | Auftragsnummer NU, N° de commande, 発注番号, 合同编号 |
| `commitment_type` | text | Commitment Type, Type, Contract Type, Doc Type | Vertragsart, Type de contrat, 契約区分, 合同类型 |
| `job` | text | Job, Job Number, Job No, Job #, Job No., Job ID | Projekt, Chantier, 工事番号, 项目编号 |
| `vendor` | text | Vendor, Vendor Name, Subcontractor, Sub, Supplier, Contract Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `cost_code` | text | Cost Code, Costcode, Cost Code Number, Phase, Phase Code, Phase/Cost Code | Leistungsposition, Code de coût, 工種, 成本科目 |
| `cost_type` | text | Cost Type, Category, Cost Category, Cost Class, CostType, Type Code | Kostenart, Nature de coût, 原価区分, 成本类型 |
| `description` | text | Description, Title, Scope, Name | Beschreibung, Description, 摘要, 摘要 |
| `date` | date | Date, Contract Date, PO Date, Issued, Issue Date, Created | Datum, Date, 日付, 日期 |
| `status` | text | Status, Commitment Status, PO Status | Status, Statut, ステータス, 状态 |
| `original_amount` | amount | Original Amount, Original Contract Amount, Original Commitment, Orig Amount, Contract Amount, PO Amount | Ursprüngliche Auftragssumme, Montant initial du marché, 当初契約額, 原合同金额 |
| `approved_changes` | amount | Approved Changes, Approved Change Orders, Approved COs, Change Orders | Genehmigte Nachträge, Avenants validés, 承認済み変更, 已批准变更 |
| `revised_amount` | amount | Revised Amount, Revised Contract Amount, Current Commitment, Revised Commitment, Current Amount, Total Commitment | Aktuelle Auftragssumme, Montant actualisé, 変更後契約額, 调整后合同金额 |
| `invoiced` | amount | Invoiced, Invoiced to Date, Billed to Date, Billed, Invoiced Amount, Received to Date | Abgerechnet, Facturé, 請求済, 已开票 |
| `paid` | amount | Paid, Paid to Date, Payments Issued, Payments, Amount Paid | Bezahlt, Payé, 支払済, 已付款 |
| `retainage_held` | amount | Retainage Held, Retainage, Retention Held, Retainage Withheld | Einbehalt, Retenue de garantie, 保留金, 质保金 |
| `retainage_pct` | number | Retainage %, Retainage Percent, Retention % | Einbehalt %, Retenue de garantie %, 保留率, 质保金比例 |
| `executed` | yes/no | Executed, Signed, Fully Executed, Contract Signed | Unterschrieben, Signé, 契約締結, 已签订 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Procore | Commitments tool, export to CSV (subcontracts and purchase orders) | Number, Contract Company, Original Contract Amount | no |
| Buildertrend | Purchase Orders list, export to Excel | PO #, Assigned To, Total | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Receipts and approvals (`approvals`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `commitment` (required) | text | Commitment, PO, PO Number, Subcontract, Contract Number | Auftragsnummer NU, N° de commande, 発注番号, 合同编号 |
| `date` | date | Date, Approved Date, Receipt Date, Received Date, Period | Datum, Date, 日付, 日期 |
| `approved_to_date` | amount | Approved to Date, Approved Amount, Received Value, Work in Place, Received to Date, Approved | - |
| `approved_by` | text | Approved By, Approver, Received By | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx yangtze-of-matching inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y yangtze-of-matching demo
npx -y yangtze-of-matching mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "yangtze-of-matching": {
      "command": "npx",
      "args": [
        "-y",
        "yangtze-of-matching",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add yangtze-of-matching -- npx -y yangtze-of-matching mcp --root .`, or install the `yangtze-of-matching` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `yangtze-of-matching approve <id> --as "Your Name"` (or on the local approvals page, `yangtze-of-matching approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`yangtze-of-matching kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
yangtze-of-matching tools                 # every tool, its policy and arguments
yangtze-of-matching sources               # the columns each input is read from
yangtze-of-matching inspect <file>        # how a file would be read (names and shapes, never values)
yangtze-of-matching call yangtze_check '{"invoices":"<invoices>","commitments":"<commitments>"}'
yangtze-of-matching eval                  # the private eval cases on the fictional fixtures
yangtze-of-matching demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
