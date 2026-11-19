# Fairbuild Change Orders (`fairbuild-change-orders`)

Reads the change order log by job: pending change orders waiting too long or with no price, approved change orders not yet billed, billing on unapproved changes or past the approved amount, changes priced below cost, rejected changes that left cost behind, and numbers entered twice. Drafts owner follow-ups. Approving and billing change orders is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-change-orders demo
npx -y fairbuild-change-orders mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `change_orders` (required) | Change order log under --root (CSV, Excel or JSON): job, number, type, status, description, price, estimated cost, submitted and approved dates, billed to date. Buildertrend and Procore change order exports are recognised |
| `settings` | Optional settings JSON (co_settings schema): pending_days, tolerance |

Only `change_orders` is required. Each optional file turns on the checks that need it.

## What it refuses, and what waits for a person

Refused in every mode (the tool is listed so an assistant can see it, and every call is blocked):

- `change_order_approve`: Fairbuild Change Orders never approves, rejects or changes a change order in your system.
- `invoice_create`: Fairbuild Change Orders never creates or submits a pay application or invoice.
- `email_send`: Fairbuild Change Orders never sends the follow-up; a person sends the approved draft.

Waits for one named person's click, even in Auto mode (nothing is sent, paid or posted by the agent; the click is recorded for the person who acts):

- `change_orders_request_send`: Approve the followup (one click)

## Checks

What `change_orders_check` flags, each with the first example it finds in the fictional fixtures (the eval cases for `change_orders_check`):

| Code | Example from the fixtures |
|---|---|
| `billed_not_approved` | 2000 has been billed on CO-005, which is pending. Owners usually reject billing on unapproved changes. |
| `pending_aging` | Pending 46 days since 2026-10-01 for 4200. Follow up with the owner for a decision. |
| `over_billed` | Billed 3600 is more than the approved 3000. |
| `approved_unbilled` | Approved for 8000 on 2026-09-30; 3000 billed so far, 5000 not yet on a pay application. |
| `no_price` | Pending with no price (estimated cost 1200). Price it and submit it. |
| `negative_margin` | Priced at 6500 against an estimated cost of 7200: 700 below cost. |
| `duplicate_number` | CO-104 appears 2 times on job 24-102 ("Parapet cap" 2500, "Parapet cap entered twice" 2500). Only the first is counted; correct the log. |
| `rejected_with_cost` | Rejected, with 4800 of estimated cost. Decide whether to absorb it, rework the pricing or pursue a claim. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-change-orders demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Change Orders demo (fictional jobs and change orders), Auto mode on for drafts

▶ Check the change order log on two jobs
  status: executed  decision: allow
  9 change order(s): 25000 approved, 16700 pending (2 waiting more than 30 days), 5000 approved but not billed. 2 with billing errors, 5 to review.
    24-101 CO-005   pending     4200   2000  billing_error  billed_not_approved, pending_aging
    24-102 CO-102   approved    3000   3600  billing_error  over_billed
    24-101 CO-002   approved    8000   3000  unbilled       approved_unbilled
    24-101 PCO-003  pending    12500      0  review         pending_aging
    24-101 PCO-004  pending               0  review         no_price
    24-102 CO-101   approved    6500   6500  review         negative_margin
    24-102 CO-104   approved    2500   2500  review         duplicate_number
    24-102 PCO-103  rejected    9000      0  review         rejected_with_cost
    24-101 CO-001   approved    5000   5000  ok             

▶ Explain the soffit framing change
  status: executed  decision: allow
  CO-005 on job 24-101 (Added soffit framing): Pending, billing_error. Amount 4200, cost 3000, billed 2000, unbilled 0. 2000 has been billed on CO-005, which is pending. Owners usually reject billing on unapproved changes. Pending 46 days since 2026-10-01 for 4200. Follow up with the owner for a decision.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 9 change order(s): 25000 approved, 16700 pending (2 waiting more than 30 days), 5000 approved but not billed. 2 with billing errors, 5 to review.

▶ Draft the owner follow-up for job 24-101 (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  followup 24-101 drafted for 16700 with 3 open marker(s) ([TO CONFIRM owner or owner representative], [TO CONFIRM price], [ATTACH pricing and backup]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to bill a change order itself
  status: blocked  decision: block
  reason: Fairbuild Change Orders never creates or submits a pay application or invoice.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `change_orders_check` | Per change order: pending and how long, approved and not yet billed, billed while unapproved or past the approved amount, priced below its estimated cost, rejected with cost behind it, with no price, or entered twice. | runs |
| `change_orders_explain` | Show one change order's state, price, cost, billing and every finding. | runs |
| `change_orders_write_report` | Write the change order worklist as change-orders.csv (one row per item, blank decision columns for people to fill in) and change-orders.html into out_dir (default fairbuild-out/change-orders). | runs |
| `change_orders_draft_followup` | Write drafts/followup-<job>.md: a note to the owner listing one job's pending change orders, their amounts and days waiting. | asks first (Auto can be opted in) |
| `change_orders_request_send` | After one named human click (even in Auto), record that the reviewed followup draft is approved in followup-requests.csv. | one named click, even in Auto (`binding_send`) |
| `change_order_approve` | Fairbuild Change Orders never approves, rejects or changes a change order in your system. | refused |
| `invoice_create` | Fairbuild Change Orders never creates or submits a pay application or invoice. | refused |
| `email_send` | Fairbuild Change Orders never sends the follow-up; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Change order log (`change_orders`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `change_order` (required) | text | Change Order, Change Order Number, CO Number, CO #, CO, Number | Nachtrag, Avenant, 変更番号, 变更单号 |
| `job` | text | Job, Job Number, Job No, Job #, Job No., Job ID | Projekt, Chantier, 工事番号, 项目编号 |
| `co_type` | text | CO Type, Change Order Type, Type, Kind | Nachtragsart, Type d'avenant, 変更区分, 变更类型 |
| `status` | text | Status, Approval Status, CO Status | Status, Statut, ステータス, 状态 |
| `description` | text | Description, Title, Scope, Reason | Beschreibung, Description, 摘要, 摘要 |
| `amount` | amount | Amount, Owner Price, Price, Revenue, Contract Change, Change Amount | Betrag, Montant, 金額, 金额 |
| `cost` | amount | Cost, Estimated Cost, Builder Cost, Cost Estimate, Budget Change | Kosten, Coût, 原価, 成本 |
| `submitted_date` | date | Submitted Date, Date Submitted, Submitted, Created, Date Created, Date | Eingereicht am, Date de soumission, 提出日, 提交日期 |
| `approved_date` | date | Approved Date, Date Approved, Approved, Executed Date, Signed Date | Genehmigt am, Date d'approbation, 承認日, 批准日期 |
| `billed` | amount | Billed, Billed to Date, Amount Billed, Invoiced | Abgerechnet, Facturé, 請求済, 已开票 |
| `commitment` | text | Commitment, Subcontract, PO, Contract Number | Auftragsnummer NU, N° de commande, 発注番号, 合同编号 |
| `vendor` | text | Vendor, Subcontractor, Contract Company, Sub | Lieferant, Fournisseur, 仕入先, 供应商 |
| `cost_code` | text | Cost Code, Costcode, Cost Code Number, Phase, Phase Code, Phase/Cost Code | Leistungsposition, Code de coût, 工種, 成本科目 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Buildertrend | Change Orders list, export to Excel | ID #, Approval Status, Owner Price | no |
| Procore | Change Orders tool, export to CSV | #, Contract Company, Date Approved | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-change-orders inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-change-orders demo
npx -y fairbuild-change-orders mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-change-orders": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-change-orders",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-change-orders -- npx -y fairbuild-change-orders mcp --root .`, or install the `fairbuild-change-orders` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-change-orders approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-change-orders approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-change-orders kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-change-orders tools                 # every tool, its policy and arguments
fairbuild-change-orders sources               # the columns each input is read from
fairbuild-change-orders inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-change-orders call change_orders_check '{"change_orders":"<change_orders>"}'
fairbuild-change-orders eval                  # the private eval cases on the fictional fixtures
fairbuild-change-orders demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Whether a change is owed under your contract is not decided here; Fairbuild Change Orders reads the status and amounts your log records.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
