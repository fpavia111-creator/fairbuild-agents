# Fairbuild Punch Lists (`fairbuild-punch-lists`)

Checks punch list items by job, trade and subcontractor: items past due, open too long, reopened, with no one assigned, and open items on subcontractors you have already paid in full. Procore punch list exports are recognised. Drafts punch notices; closing items and charging subcontractors is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-punch-lists demo
npx -y fairbuild-punch-lists mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `punch` (required) | Punch list under --root (CSV, Excel or JSON): item, job, location, description, trade, assignee, created, due, status, closed date. Procore punch list exports are recognised |
| `payables` | Optional subcontractor balances: vendor, retainage remaining, balance remaining, to find open items on subcontractors already paid in full |
| `settings` | Optional settings JSON (punch_settings schema): aging_days |

Only `punch` is required. Each optional file turns on the checks that need it.

## Checks

What `punch_list_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `sub_paid_in_full` | Example Roofing LLC has been paid in full with no retainage left, and this item is still open. You have no money held to make sure it gets done. |
| `past_due` | Due 2026-10-31, 16 day(s) ago. |
| `open_too_long` | Open 37 days since 2026-10-10. |
| `reopened` | Reopened after it was marked done. |
| `no_assignee` | No one is assigned. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-punch-lists demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Punch Lists demo (fictional punch items), Auto mode on for drafts

▶ Check eight punch items on two jobs
  status: executed  decision: allow
  8 punch item(s) as of 2026-11-16: 6 open, 3 past due, 1 open on subcontractors already paid in full, 1 other item(s) to review.
    24-102 P-5  Flashing loose at curb         risk      sub_paid_in_full, past_due, open_too_long
    24-101 P-1  Paint touch-up at door frame   past_due  past_due, open_too_long
    24-101 P-4  Outlet cover missing           past_due  past_due, reopened, open_too_long
    24-102 P-6  Handrail loose                 review    no_assignee
    24-101 P-2  Ceiling tile damaged           open      
    24-102 P-7  Caulk at sink                  open      
    24-101 P-3  Door closer adjustment         closed    
    24-102 P-8  Debris left on roof            closed    

▶ Explain P-5
  status: executed  decision: allow
  P-5 on job 24-102 (Roof, Roofing, Example Roofing LLC): risk. Flashing loose at curb. Example Roofing LLC has been paid in full with no retainage left, and this item is still open. You have no money held to make sure it gets done. Due 2026-10-31, 16 day(s) ago. Open 37 days since 2026-10-10.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 8 punch item(s) as of 2026-11-16: 6 open, 3 past due, 1 open on subcontractors already paid in full, 1 other item(s) to review.

▶ Draft a punch notice to the roofer (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  notice Example Roofing LLC drafted with 3 open marker(s) ([TO CONFIRM subcontractor contact], [TO CONFIRM your name and company], [TO CONFIRM date you need them done by]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to close the item itself
  status: blocked  decision: block
  reason: Fairbuild Punch Lists never closes, reassigns or edits a punch item.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `punch_list_check` | Per open punch item: past due, open longer than your aging days, reopened, no one assigned, and open on a subcontractor you have already paid in full with no retainage left. | runs |
| `punch_list_explain` | Show one punch item with every finding. | runs |
| `punch_list_write_report` | Write the punch list worklist as punch-lists.csv (one row per item, blank decision columns for people to fill in) and punch-lists.html into out_dir (default fairbuild-out/punch-lists). | runs |
| `punch_list_draft_notice` | Write drafts/notice-<vendor>.md: one subcontractor's open punch items with locations and due dates. | asks first (Auto can be opted in) |
| `punch_list_request_send` | After one named human click (even in Auto), record that the reviewed notice draft is approved in notice-requests.csv. | one named click, even in Auto (`binding_send`) |
| `punch_close` | Fairbuild Punch Lists never closes, reassigns or edits a punch item. | refused |
| `backcharge_post` | Fairbuild Punch Lists never charges a subcontractor for punch work. | refused |
| `email_send` | Fairbuild Punch Lists never sends the notice; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Punch list (`punch`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `item` (required) | text | Item, Item Number, Punch Item, #, Number, ID | Position, Ligne, 明細番号, 行号 |
| `job` | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `location` | text | Location, Area, Room | Ort, Localisation, 場所, 位置 |
| `description` | text | Description, Name, Title, Issue | Beschreibung, Description, 摘要, 摘要 |
| `trade` | text | Trade, Category, Discipline | Gewerk, Corps d'état, 職種, 专业 |
| `vendor` | text | Vendor, Assignee, Assigned To, Responsible Contractor, Ball In Court, Subcontractor | Lieferant, Fournisseur, 仕入先, 供应商 |
| `created` | date | Created, Created At, Date Created, Opened | Datum, Date, 日付, 日期 |
| `due_date` | date | Due Date, Due, Required By | Fälligkeitsdatum, Date d'échéance, 期日, 截止日期 |
| `status` | text | Status, State | Status, Statut, ステータス, 状态 |
| `closed_date` | date | Closed Date, Closed At, Closed, Completed | Erledigt am, Levée le, 完了日, 关闭日期 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Procore | Punch List, export to CSV | Punch Item Manager, Ball In Court, Due Date | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Subcontractor balances (`payables`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `vendor` (required) | text | Vendor, Subcontractor, Contract Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `retainage_remaining` | amount | Retainage Remaining, Retainage Held, Retainage Balance, Retainage | - |
| `balance_remaining` | amount | Balance Remaining, Remaining, Open Balance, Unpaid | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-punch-lists inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-punch-lists demo
npx -y fairbuild-punch-lists mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-punch-lists": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-punch-lists",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-punch-lists -- npx -y fairbuild-punch-lists mcp --root .`, or install the `fairbuild-punch-lists` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-punch-lists approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-punch-lists approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-punch-lists kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-punch-lists tools                 # every tool, its policy and arguments
fairbuild-punch-lists sources               # the columns each input is read from
fairbuild-punch-lists inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-punch-lists call punch_list_check '{"punch":"<punch>"}'
fairbuild-punch-lists eval                  # the private eval cases on the fictional fixtures
fairbuild-punch-lists demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
