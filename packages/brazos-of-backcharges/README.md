# Brazos of Backcharges (`brazos-of-backcharges`)

Tracks backcharges to subcontractors from notice to recovery: notices late or missing, agreed backcharges never deducted, deductions that differ from what was agreed, disputes dragging on, backcharges with no backup, and backcharges larger than what you still owe or hold. Drafts notices and records one-click deduction approvals; changing a payment is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y brazos-of-backcharges demo
npx -y brazos-of-backcharges mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `backcharges` (required) | Backcharge log under --root (CSV, Excel or JSON): number, job, subcontractor, date of the work, description, amount, status, notice date, amount deducted, backup on file |
| `balances` | Optional subcontract balances: subcontractor, revised amount, paid to date, retainage held, to see whether a backcharge can still be recovered from payments |
| `settings` | Optional settings JSON (backcharge_settings schema): notice_days, deduct_days, dispute_days |

Only `backcharges` is required. Each optional file turns on the checks that need it.

## Checks

What `brazos_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `unrecoverable` | Open backcharges on Example Roofing LLC total 6500; you still owe or hold 0 on its subcontracts. Recover the rest another way. |
| `late_notice` | Notice sent 2026-11-05, 16 days after the work on 2026-10-20; your subcontracts allow 7. The subcontractor may reject it as late. |
| `deducted_mismatch` | 1500 was deducted against a backcharge of 1800. |
| `not_deducted` | Agreed, and 1200 has not been deducted from a payment 41 days after notice. |
| `no_backup` | No backup (photos, time and material tickets) recorded. |
| `dispute_aging` | Disputed for 18 days. |

<!-- generated:start -->

## A demo run

`npx -y brazos-of-backcharges demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Brazos of Backcharges demo (fictional backcharges and balances), Auto mode on for drafts

▶ Track six backcharges
  status: executed  decision: allow
  6 backcharge(s), 13450 charged, 2400 recovered, 11050 still open. 1 larger than what you still owe or hold (6500 at risk), 3 needing action (notice, deduction or a wrong amount), 1 to review.
    BC-03 Example Roofing LLC       6500 open  6500  at_risk  unrecoverable
    BC-02 Example Electric Inc      2400 open  2400  action   late_notice
    BC-04 Example Storefronts LLC   1800 open   300  action   deducted_mismatch
    BC-01 Test Drywall Co           1200 open  1200  action   not_deducted
    BC-05 Sample Painting Co         650 open   650  review   no_backup
    BC-06 Example Concrete LLC       900 open     0  closed   

▶ Explain BC-03
  status: executed  decision: allow
  BC-03 Example Roofing LLC (job 24-102) 2026-10-28: at_risk. Interior damage from roof leak; 6500 charged, 0 deducted, 6500 open, disputed. Open backcharges on Example Roofing LLC total 6500; you still owe or hold 0 on its subcontracts. Recover the rest another way.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 6 backcharge(s), 13450 charged, 2400 recovered, 11050 still open. 1 larger than what you still owe or hold (6500 at risk), 3 needing action (notice, deduction or a wrong amount), 1 to review.

▶ Draft a backcharge notice (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  notice Example Electric Inc drafted for 2400 with 5 open marker(s) ([TO CONFIRM subcontractor contact], [TO CONFIRM your name and company], [TO CONFIRM clause], [TO CONFIRM days], [ATTACH photos and time and material tickets]). Nothing was sent.

▶ Approve deducting BC-01: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: move_money stays one-click, even in Auto

▶ Agent tries to deduct from a payment itself
  status: blocked  decision: block
  reason: Brazos never changes or reduces a payment; accounts payable deducts after a recorded approval.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `brazos_check` | Per backcharge: notice sent late or not at all against your notice days, agreed and never deducted, deducted at a different amount, disputed for too long, no backup, and open backcharges on a subcontractor larger than… | runs |
| `brazos_explain` | Show one backcharge with every finding. | runs |
| `brazos_write_report` | Write the backcharge worklist as brazos-backcharges.csv (one row per item, blank decision columns for people to fill in) and brazos-backcharges.html into out_dir (default fairbuild-out/brazos). | runs |
| `brazos_draft_notice` | Write drafts/notice-<vendor>.md: a backcharge notice to one subcontractor for its open backcharges, with [TO CONFIRM] for the clause and response days and [ATTACH] for backup. | asks first (Auto can be opted in) |
| `brazos_request_send` | After one named human click (even in Auto), record that the reviewed notice draft is approved in notice-requests.csv. | one named click, even in Auto (`binding_send`) |
| `brazos_request_deduction` | After one named human click (even in Auto), record in deduction-approvals.csv that accounts payable may deduct an agreed backcharge from the subcontractor's next payment, up to its open amount. | one named click, even in Auto (`move_money`) |
| `ap_deduct_payment` | Brazos never changes or reduces a payment; accounts payable deducts after a recorded approval. | refused |
| `backcharge_post` | Brazos never posts a backcharge in your accounting system. | refused |
| `email_send` | Brazos never sends the notice; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Backcharge log (`backcharges`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `backcharge` (required) | text | Backcharge, Backcharge Number, Number, ID, Back Charge | Belastung, Refacturation, 相殺, 扣款 |
| `job` | text | Job, Job Number, Project | Projekt, Chantier, 工事番号, 项目编号 |
| `vendor` | text | Vendor, Subcontractor, Charged To, Contract Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `date` | date | Date, Incurred, Date Incurred, Created | Datum, Date, 日付, 日期 |
| `description` | text | Description, Reason, Work Performed | Beschreibung, Description, 摘要, 摘要 |
| `amount` | amount | Amount, Backcharge Amount, Cost | Betrag, Montant, 金額, 金额 |
| `status` | text | Status, State | Status, Statut, ステータス, 状态 |
| `notice_date` | date | Notice Date, Notified, Date Notified, Notice Sent | Anzeigedatum, Date de notification, 通知日, 通知日期 |
| `deducted_amount` | amount | Deducted Amount, Deducted, Recovered, Amount Recovered | - |
| `backup` | yes/no | Backup, Backup Attached, Support, Documentation | - |

### Subcontract balances (`balances`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `vendor` (required) | text | Vendor, Subcontractor, Contract Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `revised_amount` | amount | Revised Amount, Revised Contract Amount, Contract Amount | Aktuelle Auftragssumme, Montant actualisé, 変更後契約額, 调整后合同金额 |
| `paid` | amount | Paid, Paid to Date, Payments Issued | Bezahlt, Payé, 支払済, 已付款 |
| `retainage_held` | amount | Retainage Held, Retainage | Einbehalt, Retenue de garantie, 保留金, 质保金 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx brazos-of-backcharges inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y brazos-of-backcharges demo
npx -y brazos-of-backcharges mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "brazos-of-backcharges": {
      "command": "npx",
      "args": [
        "-y",
        "brazos-of-backcharges",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add brazos-of-backcharges -- npx -y brazos-of-backcharges mcp --root .`, or install the `brazos-of-backcharges` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `brazos-of-backcharges approve <id> --as "Your Name"` (or on the local approvals page, `brazos-of-backcharges approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`brazos-of-backcharges kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
brazos-of-backcharges tools                 # every tool, its policy and arguments
brazos-of-backcharges sources               # the columns each input is read from
brazos-of-backcharges inspect <file>        # how a file would be read (names and shapes, never values)
brazos-of-backcharges call brazos_check '{"backcharges":"<backcharges>"}'
brazos-of-backcharges eval                  # the private eval cases on the fictional fixtures
brazos-of-backcharges demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Notice and deduction rights come from your subcontracts; Brazos checks dates and amounts against the days you set, not the contract language.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
