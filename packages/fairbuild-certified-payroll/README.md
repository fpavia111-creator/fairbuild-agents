# Fairbuild Certified Payroll (`fairbuild-certified-payroll`)

Checks certified payroll lines against the wage rates of the job's determination: cash plus fringe below the rate for the classification, overtime not paid as overtime, classifications with no rate, missing worker ids, full Social Security numbers on the report and lines entered twice. Worker names and ids are masked in what the model sees. Drafts payroll corrections; submitting payroll and paying is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-certified-payroll demo
npx -y fairbuild-certified-payroll mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `payroll` (required) | Certified payroll lines under --root (CSV, Excel or JSON): job, week ending, worker, worker id or last four of SSN, classification, straight and overtime hours, rate paid, fringe paid per hour. A WH-347-style column layout is recognised |
| `rates` (required) | Wage determination rates for the job: classification, base rate, fringe rate |
| `settings` | Optional settings JSON (wage_settings schema): ot_multiplier, weekly_ot_after, classification_aliases, tolerance |

Only `payroll` and `rates` are required. Each optional file turns on the checks that need it.

## What it refuses, and what waits for a person

Refused in every mode (the tool is listed so an assistant can see it, and every call is blocked):

- `payroll_submit`: Fairbuild Certified Payroll never signs or submits a certified payroll to an agency or owner.
- `payroll_run`: Fairbuild Certified Payroll never runs payroll or pays restitution.
- `email_send`: Fairbuild Certified Payroll never sends the correction note; a person sends the approved draft.

Waits for one named person's click, even in Auto mode (nothing is sent, paid or posted by the agent; the click is recorded for the person who acts):

- `certified_payroll_request_send`: Approve the corrections (one click)

## Checks

What `certified_payroll_check` flags, each with the first example it finds in the fictional fixtures (the eval cases for `certified_payroll_check`):

| Code | Example from the fixtures |
|---|---|
| `underpaid` | Paid 30 + 12.5 fringe per hour; the determination for Roofer is 31.5 + 12.5 (overtime 47.25 + 12.5). Short 69 for 40 straight and 4 overtime hour(s). |
| `ot_not_paid` | 44 straight-time hours in one week: 4 hour(s) past 40 are overtime, 63 short at 1.5 times the base rate. |
| `missing_worker_id` | No identifying number for PERSON-638f272c. The report needs the worker's id or the last four digits of the SSN. |
| `no_rate` | "Sheet Metal Worker" is not on the wage determination you supplied. Use the determination's classification, or add a conformance rate. |
| `full_ssn_on_report` | The worker id for PERSON-fd9ab9af looks like a full Social Security number. Use only the last four digits or an employee id on a certified payroll. |
| `duplicate_line` | PERSON-241bd4c9 appears 2 times for the week ending 2026-11-14 in the same classification. Only one line is counted; correct the payroll. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-certified-payroll demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Certified Payroll demo (fictional workers and rates; names are masked in results), Auto mode on for drafts

▶ Check two weeks of certified payroll against the determination
  status: executed  decision: allow
  8 payroll line(s), 5 worker(s), 2 week(s), 302 hour(s): 3 line(s) paid below the determination (450 short), 4 to review.
    2026-11-07 PERSON-64c318d7  Roofer              short     69  underpaid underpaid
    2026-11-07 PERSON-fd9ab9af  Laborer Group 1     short    318  underpaid underpaid
    2026-11-14 PERSON-d1953839  Roofer              short     63  underpaid ot_not_paid
    2026-11-07 PERSON-638f272c  Roofer              short      0  review    missing_worker_id
    2026-11-14 PERSON-64c318d7  Sheet Metal Worker  short      0  review    no_rate
    2026-11-14 PERSON-fd9ab9af  Laborer Group 1     short      0  review    full_ssn_on_report
    2026-11-14 PERSON-241bd4c9  Roofer              short      0  review    duplicate_line
    2026-11-07 PERSON-d1953839  Roofer              short      0  ok        

▶ Explain one line by its masked key
  status: executed  decision: allow
  PERSON-64c318d7 week ending 2026-11-07 (Roofer): underpaid. 40 straight + 4 overtime hour(s) at 30 + 12.5; rate 31.5 + 12.5; short 69. Paid 30 + 12.5 fringe per hour; the determination for Roofer is 31.5 + 12.5 (overtime 47.25 + 12.5). Short 69 for 40 straight and 4 overtime hour(s).

▶ Write the worklist (the files keep the real names)
  status: executed  decision: allow
  Worklist written: 8 payroll line(s), 5 worker(s), 2 week(s), 302 hour(s): 3 line(s) paid below the determination (450 short), 4 to review.

▶ Draft the payroll corrections (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  corrections 24-102 November drafted for 450 with 3 open marker(s) ([TO CONFIRM payroll], [TO CONFIRM your name], [TO CONFIRM with your labor compliance adviser]). Nothing was sent.

▶ Approve sending them: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to submit the certified payroll itself
  status: blocked  decision: block
  reason: Fairbuild Certified Payroll never signs or submits a certified payroll to an agency or owner.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `certified_payroll_check` | Per worker and week: cash plus fringe per hour against base plus fringe for the classification, straight and overtime; straight-time hours past the weekly limit; classifications not on the determination; missing worke… | runs |
| `certified_payroll_explain` | Show one worker-week line against the rate and every finding. | runs |
| `certified_payroll_write_report` | Write the certified payroll worklist as certified-payroll.csv (one row per item, blank decision columns for people to fill in) and certified-payroll.html into out_dir (default fairbuild-out/certified-payroll). | runs |
| `certified_payroll_draft_corrections` | Write drafts/corrections-<label>.md: the lines to correct before the certified payroll is signed, with the amount short per line. | asks first (Auto can be opted in) |
| `certified_payroll_request_send` | After one named human click (even in Auto), record that the reviewed corrections draft is approved in corrections-requests.csv. | one named click, even in Auto (`binding_send`) |
| `payroll_submit` | Fairbuild Certified Payroll never signs or submits a certified payroll to an agency or owner. | refused |
| `payroll_run` | Fairbuild Certified Payroll never runs payroll or pays restitution. | refused |
| `email_send` | Fairbuild Certified Payroll never sends the correction note; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Certified payroll lines (`payroll`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` | text | Job, Job Number, Project, Project Number, Contract | Projekt, Chantier, 工事番号, 项目编号 |
| `week_ending` | date | Week Ending, Week End, Period Ending, Pay Period End, W/E | Wochenende, Semaine se terminant le, 週末日, 周结束日 |
| `worker` (required) | text | Worker, Employee, Employee Name, Name, Name of Worker | Mitarbeiter, Salarié, 作業員, 工人 |
| `worker_id` | text | Worker ID, Employee ID, Employee Number, Last 4 SSN, SSN Last 4, ID | Personalnummer, Matricule, 社員番号, 工号 |
| `classification` | text | Classification, Work Classification, Craft, Trade, Job Class | Lohngruppe, Qualification, 職種, 工种 |
| `hours` | number | Hours, Straight Time Hours, ST Hours, Regular Hours, Total Hours | Stunden, Heures, 時間, 工时 |
| `overtime_hours` | number | Overtime Hours, OT Hours, Overtime | Überstunden, Heures supplémentaires, 残業時間, 加班工时 |
| `rate_paid` | amount | Rate Paid, Rate of Pay, Hourly Rate, Base Rate Paid, Rate | - |
| `fringe_paid` | amount | Fringe Paid, Fringe, Fringe Benefits, Fringes per Hour, Fringe Rate Paid | Zulagen, Avantages, 福利費, 福利 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Certified payroll (WH-347 layout) | Certified payroll lines typed or exported in the WH-347 column order | Work Classification, Rate of Pay, Total Hours or Straight Time Hours | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Wage determination rates (`rates`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `classification` (required) | text | Classification, Craft, Work Classification, Trade | Lohngruppe, Qualification, 職種, 工种 |
| `base_rate` | amount | Base Rate, Rate, Basic Hourly Rate, Hourly Rate | Stundenlohn, Taux, 単価, 单价 |
| `fringe_rate` | amount | Fringe Rate, Fringe, Fringe Benefits, Fringes | Zulagen, Avantages, 福利費, 福利 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-certified-payroll inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-certified-payroll demo
npx -y fairbuild-certified-payroll mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-certified-payroll": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-certified-payroll",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-certified-payroll -- npx -y fairbuild-certified-payroll mcp --root .`, or install the `fairbuild-certified-payroll` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-certified-payroll approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-certified-payroll approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-certified-payroll kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-certified-payroll tools                 # every tool, its policy and arguments
fairbuild-certified-payroll sources               # the columns each input is read from
fairbuild-certified-payroll inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-certified-payroll call certified_payroll_check '{"payroll":"<payroll>","rates":"<rates>"}'
fairbuild-certified-payroll eval                  # the private eval cases on the fictional fixtures
fairbuild-certified-payroll demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Fairbuild Certified Payroll compares cash plus fringe with the rates you supplied. Which determination applies, apprentice rates, fringe credits and overtime rules are for your labor compliance adviser.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
- Results returned to the AI model have worker names, worker ids, Social Security numbers and homeowner contact details masked. The files written here keep the real values: keep them in a secure folder.
