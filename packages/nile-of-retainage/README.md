# Nile of Retainage (`nile-of-retainage`)

Tracks retainage both ways: what owners hold from you by job and what you hold from subcontractors. Flags retainage at the wrong rate or past a stop point, completed jobs whose retainage is due or overdue to bill, releases billed and not collected, subcontractor retainage released before the owner paid yours, and retainage now owed to a subcontractor. Drafts release requests; releasing money is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y nile-of-retainage demo
npx -y nile-of-retainage mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `receivable` (required) | Retainage receivable by job under --root (CSV, Excel or JSON): job, owner, contract, billed to date, retainage rate, retainage held, optional stop-at percent, release billed, release collected, completion date |
| `payable` | Optional subcontracts with retainage you hold: commitment, job, vendor, invoiced, retainage rate, retainage held, retainage released, status. Procore commitment exports are recognised |
| `settings` | Optional settings JSON (retainage_settings schema): release_days, collect_days, tolerance |

Only `receivable` is required. Each optional file turns on the checks that need it.

## Checks

What `nile_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `release_overdue` | Completed 2026-08-15, 93 days ago; 15000 of retainage has not been billed for release. |
| `release_unpaid` | 18000 of retainage was billed for release and 0 collected; 139 days since completion. |
| `release_owed_to_sub` | The owner has paid the retainage on job 22-050 and Example Paving Co's subcontract is closed; 8000 of their retainage is still held. |
| `rate_off` | Retainage recorded is 36000; 10% of 400000 billed is 40000. Check the pay applications or the contract rate. |
| `over_withheld` | The owner holds 15000; 10% of 100000 (retainage stops at 50% of the contract) is 10000. Ask for the difference on the next pay application. |
| `released_before_owner` | 6000 of retainage was released to Example Storefronts LLC while the owner still holds 18000 on job 23-095. Check the subcontract's pay-when-paid terms; this is cash out ahead of cash in. |
| `release_due` | Completed 2026-08-15; 15000 of retainage can be billed for release once the closeout documents are in. |

<!-- generated:start -->

## A demo run

`npx -y nile-of-retainage demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Nile of Retainage demo (fictional jobs, owners and subcontractors), Auto mode on for drafts

▶ Check retainage receivable and payable
  status: executed  decision: allow
  Owners hold 111000 of your retainage on 6 job(s); you hold 40100 from 5 subcontract(s) (net 70900). 15000 can be billed for release, 18000 billed and not collected, 8000 now owed to subcontractors, 4 to review.
    receivable 23-090  Example School District      15000  collect release_overdue
    receivable 23-095  Sample Retail LLC            18000  collect release_unpaid
    payable    SC-401  Example Paving Co             8000  pay     release_owed_to_sub
    receivable 24-102  Sample County Library        36000  review  rate_off
    receivable 24-103  Example Clinic Annex         15000  review  over_withheld
    payable    SC-301  Example Storefronts LLC          0  review  released_before_owner
    payable    SC-302  Sample Roofing Co            10500  review  rate_off
    receivable 22-050  Sample Parks Department          0  ok      
    receivable 24-101  Example Health Partners      27000  ok      
    payable    SC-201  Sample Mechanical Inc        12000  ok      
    payable    SC-101  Example Concrete LLC          9600  ok      

▶ Explain job 24-103 (retainage stops at 50%)
  status: executed  decision: allow
  receivable 24-103 (Example Clinic Annex, job 24-103): review. Base 150000, rate 10%, held 15000, released 0, outstanding 15000. The owner holds 15000; 10% of 100000 (retainage stops at 50% of the contract) is 10000. Ask for the difference on the next pay application.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: Owners hold 111000 of your retainage on 6 job(s); you hold 40100 from 5 subcontract(s) (net 70900). 15000 can be billed for release, 18000 billed and not collected, 8000 now owed to subcontractors, 4 to review.

▶ Draft the release request for job 23-090 (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  release 23-090 drafted for 15000 with 1 open marker(s) ([ATTACH final lien waivers, warranties, O&M manuals and as-builts required by the contract]). Nothing was sent.

▶ Approve releasing Example Paving retainage: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: move_money stays one-click, even in Auto

▶ Agent tries to pay the retainage itself
  status: blocked  decision: block
  reason: Nile never pays a subcontractor; AP pays after a recorded approval.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `nile_check` | Per job: retainage the owner holds against the contract rate (and a stop-at percent), completed jobs whose retainage is due or overdue to bill, releases billed and not collected. | runs |
| `nile_explain` | Show one job's or subcontract's retainage and every finding. | runs |
| `nile_write_report` | Write the retainage worklist as nile-retainage.csv (one row per item, blank decision columns for people to fill in) and nile-retainage.html into out_dir (default fairbuild-out/nile). | runs |
| `nile_draft_release` | Write drafts/release-<job>.md: a retainage release request to the owner of one completed job, with [ATTACH] for the closeout documents. | asks first (Auto can be opted in) |
| `nile_request_send` | After one named human click (even in Auto), record that the reviewed release draft is approved in release-requests.csv. | one named click, even in Auto (`binding_send`) |
| `nile_request_payment` | After one named human click (even in Auto), record in retainage-release-approvals.csv that a subcontractor's held retainage may be released, up to what Nile shows as owed. | one named click, even in Auto (`move_money`) |
| `ap_pay_retainage` | Nile never pays a subcontractor; AP pays after a recorded approval. | refused |
| `invoice_create` | Nile never creates or submits a retainage invoice. | refused |
| `email_send` | Nile never sends the release request; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Retainage receivable by job (`receivable`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project, Project Number, Contract | Projekt, Chantier, 工事番号, 项目编号 |
| `client` | text | Owner, Customer, Client, Customer Name | Bauherr, Maître d'ouvrage, 発注者, 建设单位 |
| `contract_amount` | amount | Contract Amount, Revised Contract, Contract Value | Auftragssumme, Montant du marché, 請負金額, 合同金额 |
| `billed_to_date` | amount | Billed to Date, Total Billed, Completed and Stored to Date, Billed | Gesamt abgerechnet, Cumul à date, 累計出来高, 累计完成 |
| `retainage_pct` | number | Retainage Percent, Retainage Rate, Retention Rate, Retainage % | Einbehalt %, Retenue de garantie %, 保留率, 质保金比例 |
| `retainage_held` | amount | Retainage Held, Retainage, Retention, Retainage Balance, Retainage Receivable | Einbehalt, Retenue de garantie, 保留金, 质保金 |
| `stop_at_percent` | number | Retainage Stops At, Stop At Percent, Retainage Cap Percent | - |
| `retainage_billed` | amount | Retainage Billed, Release Billed, Retainage Invoiced | Einbehalt abgerechnet, Retenue facturée, 保留金請求額, 已开票保留金 |
| `retainage_collected` | amount | Retainage Collected, Retainage Received, Release Received | Einbehalt erhalten, Retenue encaissée, 保留金入金額, 已收保留金 |
| `completion_date` | date | Completion Date, Substantial Completion, Final Completion, Completed | Fertigstellung, Date de réception, 竣工日, 竣工日期 |
| `percent_complete` | number | Percent Complete, % Complete, Pct Complete | Fertigstellungsgrad, Avancement %, 出来高率, 完工百分比 |

### Subcontract retainage payable (`payable`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `commitment` (required) | text | Commitment, Commitment Number, Number, Contract Number, Subcontract, Subcontract Number | Auftragsnummer NU, N° de commande, 発注番号, 合同编号 |
| `commitment_type` | text | Commitment Type, Type, Contract Type, Doc Type | Vertragsart, Type de contrat, 契約区分, 合同类型 |
| `job` | text | Job, Job Number, Job No, Job #, Job No., Job ID | Projekt, Chantier, 工事番号, 项目编号 |
| `vendor` | text | Vendor, Vendor Name, Subcontractor, Sub, Supplier, Contract Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `cost_code` | text | Cost Code, Costcode, Cost Code Number, Phase, Phase Code, Phase/Cost Code | Leistungsposition, Code de coût, 工種, 成本科目 |
| `cost_type` | text | Cost Type, Category, Cost Category, Cost Class, CostType, Type Code | Kostenart, Nature de coût, 原価区分, 成本类型 |
| `description` | text | Description, Title, Scope, Name | Beschreibung, Description, 摘要, 摘要 |
| `date` | date | Date, Contract Date, PO Date, Issued, Issue Date, Created | Datum, Date, 日付, 日期 |
| `status` | text | Status, Commitment Status, PO Status | Status, Statut, ステータス, 状态 |
| `original_amount` | amount | Original Amount, Original Contract Amount, Original Commitment, Orig Amount, Contract Amount, PO Amount | Ursprüngliche Auftragssumme, Montant initial du marché, 当初契約額, 原合同金额 |
| `approved_changes` | amount | Approved Changes, Approved Change Orders, Approved COs, Change Orders | Genehmigte Nachträge, Avenants validés, 承認済み変更, 已批准变更 |
| `revised_amount` | amount | Revised Amount, Revised Contract Amount, Current Commitment, Revised Commitment, Current Amount, Total Commitment | Aktuelle Auftragssumme, Montant actualisé, 変更後契約額, 调整后合同金额 |
| `invoiced` | amount | Invoiced, Invoiced to Date, Billed to Date, Billed, Invoiced Amount, Received to Date | Abgerechnet, Facturé, 請求済, 已开票 |
| `paid` | amount | Paid, Paid to Date, Payments Issued, Payments, Amount Paid | Bezahlt, Payé, 支払済, 已付款 |
| `retainage_held` | amount | Retainage Held, Retainage, Retention Held, Retainage Withheld | Einbehalt, Retenue de garantie, 保留金, 质保金 |
| `retainage_pct` | number | Retainage %, Retainage Percent, Retention % | Einbehalt %, Retenue de garantie %, 保留率, 质保金比例 |
| `executed` | yes/no | Executed, Signed, Fully Executed, Contract Signed | Unterschrieben, Signé, 契約締結, 已签订 |
| `retainage_released` | amount | Retainage Released, Retainage Paid, Released | Einbehalt freigegeben, Retenue libérée, 保留金解除額, 已释放保留金 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Procore | Commitments tool, export to CSV (subcontracts and purchase orders) | Number, Contract Company, Original Contract Amount | no |
| Buildertrend | Purchase Orders list, export to Excel | PO #, Assigned To, Total | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx nile-of-retainage inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y nile-of-retainage demo
npx -y nile-of-retainage mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "nile-of-retainage": {
      "command": "npx",
      "args": [
        "-y",
        "nile-of-retainage",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add nile-of-retainage -- npx -y nile-of-retainage mcp --root .`, or install the `nile-of-retainage` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `nile-of-retainage approve <id> --as "Your Name"` (or on the local approvals page, `nile-of-retainage approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`nile-of-retainage kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
nile-of-retainage tools                 # every tool, its policy and arguments
nile-of-retainage sources               # the columns each input is read from
nile-of-retainage inspect <file>        # how a file would be read (names and shapes, never values)
nile-of-retainage call nile_check '{"receivable":"<receivable>"}'
nile-of-retainage eval                  # the private eval cases on the fictional fixtures
nile-of-retainage demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Release terms (completion, closeout documents, pay-when-paid) come from your contracts; Nile uses only the dates and amounts in your files.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
