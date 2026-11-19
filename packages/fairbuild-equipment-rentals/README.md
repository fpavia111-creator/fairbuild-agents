# Fairbuild Equipment Rentals (`fairbuild-equipment-rentals`)

Checks equipment rental invoices against the day, week and month rates, the off-rent date and the hours the machine was used: billed above the cheapest rate combination, billed after it was called off, the same days billed twice, idle rentals and rentals with no job. Drafts credit requests. Calling a rental off and paying are a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-equipment-rentals demo
npx -y fairbuild-equipment-rentals mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `rentals` (required) | Equipment rental invoices under --root (CSV, Excel or JSON): equipment, vendor, job, invoice, billing period, off-rent date, amount, and the day, week and month rates |
| `usage` | Optional equipment usage log (equipment, date, job, hours) from daily reports or telematics, to catch idle rentals and rentals with no job |
| `settings` | Optional settings JSON (equipment_settings schema): idle_hours_per_week, tolerance |

Only `rentals` is required. Each optional file turns on the checks that need it.

## What it refuses, and what waits for a person

Refused in every mode (the tool is listed so an assistant can see it, and every call is blocked):

- `rental_call_off`: Fairbuild Equipment Rentals never calls a rental off with the vendor; a person does.
- `ap_pay_invoice`: Fairbuild Equipment Rentals never pays rental invoices.
- `email_send`: Fairbuild Equipment Rentals never sends the credit request; a person sends the approved draft.

Waits for one named person's click, even in Auto mode (nothing is sent, paid or posted by the agent; the click is recorded for the person who acts):

- `rentals_request_send`: Approve the credit (one click)

## Checks

What `rentals_check` flags, each with the first example it finds in the fictional fixtures (the eval cases for `rentals_check`):

| Code | Example from the fixtures |
|---|---|
| `rate_over` | 28 day(s) billed 6400; the cheapest of the day, week and month rates (450 / 1600 / 4800) is 4800. |
| `billed_after_off_rent` | Called off 2026-11-01 but billed through 2026-11-11: 10 day(s) after off-rent. 18 billable day(s) cost at most 1050. |
| `idle` | 13 hour(s) logged over 18 day(s) on rent (5.06 a week, below 8). Call it off or move it to a job that needs it. |
| `overlap` | 5 day(s) from 2026-11-10 were already billed on invoice RI-9004 (through 2026-11-14). |
| `no_job` | Invoice RI-9006 has no job; the usage log puts this machine on 24-101. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-equipment-rentals demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Equipment Rentals demo (fictional rentals and usage), Auto mode on for drafts

▶ Check six rental invoices against rates, off-rent dates and usage
  status: executed  decision: allow
  6 rental invoice(s), 10200 billed: 3 overbilled by 2300 in total, 2 to review (2000 on idle rentals).
    RI-9001 EQ-R100 Excavator 20t        6400 fair   4800  overbilled rate_over
    RI-9002 EQ-R101 Scissor lift 26ft    1400 fair   1050  overbilled billed_after_off_rent, idle
    RI-9005 EQ-R103 Plate compactor       700 fair    700  overbilled overlap
    RI-9003 EQ-R102 Light tower           600 fair    600  review     idle
    RI-9006 EQ-R104 Skid steer            400 fair    400  review     no_job
    RI-9004 EQ-R103 Plate compactor       700 fair    700  ok         

▶ Explain the scissor lift invoice
  status: executed  decision: allow
  RI-9002 EQ-R101 Scissor lift 26ft (Example Lift Rentals, job 24-101): overbilled. 28 day(s) 2026-10-15 to 2026-11-11, off rent 2026-11-01; billed 1400, fair 1050, 13 hour(s) used. Called off 2026-11-01 but billed through 2026-11-11: 10 day(s) after off-rent. 18 billable day(s) cost at most 1050. 13 hour(s) logged over 18 day(s) on rent (5.06 a week, below 8). Call it off or move it to a job that needs it.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 6 rental invoice(s), 10200 billed: 3 overbilled by 2300 in total, 2 to review (2000 on idle rentals).

▶ Draft a credit request to Example Lift Rentals (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  credit Example Lift Rentals drafted for 700 with 3 open marker(s) ([TO CONFIRM vendor billing contact], [TO CONFIRM your name and company], [ATTACH call-off numbers]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to call the rental off itself
  status: blocked  decision: block
  reason: Fairbuild Equipment Rentals never calls a rental off with the vendor; a person does.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `rentals_check` | Per rental invoice: billed above the cheapest day, week and month combination, billed after the off-rent date, days already billed on another invoice for the same machine, no job on the invoice, and hours used per wee… | runs |
| `rentals_explain` | Show one rental invoice's period, rates, usage and every finding. | runs |
| `rentals_write_report` | Write the rental worklist as equipment-rentals.csv (one row per item, blank decision columns for people to fill in) and equipment-rentals.html into out_dir (default fairbuild-out/equipment-rentals). | runs |
| `rentals_draft_credit` | Write drafts/credit-<vendor>.md: a credit request to one rental vendor for every overbilled invoice, with [ATTACH] for off-rent confirmations. | asks first (Auto can be opted in) |
| `rentals_request_send` | After one named human click (even in Auto), record that the reviewed credit draft is approved in credit-requests.csv. | one named click, even in Auto (`binding_send`) |
| `rental_call_off` | Fairbuild Equipment Rentals never calls a rental off with the vendor; a person does. | refused |
| `ap_pay_invoice` | Fairbuild Equipment Rentals never pays rental invoices. | refused |
| `email_send` | Fairbuild Equipment Rentals never sends the credit request; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Equipment rental invoices (`rentals`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `equipment_id` (required) | text | Equipment ID, Equipment, Unit, Unit Number, Asset, Asset ID | Gerät, Engin, 機械, 设备 |
| `description` | text | Description, Equipment Description, Item, Class | Beschreibung, Description, 摘要, 摘要 |
| `vendor` | text | Vendor, Rental Company, Supplier | Lieferant, Fournisseur, 仕入先, 供应商 |
| `job` | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `invoice_number` | text | Invoice Number, Invoice, Invoice No, Contract | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `period_from` | date | Period From, Billed From, From, Start, Bill Start | - |
| `period_to` | date | Period To, Billed To, To, End, Bill End | Leistungszeitraum bis, Période au, 対象期間末, 截止日期 |
| `off_rent_date` | date | Off Rent Date, Off Rent, Called Off, Return Date, Off-Rent | Mietende, Fin de location, 返却日, 退场日期 |
| `amount` | amount | Amount, Rental Amount, Total, Billed | Betrag, Montant, 金額, 金额 |
| `day_rate` | amount | Day Rate, Daily Rate, Daily | Tagesmiete, Tarif journalier, 日額, 日租金 |
| `week_rate` | amount | Week Rate, Weekly Rate, Weekly | - |
| `month_rate` | amount | Month Rate, Monthly Rate, 4 Week Rate, Monthly | - |

### Equipment usage log (`usage`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `equipment_id` (required) | text | Equipment ID, Equipment, Unit, Asset, Asset ID | Gerät, Engin, 機械, 设备 |
| `date` | date | Date, Work Date, Log Date | Datum, Date, 日付, 日期 |
| `job` | text | Job, Job Number, Project | Projekt, Chantier, 工事番号, 项目编号 |
| `hours` | number | Hours, Hours Used, Run Hours, Engine Hours, Meter Hours | Stunden, Heures, 時間, 工时 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-equipment-rentals inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-equipment-rentals demo
npx -y fairbuild-equipment-rentals mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-equipment-rentals": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-equipment-rentals",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-equipment-rentals -- npx -y fairbuild-equipment-rentals mcp --root .`, or install the `fairbuild-equipment-rentals` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-equipment-rentals approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-equipment-rentals approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-equipment-rentals kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-equipment-rentals tools                 # every tool, its policy and arguments
fairbuild-equipment-rentals sources               # the columns each input is read from
fairbuild-equipment-rentals inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-equipment-rentals call rentals_check '{"rentals":"<rentals>"}'
fairbuild-equipment-rentals eval                  # the private eval cases on the fictional fixtures
fairbuild-equipment-rentals demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Rate tiers follow the common rule that a rental is billed at the cheapest combination of its rates; your rental agreement may differ (minimum charges, damage waiver, fuel, delivery).
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
