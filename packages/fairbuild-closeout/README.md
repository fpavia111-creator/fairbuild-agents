# Fairbuild Closeout (`fairbuild-closeout`)

Checks the closeout checklist of completed jobs against the items you require (final lien waivers, warranties, O&M manuals, as-builts, punch list, occupancy, final pay application and others you name): items missing, rejected, overdue or open long after completion, and which jobs are ready for final billing. Drafts reminders. Submitting closeout and billing is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-closeout demo
npx -y fairbuild-closeout mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `jobs` (required) | Jobs under --root (CSV, Excel or JSON) with their substantial completion date; jobs not yet complete are skipped |
| `checklist` (required) | Closeout checklist: job, item, status, due date, received date |
| `requirements` (required) | Your closeout requirements JSON (closeout_requirements schema): required items, grace_days, item_aliases |

Only `jobs` and `checklist` and `requirements` are required. Each optional file turns on the checks that need it.

## Checks

What `closeout_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `item_missing` | Final pay application is not on the closeout checklist for job 23-090. |
| `item_rejected` | As-built drawings was returned or rejected; resubmit it. |
| `item_overdue` | O&M manuals was due 2026-09-15 and is still pending. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-closeout demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Closeout demo (fictional jobs and checklists), Auto mode on for drafts

▶ Check closeout on completed jobs
  status: executed  decision: allow
  2 completed job(s), 14 closeout item(s) as of 2026-11-16: 11 done, 1 missing, 1 rejected, 1 overdue or open too long, 0 open. 1 job(s) ready for final billing.
    23-090 Final pay application      missing   item_missing
    23-090 As-built drawings          rejected  item_rejected
    23-090 O&M manuals                overdue   item_overdue

▶ Explain job 23-090 O&M manuals
  status: executed  decision: allow
  23-090 O&M manuals: overdue. Checklist status Pending. O&M manuals was due 2026-09-15 and is still pending.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 2 completed job(s), 14 closeout item(s) as of 2026-11-16: 11 done, 1 missing, 1 rejected, 1 overdue or open too long, 0 open. 1 job(s) ready for final billing.

▶ Draft a closeout reminder (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  reminder 23-090 drafted with 2 open marker(s) ([TO CONFIRM project manager], [TO CONFIRM your name]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to submit the closeout package itself
  status: blocked  decision: block
  reason: Fairbuild Closeout never submits a closeout package to an owner or architect.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `closeout_check` | Per completed job and required closeout item: on the checklist, received or complete, rejected, overdue, or still open long after completion. | runs |
| `closeout_explain` | Show one closeout item with every finding. | runs |
| `closeout_write_report` | Write the closeout worklist as closeout.csv (one row per item, blank decision columns for people to fill in) and closeout.html into out_dir (default fairbuild-out/closeout). | runs |
| `closeout_draft_reminder` | Write drafts/reminder-<job>.md: the closeout items still missing, rejected or overdue on one job, for its project manager. | asks first (Auto can be opted in) |
| `closeout_request_send` | After one named human click (even in Auto), record that the reviewed reminder draft is approved in reminder-requests.csv. | one named click, even in Auto (`binding_send`) |
| `closeout_submit` | Fairbuild Closeout never submits a closeout package to an owner or architect. | refused |
| `invoice_create` | Fairbuild Closeout never creates a final invoice or retainage bill. | refused |
| `email_send` | Fairbuild Closeout never sends the reminder; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Jobs and completion dates (`jobs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `job_name` | text | Job Name, Project Name | Projektname, Nom du chantier, 工事名, 项目名称 |
| `completion_date` | date | Completion Date, Substantial Completion, Substantial Completion Date, Completed | Fertigstellung, Date de réception, 竣工日, 竣工日期 |
| `project_manager` | text | Project Manager, PM | Projektleiter, Conducteur de travaux, 工事責任者, 项目经理 |

### Closeout checklist (`checklist`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `item` (required) | text | Item, Closeout Item, Document, Requirement, Deliverable | Position, Ligne, 明細番号, 行号 |
| `status` | text | Status, State | Status, Statut, ステータス, 状态 |
| `due_date` | date | Due Date, Due, Required By | Fälligkeitsdatum, Date d'échéance, 期日, 截止日期 |
| `received_date` | date | Received Date, Received, Completed, Submitted | Eingangsdatum, Date de réception, 受領日, 收到日期 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-closeout inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-closeout demo
npx -y fairbuild-closeout mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-closeout": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-closeout",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-closeout -- npx -y fairbuild-closeout mcp --root .`, or install the `fairbuild-closeout` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-closeout approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-closeout approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-closeout kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-closeout tools                 # every tool, its policy and arguments
fairbuild-closeout sources               # the columns each input is read from
fairbuild-closeout inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-closeout call closeout_check '{"jobs":"<jobs>","checklist":"<checklist>","requirements":"<requirements>"}'
fairbuild-closeout eval                  # the private eval cases on the fictional fixtures
fairbuild-closeout demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Your contract decides what closeout requires; Fairbuild Closeout checks the items you list against the checklist you keep.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
