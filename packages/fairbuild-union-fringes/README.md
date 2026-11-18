# Fairbuild Union Fringes (`fairbuild-union-fringes`)

Reconciles union fringe benefit remittances by local, fund and month against payroll hours and the contribution rates you supply: funds paid short or not at all, paid over, paid late, hours reported that differ from payroll and hours for a local with no rates. Drafts fund letters and records one-click approvals to pay a shortfall. Paying a fund is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-union-fringes demo
npx -y fairbuild-union-fringes mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `hours` (required) | Union hours from payroll under --root (CSV, Excel or JSON): local, worker, month (YYYY-MM or any date in the month), hours |
| `rates` (required) | Contribution rates per hour by local and fund |
| `remittances` (required) | Remittances sent: local, fund, month, hours reported, amount, date remitted |
| `settings` | Optional settings JSON (fringe_settings schema): due_day, tolerance |

Only `hours` and `rates` and `remittances` are required. Each optional file turns on the checks that need it.

## Checks

What `fringes_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `under_remitted` | Remitted 3000; 500 hours at 6.25 is 3125. |
| `hours_mismatch` | The remittance reports 480 hours; payroll shows 500. |
| `not_remitted` | Nothing remitted to Training for 2026-10: 500 hours at 0.75 is 375, due 2026-11-15. |
| `late` | Remitted 2026-11-18, after the due date 2026-11-15. Check the agreement for liquidated damages or interest. |
| `over_remitted` | Remitted 1600; 310 hours at 5 is 1550. Ask the fund for a credit or apply it to next month. |
| `no_rate` | 80 hour(s) for Local 300 in 2026-10 and no fund rates for this local. Add its rates to check the remittance. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-union-fringes demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Union Fringes demo (fictional locals, funds and hours), Auto mode on for drafts

▶ Reconcile October fringe remittances
  status: executed  decision: allow
  6 fund-month(s) for 3 local(s): 12311 due, 11861 remitted. 2 short by 500 in total, 50 over, 3 to review.
    Local 100 Pension 2026-10            due    3125 remitted    3000  short   under_remitted, hours_mismatch
    Local 100 Training 2026-10           due     375 remitted       0  short   not_remitted
    Local 200 Health and Welfare 2026-10 due    2511 remitted    2511  review  late
    Local 200 Pension 2026-10            due    1550 remitted    1600  review  over_remitted
    Local 300 2026-10                    due         remitted       0  review  no_rate
    Local 100 Health and Welfare 2026-10 due    4750 remitted    4750  ok      

▶ Explain the Local 100 Pension month
  status: executed  decision: allow
  Local 100 Pension 2026-10: short. 500 hours by 3 worker(s) at 6.25 = 3125 due 2026-11-15; remitted 3000 on 2026-11-12. Remitted 3000; 500 hours at 6.25 is 3125. The remittance reports 480 hours; payroll shows 500.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 6 fund-month(s) for 3 local(s): 12311 due, 11861 remitted. 2 short by 500 in total, 50 over, 3 to review.

▶ Draft a letter to the Local 100 funds (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  letter Local 100 drafted with 3 open marker(s) ([TO CONFIRM fund administrator], [TO CONFIRM your name and company], [TO CONFIRM how the difference will be settled: a corrected report, a payment, or a credit]). Nothing was sent.

▶ Approve paying the Training shortfall: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: move_money stays one-click, even in Auto

▶ Agent tries to pay the fund itself
  status: blocked  decision: block
  reason: Fairbuild Union Fringes never pays a fund; accounts payable pays after a recorded approval.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `fringes_check` | Per local, fund and month: payroll hours times the contribution rate against what was remitted; short, not remitted after the due date, over, late, hours reported that differ from payroll, and hours for a local with n… | runs |
| `fringes_explain` | Show one fund-month's hours, rate, due, remitted and every finding. | runs |
| `fringes_write_report` | Write the remittance worklist as union-fringes.csv (one row per item, blank decision columns for people to fill in) and union-fringes.html into out_dir (default fairbuild-out/union-fringes). | runs |
| `fringes_draft_letter` | Write drafts/letter-<local>.md: a letter to one local's fund administrator listing each fund-month that is short, over, late or reported with the wrong hours. | asks first (Auto can be opted in) |
| `fringes_request_send` | After one named human click (even in Auto), record that the reviewed letter draft is approved in letter-requests.csv. | one named click, even in Auto (`binding_send`) |
| `fringes_request_payment` | After one named human click (even in Auto), record in fringe-payment-approvals.csv that accounts payable may pay a fund the shortfall Fairbuild Union Fringes found for one fund-month, up to that shortfall. | one named click, even in Auto (`move_money`) |
| `fund_portal_submit` | Fairbuild Union Fringes never logs in to or files with a fund portal. | refused |
| `ach_pay` | Fairbuild Union Fringes never pays a fund; accounts payable pays after a recorded approval. | refused |
| `email_send` | Fairbuild Union Fringes never sends the letter; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Union hours from payroll (`hours`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `union` (required) | text | Union, Local, Union Local, Local Union | Gewerkschaft, Syndicat, 労働組合, 工会 |
| `worker` | text | Worker, Employee, Employee Name, Name | Mitarbeiter, Salarié, 作業員, 工人 |
| `worker_id` | text | Worker ID, Employee ID, Employee Number | Personalnummer, Matricule, 社員番号, 工号 |
| `month` | text | Month, Work Month, Period, Pay Period, Date, Week Ending | Monat, Mois, 対象月, 月份 |
| `hours` | number | Hours, Hours Worked, Total Hours, Reportable Hours | Stunden, Heures, 時間, 工时 |

### Fund contribution rates (`rates`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `union` (required) | text | Union, Local, Union Local | Gewerkschaft, Syndicat, 労働組合, 工会 |
| `union_fund` (required) | text | Fund, Fund Name, Benefit, Benefit Fund | Kasse, Caisse, 基金, 基金 |
| `rate` | amount | Rate, Rate per Hour, Contribution Rate, Hourly Rate | Stundenlohn, Taux, 単価, 单价 |

### Remittances sent (`remittances`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `union` (required) | text | Union, Local, Union Local | Gewerkschaft, Syndicat, 労働組合, 工会 |
| `union_fund` | text | Fund, Fund Name, Benefit | Kasse, Caisse, 基金, 基金 |
| `month` | text | Month, Work Month, Period, Contribution Month | Monat, Mois, 対象月, 月份 |
| `hours_reported` | number | Hours Reported, Hours, Reported Hours | Gemeldete Stunden, Heures déclarées, 申告時間, 申报工时 |
| `amount` | amount | Amount, Amount Remitted, Remitted, Contribution, Paid | Betrag, Montant, 金額, 金额 |
| `remitted_date` | date | Remitted Date, Date Paid, Paid Date, Date Remitted, Payment Date | Überwiesen am, Versé le, 納付日, 缴款日期 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-union-fringes inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-union-fringes demo
npx -y fairbuild-union-fringes mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-union-fringes": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-union-fringes",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-union-fringes -- npx -y fairbuild-union-fringes mcp --root .`, or install the `fairbuild-union-fringes` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-union-fringes approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-union-fringes approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-union-fringes kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-union-fringes tools                 # every tool, its policy and arguments
fairbuild-union-fringes sources               # the columns each input is read from
fairbuild-union-fringes inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-union-fringes call fringes_check '{"hours":"<hours>","rates":"<rates>","remittances":"<remittances>"}'
fairbuild-union-fringes eval                  # the private eval cases on the fictional fixtures
fairbuild-union-fringes demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Rates, due dates and late charges come from your collective bargaining agreements; Fairbuild Union Fringes uses only the rates and due day you supply.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
