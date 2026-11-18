# Fairbuild Commitments (`fairbuild-commitments`)

Checks subcontracts and purchase orders against AP invoices and payments: committed cost still open, commitments billed or paid past their value, billing on unsigned subcontracts, retainage held at the wrong rate, closed commitments with a balance, stale open POs and invoices that name no commitment. Drafts vendor letters. Closing or changing a commitment is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-commitments demo
npx -y fairbuild-commitments mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `commitments` (required) | Subcontracts and purchase orders under --root (CSV, Excel or JSON): number, job, vendor, original amount, approved changes, revised amount, invoiced, paid, retainage, status, executed. Procore and Buildertrend layouts are recognised |
| `invoices` | Optional AP invoice register with the commitment each invoice is billed against. When given, invoiced to date comes from it and is tied to the commitment report |
| `settings` | Optional settings JSON (commitment_settings schema): stale_days, tolerance, retainage_check |

Only `commitments` is required. Each optional file turns on the checks that need it.

## Checks

What `commitments_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `over_invoiced` | Invoiced 25400 is more than the commitment's value 9000 by 16400. Look for an unissued change order or a bill coded to the wrong commitment. |
| `paid_over_invoiced` | Paid 10000 is more than invoiced 9000 by 1000. |
| `invoiced_does_not_tie` | AP invoices against SC-105 add up to 9000 (2); the commitment report shows 6000 invoiced. |
| `unknown_commitment` | Invoice(s) EX-77 from Example Glazing LLC (8800) name commitment "SC-199", which is not in the commitment list. |
| `not_executed` | 18000 has been invoiced against SC-102, which is not marked executed. Get the signed subcontract or PO before paying more. |
| `revised_math` | Original 85000 plus approved changes 5000 is 90000; the commitment says 92000. |
| `stale_open` | 4000 is still open on PO-202 with no invoice for 220 days (since 2026-04-10). Ask the vendor whether more is coming or close it. |
| `closed_with_balance` | PO-203 is closed with 2500 not invoiced. If the work is finished, reduce the commitment so committed cost is not overstated. |
| `retainage_off` | Retainage held is 13500; 10% of 150000 invoiced is 15000. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-commitments demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Commitments demo (fictional jobs, vendors and commitments), Auto mode on for drafts

▶ Check eight subcontracts and POs against the AP invoices
  status: executed  decision: allow
  8 commitment(s): 208500 still open of 558500 committed. 2 billed or paid past their value (16400 over-invoiced, 1000 overpaid), 5 to review, 1 invoice group(s) naming no commitment (8800).
    PO-201  Sample Lumber Supply       9000    25400  over      over_invoiced
    SC-105  Sample Painting Co        30000     9000  over      paid_over_invoiced, invoiced_does_not_tie
    SC-199  Example Glazing LLC           0     8800  unmatched unknown_commitment
    SC-102  Test Drywall Co           64000    18000  review    not_executed
    SC-103  Example Electric Inc      92000    45000  review    revised_math
    PO-202  Sample Rebar Co           15000    11000  review    stale_open
    PO-203  Sample Sheet Metal        12000     9500  review    closed_with_balance
    SC-104  Example Roofing LLC      205000   150000  review    retainage_off
    SC-101  Example Concrete LLC     131500    96000  ok        

▶ Explain the lumber PO
  status: executed  decision: allow
  PO-201 Sample Lumber Supply (job 24-101): over. Value 9000, invoiced 25400, paid 25400, open 0. Invoiced 25400 is more than the commitment's value 9000 by 16400. Look for an unissued change order or a bill coded to the wrong commitment.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 8 commitment(s): 208500 still open of 558500 committed. 2 billed or paid past their value (16400 over-invoiced, 1000 overpaid), 5 to review, 1 invoice group(s) naming no commitment (8800).

▶ Draft a letter to Sample Lumber Supply (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  letter Sample Lumber Supply drafted with 1 open marker(s) ([TO CONFIRM vendor contact]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to close the PO itself
  status: blocked  decision: block
  reason: Fairbuild Commitments never closes or reduces a commitment in your accounting system; a person does after the vendor confirms.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `commitments_check` | Per subcontract and PO: value (original plus approved changes), invoiced, paid and still open; billed or paid past its value; billing on an unsigned commitment; retainage held at the wrong rate; closed with a balance;… | runs |
| `commitments_explain` | Show one commitment's value, invoiced, paid, open balance and every finding. | runs |
| `commitments_write_report` | Write the commitments worklist as commitments.csv (one row per item, blank decision columns for people to fill in) and commitments.html into out_dir (default fairbuild-out/commitments). | runs |
| `commitments_draft_letter` | Write drafts/letter-<vendor>.md: one letter to one vendor listing its commitments that need an answer (a credit or change order for over-billing, the signed subcontract, a final invoice for a stale PO). | asks first (Auto can be opted in) |
| `commitments_request_send` | After one named human click (even in Auto), record that the reviewed letter draft is approved in letter-requests.csv. | one named click, even in Auto (`binding_send`) |
| `po_close` | Fairbuild Commitments never closes or reduces a commitment in your accounting system; a person does after the vendor confirms. | refused |
| `po_change` | Fairbuild Commitments never issues or changes a subcontract, PO or change order. | refused |
| `ap_pay_invoice` | Fairbuild Commitments never pays vendors. | refused |
| `email_send` | Fairbuild Commitments never sends letters; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

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

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-commitments inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-commitments demo
npx -y fairbuild-commitments mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-commitments": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-commitments",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-commitments -- npx -y fairbuild-commitments mcp --root .`, or install the `fairbuild-commitments` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-commitments approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-commitments approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-commitments kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-commitments tools                 # every tool, its policy and arguments
fairbuild-commitments sources               # the columns each input is read from
fairbuild-commitments inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-commitments call commitments_check '{"commitments":"<commitments>"}'
fairbuild-commitments eval                  # the private eval cases on the fictional fixtures
fairbuild-commitments demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
