# Fairbuild Job Cash Flow (`fairbuild-job-cash-flow`)

Measures cash flow by job from receipts and disbursements: the net cash position per job, jobs where you have paid out more than you collected, owner invoices unpaid past your collection days, and jobs negative two months running, with net cash by month. Drafts collection letters. Moving money is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-job-cash-flow demo
npx -y fairbuild-job-cash-flow mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `receipts` (required) | Cash received by job under --root (CSV, Excel or JSON): job, date, amount, payer |
| `disbursements` (required) | Cash paid out by job: job, date, amount, payee |
| `billings` | Optional owner invoices: job, invoice, date, amount, received yes or no, to age what is unpaid |
| `settings` | Optional settings JSON (cash_settings schema): collect_days, negative_months |

Only `receipts` and `disbursements` are required. Each optional file turns on the checks that need it.

## Checks

What `cash_flow_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `cash_negative` | Paid out 150000 and collected 100000: the job is 50000 cash negative, with 42500 billed and unpaid for more than 60 days. |
| `slow_collection` | AR-2003 (42500, 88 days) unpaid past 60 days. |
| `negative_trend` | Net cash was negative in each of the last 2 months (2026-10 -35000, 2026-11 -30000). |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-job-cash-flow demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Job Cash Flow demo (fictional jobs and cash), Auto mode on for drafts

▶ Measure cash by job
  status: executed  decision: allow
  3 job(s): 480000 collected, 526900 paid out, net -46900. 2 job(s) cash negative, 42500 billed and unpaid past 60 days, 0 other job(s) to review.
    24-102  in  100000  out  150000  net  -50000  negative cash_negative, slow_collection, negative_trend
    24-103  in  135000  out  160500  net  -25500  negative cash_negative
    24-101  in  245000  out  216400  net   28600  ok       

▶ Explain job 24-102
  status: executed  decision: allow
  24-102: negative. Collected 100000, paid out 150000, net -50000; unpaid billed 42500. By month: 2026-09 15000, 2026-10 -35000, 2026-11 -30000. Paid out 150000 and collected 100000: the job is 50000 cash negative, with 42500 billed and unpaid for more than 60 days. AR-2003 (42500, 88 days) unpaid past 60 days. Net cash was negative in each of the last 2 months (2026-10 -35000, 2026-11 -30000).

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 3 job(s): 480000 collected, 526900 paid out, net -46900. 2 job(s) cash negative, 42500 billed and unpaid past 60 days, 0 other job(s) to review.

▶ Draft a collection letter (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  collection 24-102 drafted for 42500 with 3 open marker(s) ([TO CONFIRM owner accounts payable], [TO CONFIRM your name and company], [ATTACH invoices and approved pay applications]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to move money itself
  status: blocked  decision: block
  reason: Fairbuild Job Cash Flow never moves money between accounts or jobs.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `cash_flow_check` | Per job: cash collected, cash paid out and the net position; jobs cash negative; owner invoices unpaid past your collection days; months in a row with negative net cash. | runs |
| `cash_flow_explain` | Show one job's cash in, cash out, months and every finding. | runs |
| `cash_flow_write_report` | Write the cash flow worklist as job-cash-flow.csv (one row per item, blank decision columns for people to fill in) and job-cash-flow.html into out_dir (default fairbuild-out/job-cash-flow). | runs |
| `cash_flow_draft_collection` | Write drafts/collection-<job>.md: a payment request to the owner of one job listing its invoices unpaid past your collection days. | asks first (Auto can be opted in) |
| `cash_flow_request_send` | After one named human click (even in Auto), record that the reviewed collection draft is approved in collection-requests.csv. | one named click, even in Auto (`binding_send`) |
| `bank_transfer` | Fairbuild Job Cash Flow never moves money between accounts or jobs. | refused |
| `ap_hold_payments` | Fairbuild Job Cash Flow never holds or releases payments in your accounting system. | refused |
| `email_send` | Fairbuild Job Cash Flow never sends the collection letter; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Cash received by job (`receipts`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `date` | date | Date, Deposit Date, Check Date, Payment Date, Cleared | Datum, Date, 日付, 日期 |
| `amount` | amount | Amount, Deposit, Payment, Check Amount, Total | Betrag, Montant, 金額, 金额 |
| `party` | text | Vendor, Payee, Customer, Payer, Owner, Name | - |

### Cash paid out by job (`disbursements`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `date` | date | Date, Deposit Date, Check Date, Payment Date, Cleared | Datum, Date, 日付, 日期 |
| `amount` | amount | Amount, Deposit, Payment, Check Amount, Total | Betrag, Montant, 金額, 金额 |
| `party` | text | Vendor, Payee, Customer, Payer, Owner, Name | - |

### Owner invoices (`billings`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `invoice` | text | Invoice, Invoice Number, Pay App, Application | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `invoice_date` | date | Invoice Date, Date, Billed Date | Rechnungsdatum, Date de facture, 請求日, 发票日期 |
| `amount` | amount | Amount, Invoice Amount, Net Due, Amount Due | Betrag, Montant, 金額, 金额 |
| `received` | yes/no | Received, Paid, Collected | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-job-cash-flow inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-job-cash-flow demo
npx -y fairbuild-job-cash-flow mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-job-cash-flow": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-job-cash-flow",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-job-cash-flow -- npx -y fairbuild-job-cash-flow mcp --root .`, or install the `fairbuild-job-cash-flow` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-job-cash-flow approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-job-cash-flow approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-job-cash-flow kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-job-cash-flow tools                 # every tool, its policy and arguments
fairbuild-job-cash-flow sources               # the columns each input is read from
fairbuild-job-cash-flow inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-job-cash-flow call cash_flow_check '{"receipts":"<receipts>","disbursements":"<disbursements>"}'
fairbuild-job-cash-flow eval                  # the private eval cases on the fictional fixtures
fairbuild-job-cash-flow demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Cash is matched to jobs by the job column of your receipts and disbursements; overhead and unassigned cash are not shown.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
