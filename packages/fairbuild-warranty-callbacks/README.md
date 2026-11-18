# Fairbuild Warranty Callbacks (`fairbuild-warranty-callbacks`)

Reviews warranty callbacks by job, trade and subcontractor: cost a subcontractor should cover under its warranty, callbacks after your warranty ended that may be billable, repeat callbacks, callbacks open too long and callbacks with no one responsible. Homeowner names and contacts are masked in what the model sees. Drafts subcontractor notices; charging anyone is a person's decision.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-warranty-callbacks demo
npx -y fairbuild-warranty-callbacks mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `callbacks` (required) | Warranty callback log under --root (CSV, Excel or JSON): id, job, homeowner, phone, date reported, trade, responsible vendor, description, cost, status, closed date |
| `jobs` | Optional job list with completion date and warranty months, to find callbacks after the warranty ended |
| `settings` | Optional settings JSON (warranty_settings schema): warranty_months, repeat_days, response_days, self_performed |

Only `callbacks` is required. Each optional file turns on the checks that need it.

## Checks

What `warranty_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `out_of_warranty` | Reported 2026-10-20; the warranty on job 22-050 ended 2026-03-01. The repair may be billable to the owner. |
| `backcharge_candidate` | Example Roofing LLC did the roofing; 850 of callback cost to recover under its subcontract warranty. |
| `repeat_callback` | The same trade was called back on job 23-090 30 day(s) earlier (CB-101). The first repair may not have fixed it. |
| `open_too_long` | Open 15 days since 2026-11-01. |
| `no_responsible_party` | No one recorded as responsible for the plumbing repair. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-warranty-callbacks demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Warranty Callbacks demo (fictional homes and callbacks; homeowners are masked in results), Auto mode on for drafts

▶ Review six warranty callbacks
  status: executed  decision: allow
  6 warranty callback(s), 3470 in cost, 2 open: 1750 to recover from subcontractors, 1400 reported after the warranty ended, 1 to review.
    CB-104 22-050 Paving      1400  billable   out_of_warranty
    CB-101 23-090 Roofing      850  backcharge backcharge_candidate
    CB-102 23-090 Roofing      600  backcharge backcharge_candidate, repeat_callback, open_too_long
    CB-105 23-110 Electrical   300  backcharge backcharge_candidate
    CB-103 23-095 Plumbing     120  review     no_responsible_party
    CB-106 23-090 Drywall      200  ok         

▶ Explain the repeat leak
  status: executed  decision: allow
  CB-102 job 23-090 (Roofing, Example Roofing LLC) reported 2026-11-01: backcharge. Leak at skylight again; cost 600, open. Example Roofing LLC did the roofing; 600 of callback cost to recover under its subcontract warranty. The same trade was called back on job 23-090 30 day(s) earlier (CB-101). The first repair may not have fixed it. Open 15 days since 2026-11-01.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 6 warranty callback(s), 3470 in cost, 2 open: 1750 to recover from subcontractors, 1400 reported after the warranty ended, 1 to review.

▶ Draft a notice to the roofer (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  notice Example Roofing LLC drafted for 1450 with 4 open marker(s) ([TO CONFIRM subcontractor contact], [TO CONFIRM your name and company], [TO CONFIRM subcontract warranty clause], [ATTACH]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to post a backcharge itself
  status: blocked  decision: block
  reason: Fairbuild Warranty Callbacks never posts a backcharge or deducts from a subcontractor payment.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `warranty_check` | Per callback: cost to recover from the responsible subcontractor, reported after your warranty ended (possibly billable), the same trade back on the same job within your repeat window, open too long, and no responsibl… | runs |
| `warranty_explain` | Show one callback with every finding. | runs |
| `warranty_write_report` | Write the warranty worklist as warranty-callbacks.csv (one row per item, blank decision columns for people to fill in) and warranty-callbacks.html into out_dir (default fairbuild-out/warranty-callbacks). | runs |
| `warranty_draft_notice` | Write drafts/notice-<vendor>.md: a notice to one subcontractor asking it to cover its warranty callbacks, with [ATTACH] for photos and tickets. | asks first (Auto can be opted in) |
| `warranty_request_send` | After one named human click (even in Auto), record that the reviewed notice draft is approved in notice-requests.csv. | one named click, even in Auto (`binding_send`) |
| `backcharge_post` | Fairbuild Warranty Callbacks never posts a backcharge or deducts from a subcontractor payment. | refused |
| `homeowner_contact` | Fairbuild Warranty Callbacks never contacts a homeowner or an owner. | refused |
| `email_send` | Fairbuild Warranty Callbacks never sends the notice; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Warranty callback log (`callbacks`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `callback_id` (required) | text | Callback ID, Callback, Ticket, Service Request, Warranty Request, ID | - |
| `job` | text | Job, Job Number, Project, Lot | Projekt, Chantier, 工事番号, 项目编号 |
| `homeowner` | text | Homeowner, Owner, Customer, Caller, Contact Name | Bauherr, Propriétaire, 施主, 业主 |
| `contact_phone` | text | Contact Phone, Phone, Homeowner Phone | - |
| `date_reported` | date | Date Reported, Reported, Date, Opened, Created | - |
| `trade` | text | Trade, Category, Item, Type | Gewerk, Corps d'état, 職種, 专业 |
| `vendor` | text | Vendor, Subcontractor, Responsible, Responsible Party, Assigned To | Lieferant, Fournisseur, 仕入先, 供应商 |
| `description` | text | Description, Issue, Problem, Notes | Beschreibung, Description, 摘要, 摘要 |
| `cost` | amount | Cost, Repair Cost, Amount, Total Cost | Kosten, Coût, 原価, 成本 |
| `status` | text | Status, State | Status, Statut, ステータス, 状态 |
| `closed_date` | date | Closed Date, Closed, Completed, Resolved | Erledigt am, Levée le, 完了日, 关闭日期 |

### Jobs and warranty terms (`jobs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project, Lot | Projekt, Chantier, 工事番号, 项目编号 |
| `completion_date` | date | Completion Date, Closing Date, Substantial Completion, Handover | Fertigstellung, Date de réception, 竣工日, 竣工日期 |
| `warranty_months` | number | Warranty Months, Warranty Term, Warranty | Gewährleistung Monate, Garantie (mois), 保証期間（月）, 保修期（月） |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-warranty-callbacks inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-warranty-callbacks demo
npx -y fairbuild-warranty-callbacks mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-warranty-callbacks": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-warranty-callbacks",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-warranty-callbacks -- npx -y fairbuild-warranty-callbacks mcp --root .`, or install the `fairbuild-warranty-callbacks` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-warranty-callbacks approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-warranty-callbacks approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-warranty-callbacks kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-warranty-callbacks tools                 # every tool, its policy and arguments
fairbuild-warranty-callbacks sources               # the columns each input is read from
fairbuild-warranty-callbacks inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-warranty-callbacks call warranty_check '{"callbacks":"<callbacks>"}'
fairbuild-warranty-callbacks eval                  # the private eval cases on the fictional fixtures
fairbuild-warranty-callbacks demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Whether a repair is covered by your warranty or a subcontractor's is decided by the contracts; Fairbuild Warranty Callbacks only reads the dates and parties in your files.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
- Results returned to the AI model have worker names, worker ids, Social Security numbers and homeowner contact details masked. The files written here keep the real values: keep them in a secure folder.
