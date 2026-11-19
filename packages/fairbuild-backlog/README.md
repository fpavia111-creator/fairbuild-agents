# Fairbuild Backlog (`fairbuild-backlog`)

Measures backlog and margin fade from month-end job history: the work left to earn and the gross profit in it, jobs whose estimated margin has faded since the first estimate or since last month, loss forecasts, margins that rose sharply and estimates not updated while the job moved. Drafts the backlog memo. Changing estimates is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-backlog demo
npx -y fairbuild-backlog mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `history` (required) | Month-end job history under --root (CSV, Excel or JSON), one row per job and period: job, period (YYYY-MM or a date), contract amount, estimated cost, cost to date. Past WIP schedules stacked together work |
| `settings` | Optional settings JSON (fade_settings schema): fade_pts, gain_pts, stale_move_pts |

Only `history` is required. Each optional file turns on the checks that need it.

## What it refuses, and what waits for a person

Refused in every mode (the tool is listed so an assistant can see it, and every call is blocked):

- `estimate_update`: Fairbuild Backlog never changes an estimate or a forecast.
- `gl_post`: Fairbuild Backlog never posts to the ledger.
- `email_send`: Fairbuild Backlog never sends the memo; a person sends the approved draft.

Waits for one named person's click, even in Auto mode (nothing is sent, paid or posted by the agent; the click is recorded for the person who acts):

- `backlog_request_send`: Approve the memo (one click)

## Checks

What `backlog_check` flags, each with the first example it finds in the fictional fixtures (the eval cases for `backlog_check`):

| Code | Example from the fixtures |
|---|---|
| `loss_forecast` | Forecast at a loss: estimated cost 214000 on a contract of 200000 (-7%). |
| `margin_fade` | Margin has faded from 7% (2026-08) to -7% (2026-10), 14 points: estimated gross profit down 28000. |
| `fade_since_last` | Down 8 points since 2026-09 alone. |
| `estimate_not_updated` | Estimated cost has stayed at 240000 for three periods while the job went from 0% to 25% complete. Ask for a reforecast. |
| `margin_gain` | Margin has risen from 20% to 26%, 6 points. Check the estimate to complete is real and no cost is missing or misposted. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-backlog demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Backlog demo (six fictional jobs, three months), Auto mode on for drafts

▶ Measure backlog and fade
  status: executed  decision: allow
  Backlog at 2026-10: 661756.1 on 6 job(s), 106156.1 gross profit in it (16%). 1 job(s) with margin fade or a loss forecast (28000 of estimated gross profit lost), 2 to review.
    24-103       7% ->     -7%  backlog     50000  fade   loss_forecast, margin_fade, fade_since_last
    24-104      20% ->     20%  backlog    225000  review estimate_not_updated
    24-105      20% ->     26%  backlog     15000  review margin_gain
    24-101      15% ->  14.29%  backlog    182000  ok     
    24-106   16.67% ->  16.67%  backlog    120000  ok     
    24-102      20% ->  21.15%  backlog   69756.1  ok     

▶ Explain job 24-103
  status: executed  decision: allow
  24-103: fade. Margin 7% (2026-08) to -7% (2026-10); 75% complete; backlog 50000 with -3500 gross profit. Forecast at a loss: estimated cost 214000 on a contract of 200000 (-7%). Margin has faded from 7% (2026-08) to -7% (2026-10), 14 points: estimated gross profit down 28000. Down 8 points since 2026-09 alone.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: Backlog at 2026-10: 661756.1 on 6 job(s), 106156.1 gross profit in it (16%). 1 job(s) with margin fade or a loss forecast (28000 of estimated gross profit lost), 2 to review.

▶ Draft the backlog memo (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  memo 2026-10 drafted for 661756.1 with 2 open marker(s) ([TO CONFIRM your name], [TO CONFIRM]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to change an estimate itself
  status: blocked  decision: block
  reason: Fairbuild Backlog never changes an estimate or a forecast.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `backlog_check` | Per job across periods: estimated margin at the first and latest period and the fade between them, fade since last period, loss forecasts, margins that rose sharply, estimates not updated while the job moved, and the … | runs |
| `backlog_explain` | Show one job's margin history, backlog and every finding. | runs |
| `backlog_write_report` | Write the backlog and fade worklist as backlog.csv (one row per item, blank decision columns for people to fill in) and backlog.html into out_dir (default fairbuild-out/backlog). | runs |
| `backlog_draft_memo` | Write drafts/memo-<period>.md: the backlog and fade memo for the owner or CFO, with [TO CONFIRM] for each job's cause. | asks first (Auto can be opted in) |
| `backlog_request_send` | After one named human click (even in Auto), record that the reviewed memo draft is approved in memo-requests.csv. | one named click, even in Auto (`binding_send`) |
| `estimate_update` | Fairbuild Backlog never changes an estimate or a forecast. | refused |
| `gl_post` | Fairbuild Backlog never posts to the ledger. | refused |
| `email_send` | Fairbuild Backlog never sends the memo; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Month-end job history (`history`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `period` (required) | text | Period, Month, Period End, As Of, Fiscal Period | Zeitraum, Période, 期間, 期间 |
| `contract_amount` | amount | Contract Amount, Revised Contract, Contract Value | Auftragssumme, Montant du marché, 請負金額, 合同金额 |
| `estimated_cost` | amount | Estimated Cost, Revised Estimated Cost, Estimated Cost at Completion, EAC | Kalkulierte Kosten, Coût prévisionnel, 実行予算, 预计总成本 |
| `cost_to_date` | amount | Cost to Date, JTD Cost, Actual Cost | Ist-Kosten, Réalisé, 実績, 实际成本 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-backlog inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-backlog demo
npx -y fairbuild-backlog mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-backlog": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-backlog",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-backlog -- npx -y fairbuild-backlog mcp --root .`, or install the `fairbuild-backlog` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-backlog approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-backlog approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-backlog kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-backlog tools                 # every tool, its policy and arguments
fairbuild-backlog sources               # the columns each input is read from
fairbuild-backlog inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-backlog call backlog_check '{"history":"<history>"}'
fairbuild-backlog eval                  # the private eval cases on the fictional fixtures
fairbuild-backlog demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Fade is measured on the estimates in your history file. Fairbuild Backlog does not know why a margin moved; the project managers do.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
