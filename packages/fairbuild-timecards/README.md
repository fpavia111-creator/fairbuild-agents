# Fairbuild Timecards (`fairbuild-timecards`)

Checks field timecards against crew assignments, job status and the cost codes in each job budget: hours on a job the worker was not assigned to that day, on a closed job or on an unbudgeted code, days over your limit, weekend hours and entries made twice. Worker names are masked in what the model sees. Drafts recode requests; editing timecards is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-timecards demo
npx -y fairbuild-timecards mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `timecards` (required) | Timecard entries under --root (CSV, Excel or JSON): worker, date, job, cost code, hours, overtime hours. Sage 300 timecard entry exports are recognised |
| `assignments` | Optional crew assignments: worker, job, from and to dates |
| `jobs` | Optional job list with status and completion date, to catch hours on closed jobs |
| `budget` | Optional budget (job and cost code) to catch hours on codes with no budget |
| `settings` | Optional settings JSON (timecard_settings schema): max_daily_hours, flag_weekends |

Only `timecards` is required. Each optional file turns on the checks that need it.

## Checks

What `timecards_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `not_assigned` | PERSON-f3796398 was not assigned to job 24-102 on 2026-11-10; 8 hour(s) charged to it. |
| `closed_job` | 7 hour(s) on 23-095 01-500, a job that is closed (completed 2026-06-30). |
| `long_day` | 16 hours on 2026-11-10 across 2 entries, more than 14. Check for a typing error or a missing split. |
| `invalid_cost_code` | Cost code 05-120 has no budget on job 24-101; 8 hour(s) charged to it. |
| `duplicate_entry` | 24-101 09-250 8 hour(s) is entered 2 times on 2026-11-12; counted once. |
| `weekend` | 6 hour(s) on a Saturday (2026-11-14). Confirm the work was authorised. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-timecards demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Timecards demo (fictional workers and jobs; names are masked in results), Auto mode on for drafts

▶ Check a week of timecards
  status: executed  decision: allow
  8 worker-day(s) for 4 worker(s), 70 hour(s): 3 with hours on the wrong job, a closed job or an unbudgeted code (23 hour(s)), 2 to review.
    2026-11-10 PERSON-78702393     8h  misallocated  not_assigned
    2026-11-10 PERSON-5807ba5a    16h  misallocated  closed_job, not_assigned, long_day
    2026-11-11 PERSON-571c5563     8h  misallocated  invalid_cost_code
    2026-11-12 PERSON-571c5563     8h  review        duplicate_entry
    2026-11-14 PERSON-7bc0a042     6h  review        weekend
    2026-11-09 PERSON-7bc0a042     8h  ok            
    2026-11-10 PERSON-7bc0a042     8h  ok            
    2026-11-16 PERSON-78702393     8h  ok            

▶ Explain the first worker-day
  status: executed  decision: allow
  PERSON-78702393 on 2026-11-10: misallocated. 8 hour(s): 24-102 07-500 8h. PERSON-78702393 was not assigned to job 24-102 on 2026-11-10; 8 hour(s) charged to it.

▶ Write the worklist (the files keep the real names)
  status: executed  decision: allow
  Worklist written: 8 worker-day(s) for 4 worker(s), 70 hour(s): 3 with hours on the wrong job, a closed job or an unbudgeted code (23 hour(s)), 2 to review.

▶ Draft the recode request (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  recode week ending 2026-11-14 drafted with 3 open marker(s) ([TO CONFIRM payroll or project manager], [TO CONFIRM your name], [TO CONFIRM]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to edit a timecard itself
  status: blocked  decision: block
  reason: Fairbuild Timecards never edits, approves or deletes a timecard.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `timecards_check` | Per worker and day: hours on a job the worker was not assigned to that day, on a closed job, or on a cost code with no budget on the job; days over your limit; weekend hours; entries made twice. | runs |
| `timecards_explain` | Show one worker-day's entries and every finding. | runs |
| `timecards_write_report` | Write the timecard worklist as timecards.csv (one row per item, blank decision columns for people to fill in) and timecards.html into out_dir (default fairbuild-out/timecards). | runs |
| `timecards_draft_recode` | Write drafts/recode-<label>.md: the timecard entries to recode before payroll closes, with [TO CONFIRM] for the right job and code. | asks first (Auto can be opted in) |
| `timecards_request_send` | After one named human click (even in Auto), record that the reviewed recode draft is approved in recode-requests.csv. | one named click, even in Auto (`binding_send`) |
| `timecard_edit` | Fairbuild Timecards never edits, approves or deletes a timecard. | refused |
| `payroll_run` | Fairbuild Timecards never runs payroll. | refused |
| `email_send` | Fairbuild Timecards never sends the request; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Timecard entries (`timecards`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `worker` (required) | text | Worker, Employee, Employee Name, Name | Mitarbeiter, Salarié, 作業員, 工人 |
| `worker_id` | text | Worker ID, Employee ID, Employee Number, Emp # | Personalnummer, Matricule, 社員番号, 工号 |
| `date` | date | Date, Work Date, Day, Timecard Date | Datum, Date, 日付, 日期 |
| `job` | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `cost_code` | text | Cost Code, Phase, Phase Code, Task | Leistungsposition, Code de coût, 工種, 成本科目 |
| `hours` | number | Hours, Regular Hours, Total Hours, Hrs | Stunden, Heures, 時間, 工时 |
| `overtime_hours` | number | Overtime Hours, OT Hours, Overtime | Überstunden, Heures supplémentaires, 残業時間, 加班工时 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Sage 300 Construction and Real Estate | Payroll timecard entry export | Employee, Job, Cost Code, Regular Hours, Overtime Hours | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Crew assignments (`assignments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `worker` (required) | text | Worker, Employee, Employee Name, Name, Crew Member | Mitarbeiter, Salarié, 作業員, 工人 |
| `job` (required) | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `start_date` | date | Start Date, Start, From, Assigned From | Eintrittsdatum, Date d'entrée, 入社日, 入职日期 |
| `end_date` | date | End Date, End, To, Assigned To, Until | Austrittsdatum, Date de sortie, 退職日, 离职日期 |

### Job status (`jobs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `status` | text | Status, Job Status, Project Status | Status, Statut, ステータス, 状态 |
| `completion_date` | date | Completion Date, Closed Date, Completed, Finish Date | Fertigstellung, Date de réception, 竣工日, 竣工日期 |

### Budget cost codes (`budget`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `cost_code` (required) | text | Cost Code, Phase, Phase Code, Budget Code | Leistungsposition, Code de coût, 工種, 成本科目 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-timecards inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-timecards demo
npx -y fairbuild-timecards mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-timecards": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-timecards",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-timecards -- npx -y fairbuild-timecards mcp --root .`, or install the `fairbuild-timecards` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-timecards approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-timecards approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-timecards kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-timecards tools                 # every tool, its policy and arguments
fairbuild-timecards sources               # the columns each input is read from
fairbuild-timecards inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-timecards call timecards_check '{"timecards":"<timecards>"}'
fairbuild-timecards eval                  # the private eval cases on the fictional fixtures
fairbuild-timecards demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Fairbuild Timecards compares entries with the assignments you supply. It does not know whether a worker was sent to another job for the day; the foreman does.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
- Results returned to the AI model have worker names, worker ids, Social Security numbers and homeowner contact details masked. The files written here keep the real values: keep them in a secure folder.
