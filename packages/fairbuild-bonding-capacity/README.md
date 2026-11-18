# Fairbuild Bonding Capacity (`fairbuild-bonding-capacity`)

Summarises bonding capacity from your job list and the single and aggregate limits your surety gave you: bonded backlog against the aggregate, contracts over the single-job limit, bonded jobs forecast at a loss, and whether the bonded bids you are chasing fit in what is left. Drafts the summary for your broker. Not surety advice; requesting bonds is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-bonding-capacity demo
npx -y fairbuild-bonding-capacity mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `jobs` (required) | Job list under --root (CSV, Excel or JSON): job, contract amount, estimated cost, cost to date, bonded yes or no |
| `limits` (required) | Your bonding limits JSON (bonding_limits schema): single_limit and aggregate_limit from your surety, near_pct, and working capital and net worth to show |
| `pipeline` | Optional bids you are chasing: bid, amount, bond required |

Only `jobs` and `limits` are required. Each optional file turns on the checks that need it.

## Checks

What `bonding_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `single_over` | Bonded contract 2600000 is over your single-job limit of 2500000 by 100000. Confirm your surety approved it. |
| `pipeline_exceeds` | With this bid (and the bonded bids listed before it) bonded backlog would be 4101756.1, 101756.1 over your aggregate limit; 1098243.9 was left. |
| `near_aggregate` | Bonded backlog 2901756.1 is 72.5% of your aggregate limit of 4000000; 1098243.9 left. |
| `bonded_loss` | Bonded job forecast at a loss of 14000. Sureties watch loss jobs; expect questions. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-bonding-capacity demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Bonding Capacity demo (fictional jobs, limits and bids), Auto mode on for drafts

▶ Summarise bonding capacity
  status: executed  decision: allow
  Bonded backlog 2901756.1 on 4 job(s) is 72.5% of your 4000000 aggregate limit (1098243.9 left). 1 over a limit, 2 bid(s) that would not fit, 2 to review.
    job      24-301                 bonded    2600000  over     single_over
    bid      Example Library Annex  bonded    1200000  exceeds  pipeline_exceeds
    bid      Test Fire Station      bonded     600000  exceeds  pipeline_exceeds
    program  PROGRAM                bonded  2901756.1  review   near_aggregate
    job      24-103                 bonded      50000  review   bonded_loss
    job      24-101                 bonded     182000  ok       
    job      24-102                 bonded    69756.1  ok       
    job      24-104                            225000  ok       
    job      24-105                             15000  ok       
    bid      Sample Parking Garage             900000  ok       

▶ Explain the Example Library Annex bid
  status: executed  decision: allow
  bid Example Library Annex: exceeds. Bonded, contract 1200000, backlog 1200000. With this bid (and the bonded bids listed before it) bonded backlog would be 4101756.1, 101756.1 over your aggregate limit; 1098243.9 was left.

▶ Write the summary
  status: executed  decision: allow
  Worklist written: Bonded backlog 2901756.1 on 4 job(s) is 72.5% of your 4000000 aggregate limit (1098243.9 left). 1 over a limit, 2 bid(s) that would not fit, 2 to review.

▶ Draft the broker summary (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  summary Q4 2026 drafted with 3 open marker(s) ([TO CONFIRM surety broker], [TO CONFIRM your name and company], [ATTACH]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to request a bond itself
  status: blocked  decision: block
  reason: Fairbuild Bonding Capacity never requests a bid, performance or payment bond.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `bonding_check` | Backlog per job by cost to cost; bonded backlog against your aggregate limit; bonded contracts over your single-job limit; bonded jobs forecast at a loss; and, for the bids you list, whether each bonded bid still fits… | runs |
| `bonding_explain` | Show one job, bid or the program with every finding. | runs |
| `bonding_write_report` | Write the bonding summary as bonding-capacity.csv (one row per item, blank decision columns for people to fill in) and bonding-capacity.html into out_dir (default fairbuild-out/bonding-capacity). | runs |
| `bonding_draft_summary` | Write drafts/summary-<label>.md: the bonding capacity summary for your surety broker, with [ATTACH] for the financials and WIP. | asks first (Auto can be opted in) |
| `bonding_request_send` | After one named human click (even in Auto), record that the reviewed summary draft is approved in summary-requests.csv. | one named click, even in Auto (`binding_send`) |
| `bond_request` | Fairbuild Bonding Capacity never requests a bid, performance or payment bond. | refused |
| `surety_submit` | Fairbuild Bonding Capacity never sends financial statements or WIP to a surety or broker. | refused |
| `email_send` | Fairbuild Bonding Capacity never sends the summary; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Jobs and bonding (`jobs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `job_name` | text | Job Name, Project Name | Projektname, Nom du chantier, 工事名, 项目名称 |
| `contract_amount` | amount | Contract Amount, Revised Contract, Contract Value | Auftragssumme, Montant du marché, 請負金額, 合同金额 |
| `estimated_cost` | amount | Estimated Cost, Revised Estimated Cost, EAC | Kalkulierte Kosten, Coût prévisionnel, 実行予算, 预计总成本 |
| `cost_to_date` | amount | Cost to Date, JTD Cost, Actual Cost | Ist-Kosten, Réalisé, 実績, 实际成本 |
| `bonded` | yes/no | Bonded, Bond, P&P Bond, Performance Bond | Bürgschaft, Caution, 履行保証, 履约保函 |

### Bids being chased (`pipeline`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `bid` (required) | text | Bid, Bid Name, Project, Opportunity, Job Name | - |
| `amount` | amount | Amount, Bid Amount, Contract Amount, Value | Betrag, Montant, 金額, 金额 |
| `bond_required` | yes/no | Bond Required, Bonded, Bond | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-bonding-capacity inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-bonding-capacity demo
npx -y fairbuild-bonding-capacity mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-bonding-capacity": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-bonding-capacity",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-bonding-capacity -- npx -y fairbuild-bonding-capacity mcp --root .`, or install the `fairbuild-bonding-capacity` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-bonding-capacity approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-bonding-capacity approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-bonding-capacity kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-bonding-capacity tools                 # every tool, its policy and arguments
fairbuild-bonding-capacity sources               # the columns each input is read from
fairbuild-bonding-capacity inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-bonding-capacity call bonding_check '{"jobs":"<jobs>","limits":"<limits>"}'
fairbuild-bonding-capacity eval                  # the private eval cases on the fictional fixtures
fairbuild-bonding-capacity demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- The limits are the ones you supply from your surety. Fairbuild Bonding Capacity does not estimate bonding capacity or predict what a surety will approve.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
