# Fairbuild Service Tickets (`fairbuild-service-tickets`)

Checks service and trade tickets with technician timesheets: utilisation per technician from working against paid hours, revenue per paid hour, recall rate, completed tickets not invoiced and zero-dollar tickets. ServiceTitan layouts are recognised; technician names are masked in what the model sees. Drafts billing follow-ups; invoicing is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-service-tickets demo
npx -y fairbuild-service-tickets mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `tickets` (required) | Service tickets under --root (CSV, Excel or JSON): ticket, technician, date, business unit, job type, status, invoice total, invoice number, recall of, warranty. ServiceTitan job report exports are recognised |
| `timesheets` | Optional technician timesheets: technician, date, timesheet code, hours. ServiceTitan timesheet exports are recognised |
| `settings` | Optional settings JSON (service_settings schema): working_codes, utilisation_target, recall_pct |

Only `tickets` is required. Each optional file turns on the checks that need it.

## What it refuses, and what waits for a person

Refused in every mode (the tool is listed so an assistant can see it, and every call is blocked):

- `invoice_create`: Fairbuild Service Tickets never creates or sends a customer invoice.
- `payroll_run`: Fairbuild Service Tickets never runs payroll or changes technician pay.
- `email_send`: Fairbuild Service Tickets never sends the follow-up; a person sends the approved draft.

Waits for one named person's click, even in Auto mode (nothing is sent, paid or posted by the agent; the click is recorded for the person who acts):

- `service_request_send`: Approve the followup (one click)

## Checks

What `service_check` flags, each with the first example it finds in the fictional fixtures (the eval cases for `service_check`):

| Code | Example from the fixtures |
|---|---|
| `zero_invoice` | Completed 2026-11-11 with a zero total and not marked recall or warranty. Was the work billed? |
| `completed_not_invoiced` | Completed 2026-11-10 for 620 with no invoice number. |
| `low_utilisation` | 18 working hour(s) of 40 paid: 45% utilisation, below 60%. |
| `high_recall_rate` | 1 recall(s) on 3 completed ticket(s): 33.3%, above 10%. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-service-tickets demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Service Tickets demo (fictional technicians and tickets; names are masked in results), Auto mode on for drafts

▶ Check a week of service tickets and timesheets
  status: executed  decision: allow
  7 completed ticket(s) by 3 technician(s), 4039 invoiced or due: 2 ticket(s) not billed or billed at zero (620 unbilled). Utilisation 61.7%; 1 technician(s) below target or with a high recall rate.
    ticket     ST-9003               0 util        unbilled zero_invoice
    ticket     ST-9005             620 util        unbilled completed_not_invoiced
    technician PERSON-97e19f75     970 util    45  review   low_utilisation, high_recall_rate
    technician PERSON-a0a4f6eb     669 util    65  ok       
    technician PERSON-8632789b    2400 util    75  ok       

▶ Explain ticket ST-9005
  status: executed  decision: allow
  Ticket ST-9005 (PERSON-97e19f75, Repair) 2026-11-10: unbilled, 620. Completed 2026-11-10 for 620 with no invoice number.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 7 completed ticket(s) by 3 technician(s), 4039 invoiced or due: 2 ticket(s) not billed or billed at zero (620 unbilled). Utilisation 61.7%; 1 technician(s) below target or with a high recall rate.

▶ Draft the billing follow-up (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  followup week of 2026-11-09 drafted for 620 with 2 open marker(s) ([TO CONFIRM billing office], [TO CONFIRM your name]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to invoice the customer itself
  status: blocked  decision: block
  reason: Fairbuild Service Tickets never creates or sends a customer invoice.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `service_check` | Per ticket: completed with no invoice, or completed at zero and not marked recall or warranty. | runs |
| `service_explain` | Show one ticket or technician with every finding. | runs |
| `service_write_report` | Write the service worklist as service-tickets.csv (one row per item, blank decision columns for people to fill in) and service-tickets.html into out_dir (default fairbuild-out/service-tickets). | runs |
| `service_draft_followup` | Write drafts/followup-<label>.md: the tickets to invoice or explain, for the billing office. | asks first (Auto can be opted in) |
| `service_request_send` | After one named human click (even in Auto), record that the reviewed followup draft is approved in followup-requests.csv. | one named click, even in Auto (`binding_send`) |
| `invoice_create` | Fairbuild Service Tickets never creates or sends a customer invoice. | refused |
| `payroll_run` | Fairbuild Service Tickets never runs payroll or changes technician pay. | refused |
| `email_send` | Fairbuild Service Tickets never sends the follow-up; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Service tickets (`tickets`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `ticket` (required) | text | Ticket, Job #, Job Number, Work Order, Ticket Number, Call Number | Lieferschein, Bon de livraison, 納品書番号, 送货单号 |
| `technician` | text | Technician, Tech, Assigned Technician, Primary Technician | Techniker, Technicien, 技術者, 技术员 |
| `date` | date | Date, Completed Date, Completion Date, Scheduled Date | Datum, Date, 日付, 日期 |
| `business_unit` | text | Business Unit, Department, Division | - |
| `job_type` | text | Job Type, Type, Call Type | - |
| `status` | text | Status, Job Status | Status, Statut, ステータス, 状态 |
| `invoice_total` | amount | Invoice Total, Total, Jobs Total, Revenue, Amount | - |
| `invoice_number` | text | Invoice Number, Invoice, Invoice # | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `recall_of` | text | Recall Of, Recall For, Original Job, Callback Of | - |
| `is_recall` | yes/no | Recall, Is Recall, Callback | - |
| `warranty` | yes/no | Warranty, Is Warranty, Warranty Job | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| ServiceTitan | Jobs report exported to Excel | Job #, Business Unit, Job Type, Technician | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Technician timesheets (`timesheets`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `technician` (required) | text | Technician, Tech, Employee | Techniker, Technicien, 技術者, 技术员 |
| `date` | date | Date, Work Date | Datum, Date, 日付, 日期 |
| `code` | text | Code, Timesheet Code, Activity, Time Type | - |
| `hours` | number | Hours, Duration, Paid Hours | Stunden, Heures, 時間, 工时 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| ServiceTitan | Technician timesheet report exported to Excel | Technician, Timesheet Code, Hours | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-service-tickets inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-service-tickets demo
npx -y fairbuild-service-tickets mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-service-tickets": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-service-tickets",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-service-tickets -- npx -y fairbuild-service-tickets mcp --root .`, or install the `fairbuild-service-tickets` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-service-tickets approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-service-tickets approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-service-tickets kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-service-tickets tools                 # every tool, its policy and arguments
fairbuild-service-tickets sources               # the columns each input is read from
fairbuild-service-tickets inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-service-tickets call service_check '{"tickets":"<tickets>"}'
fairbuild-service-tickets eval                  # the private eval cases on the fictional fixtures
fairbuild-service-tickets demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Utilisation depends on which timesheet codes you count as working; the codes used are listed in the result.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
- Results returned to the AI model have worker names, worker ids, Social Security numbers and homeowner contact details masked. The files written here keep the real values: keep them in a secure folder.
