# Fairbuild WIP Schedule (`fairbuild-wip-schedule`)

Builds the month-end work-in-progress schedule by the cost-to-cost method: percent complete, earned revenue, over and under billings by job, the anticipated loss to recognise on loss jobs, cost past the estimate and jobs with no estimate. Drafts the over/under billing journal. Posting it is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-wip-schedule demo
npx -y fairbuild-wip-schedule mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `wip` (required) | Job list for the period under --root (CSV, Excel or JSON): job, revised contract amount, revised estimated total cost, cost to date and billed to date |
| `period_end` | Period end date for the schedule, YYYY-MM-DD (default today) |
| `settings` | Optional settings JSON (wip_settings schema): under_alert_pct, tolerance |

Only `wip` is required. Each optional file turns on the checks that need it.

## Checks

What `wip_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `loss_job` | Estimated cost 214000 exceeds the contract 200000: an expected loss of 14000, of which 10500 is already in gross profit to date; 3500 more is to be recognised now. |
| `cost_exceeds_estimate` | Cost to date 152000 is past the estimated total cost 150000. Update the estimate; percent complete is held at 100% until then. |
| `under_billed_large` | Under billed 47743.9 (18.4% of the contract): earned 190243.9, billed 142500. Bill the work in place or check the cost to date for misposted cost. |
| `no_estimate` | Cost 12000 and billings 15000 with no estimated total cost: percent complete cannot be measured. Enter the estimate. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-wip-schedule demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild WIP Schedule demo (seven fictional jobs), Auto mode on for drafts

▶ Build the WIP schedule for October
  status: executed  decision: allow
  WIP at 2026-10-31: 7 job(s), earned 868243.9 against billed 849300. Over billings 30000, under billings 63943.9 (net -33943.9). Loss provision 3500 on 1 job(s); 3 job(s) to review.
    24-103      75%  earned    150000  over       0  under        0  loss   loss_job
    23-095     100%  earned    180000  over       0  under        0  review cost_exceeds_estimate
    24-102   73.17%  earned  190243.9  over       0  under  47743.9  review under_billed_large
    24-105        %  earned            over       0  under        0  review no_estimate
    24-101      60%  earned    273000  over       0  under    16200  ok     
    24-104      25%  earned     75000  over   30000  under        0  ok     
    24-106       0%  earned         0  over       0  under        0  ok     

▶ Explain the loss job
  status: executed  decision: allow
  24-103 Example Clinic annex: loss. Contract 200000, estimated cost 214000, cost to date 160500 (75% complete), earned 150000, billed 150000: over 0, under 0, loss provision 3500. Estimated cost 214000 exceeds the contract 200000: an expected loss of 14000, of which 10500 is already in gross profit to date; 3500 more is to be recognised now.

▶ Write the WIP schedule
  status: executed  decision: allow
  Worklist written: WIP at 2026-10-31: 7 job(s), earned 868243.9 against billed 849300. Over billings 30000, under billings 63943.9 (net -33943.9). Loss provision 3500 on 1 job(s); 3 job(s) to review.

▶ Draft the over/under billing journal (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  journal 2026-10-31 drafted for -33943.9 with 3 open marker(s) ([TO CONFIRM reviewer], [TO CONFIRM reversal method], [TO CONFIRM your chart of accounts]). Nothing was sent.

▶ Approve the journal for posting: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: production_deploy stays one-click, even in Auto

▶ Agent tries to post to the ledger itself
  status: blocked  decision: block
  reason: Fairbuild WIP Schedule never posts journal entries; your accountant posts the reviewed entry.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `wip_check` | Per job by the cost-to-cost method: percent complete, earned revenue, over or under billed, gross profit to date and the anticipated loss to recognise on a loss job. | runs |
| `wip_explain` | Show one job's WIP line and every finding. | runs |
| `wip_write_report` | Write the WIP schedule as wip-schedule.csv (one row per item, blank decision columns for people to fill in) and wip-schedule.html into out_dir (default fairbuild-out/wip-schedule). | runs |
| `wip_draft_journal` | Write drafts/journal-<period_end>.md: the over/under billing and loss provision entry from the WIP schedule, with the per-job table and [TO CONFIRM] for accounts and reviewer. | asks first (Auto can be opted in) |
| `wip_request_post` | After one named human click (even in Auto), record that the reviewed journal draft is approved in journal-requests.csv. | one named click, even in Auto (`production_deploy`) |
| `gl_post` | Fairbuild WIP Schedule never posts journal entries; your accountant posts the reviewed entry. | refused |
| `estimate_update` | Fairbuild WIP Schedule never changes a job's estimate or contract amount. | refused |
| `email_send` | Fairbuild WIP Schedule never sends the schedule or the journal. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Jobs for the WIP schedule (`wip`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Job No, Project, Project Number, Contract | Projekt, Chantier, 工事番号, 项目编号 |
| `job_name` | text | Job Name, Project Name, Description | Projektname, Nom du chantier, 工事名, 项目名称 |
| `contract_amount` | amount | Contract Amount, Revised Contract, Revised Contract Amount, Contract Value, Current Contract | Auftragssumme, Montant du marché, 請負金額, 合同金额 |
| `estimated_cost` | amount | Estimated Cost, Revised Estimated Cost, Total Estimated Cost, Estimated Cost at Completion, EAC, Projected Cost | Kalkulierte Kosten, Coût prévisionnel, 実行予算, 预计总成本 |
| `cost_to_date` | amount | Cost to Date, Job to Date Cost, JTD Cost, Actual Cost, Costs Incurred | Ist-Kosten, Réalisé, 実績, 实际成本 |
| `billed_to_date` | amount | Billed to Date, Billings to Date, Total Billed, JTD Billed, Billed | Gesamt abgerechnet, Cumul à date, 累計出来高, 累计完成 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-wip-schedule inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-wip-schedule demo
npx -y fairbuild-wip-schedule mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-wip-schedule": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-wip-schedule",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-wip-schedule -- npx -y fairbuild-wip-schedule mcp --root .`, or install the `fairbuild-wip-schedule` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-wip-schedule approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-wip-schedule approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-wip-schedule kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-wip-schedule tools                 # every tool, its policy and arguments
fairbuild-wip-schedule sources               # the columns each input is read from
fairbuild-wip-schedule inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-wip-schedule call wip_check '{"wip":"<wip>"}'
fairbuild-wip-schedule eval                  # the private eval cases on the fictional fixtures
fairbuild-wip-schedule demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- The cost-to-cost method assumes cost to date measures progress; uninstalled materials or front-loaded costs distort it. Your accountant decides the method and the entries.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
