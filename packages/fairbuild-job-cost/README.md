# Fairbuild Job Cost (`fairbuild-job-cost`)

Compares job cost with the budget by job, cost code and cost type: lines over or projected over budget, committed cost over budget, spend running ahead of percent complete, cost on codes or jobs with no budget, and budget math. Writes a worklist and drafts the cost review memo. Changing budgets and job cost is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-job-cost demo
npx -y fairbuild-job-cost mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `budget` (required) | Budget by job and cost code under --root (CSV, Excel or JSON): original budget, approved changes, revised budget, and optionally committed, cost to date, cost to complete, projected cost and percent complete. Procore, Vista and QuickBooks budget layouts are recognised |
| `costs` | Optional job cost detail (one row per cost transaction): job, cost code, cost type, amount. Sage 300, Sage 100 Contractor, Foundation and Vista layouts are recognised. When given, cost to date comes from it and is tied to the budget report |
| `commitments` | Optional subcontract and PO list, used for committed cost when the budget file has no committed column |
| `settings` | Optional settings JSON (cost_settings schema): variance_pct, variance_amount, burn_gap_pts, tolerance, code_aliases, job |

Only `budget` is required. Each optional file turns on the checks that need it.

## What it refuses, and what waits for a person

Refused in every mode (the tool is listed so an assistant can see it, and every call is blocked):

- `budget_update`: Fairbuild Job Cost never changes a budget or moves budget between cost codes; accounting enters approved budget transfers.
- `cost_recode`: Fairbuild Job Cost never recodes or reverses job cost entries.
- `email_send`: Fairbuild Job Cost never sends the memo; a person sends the approved draft.

Waits for one named person's click, even in Auto mode (nothing is sent, paid or posted by the agent; the click is recorded for the person who acts):

- `job_cost_request_send`: Approve the memo (one click)

## Checks

What `job_cost_check` flags, each with the first example it finds in the fictional fixtures (the eval cases for `job_cost_check`):

| Code | Example from the fixtures |
|---|---|
| `over_budget` | Cost to date 25400 is over the revised budget 22000 by 3400. |
| `projected_over` | Projected cost 26900 is over the revised budget 22000 by 4900 (22.3%). |
| `committed_over` | Committed cost 131500 is over the revised budget 128000 by 3500. |
| `unbudgeted_cost` | 4200 of cost (1 row(s)) is coded to 31-000 on job 24-101, which has no budget line for that code. Recode it or add the code to the budget. |
| `no_budget_job` | 1300 of cost (1 row(s)) is coded to job 24-199, which is not in the budget file. Check the job number. |
| `burn_ahead` | 28.1% of the budget is spent at 10% complete, 18.1 points ahead of progress. Ask the project manager for the cost to complete. |
| `revised_math` | Original 85000 plus approved changes 5000 is 90000; the revised budget says 92000. |
| `detail_does_not_tie` | Cost detail adds up to 12850 (2 row(s)); the budget report shows 12000 to date. Check for costs posted after the budget report was run, or coded to this line by mistake. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-job-cost demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Job Cost demo (fictional jobs, vendors and costs), Auto mode on for drafts

▶ Compare job cost with the budget on two jobs
  status: executed  decision: allow
  7 budget line(s) on 2 job(s): 2 over or projected over budget (overrun 8400), 1 running ahead of progress, 1 with budget math errors, 4200 on codes with no budget, 1300 on jobs not in the budget.
    24-101 06-100 M         22000    25400  over       over_budget, projected_over
    24-101 03-300 S        128000    96000  over       committed_over, projected_over
    24-101 31-000 S             0     4200  unbudgeted unbudgeted_cost
    24-199 01-500 L             0     1300  unbudgeted no_budget_job
    24-101 09-250 S         64000    18000  review     burn_ahead
    24-101 26-000 S         92000    45000  review     revised_math
    24-102 01-500 L         30000    12850  review     detail_does_not_tie
    24-101 01-500 L         48000    30600  ok         
    24-102 07-500 S        210000   150000  ok         

▶ Explain the rough carpentry line
  status: executed  decision: allow
  24-101 06-100 M Rough carpentry: over. Revised budget 22000, committed 9000, to date 25400, projected 26900, 115.5% spent at 90% complete. Cost to date 25400 is over the revised budget 22000 by 3400. Projected cost 26900 is over the revised budget 22000 by 4900 (22.3%).

▶ Read the same budget from a Procore export
  status: executed  decision: allow
  5 budget line(s) on 1 job(s): 2 over or projected over budget (overrun 8400), 0 running ahead of progress, 1 with budget math errors, 0 on codes with no budget, 0 on jobs not in the budget.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 7 budget line(s) on 2 job(s): 2 over or projected over budget (overrun 8400), 1 running ahead of progress, 1 with budget math errors, 4200 on codes with no budget, 1300 on jobs not in the budget.

▶ Draft the cost review memo for job 24-101 (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  memo 24-101 drafted with 1 open marker(s) ([TO CONFIRM project manager]). Nothing was sent.

▶ Approve sending the memo: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to change the budget itself
  status: blocked  decision: block
  reason: Fairbuild Job Cost never changes a budget or moves budget between cost codes; accounting enters approved budget transfers.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `job_cost_check` | Per job, cost code and cost type: cost to date, committed and projected cost against the revised budget; spend running ahead of percent complete; cost on codes or jobs with no budget; budget math (original plus approv… | runs |
| `job_cost_explain` | Show one budget line's budget, committed, to-date and projected cost with every finding. | runs |
| `job_cost_write_report` | Write the job cost worklist as job-cost.csv (one row per item, blank decision columns for people to fill in) and job-cost.html into out_dir (default fairbuild-out/job-cost). | runs |
| `job_cost_draft_memo` | Write drafts/memo-<job>.md: the cost review memo for one job to its project manager, with every line over, projected over or running ahead of progress, and [TO CONFIRM] where the PM's explanation goes. | asks first (Auto can be opted in) |
| `job_cost_request_send` | After one named human click (even in Auto), record that the reviewed memo draft is approved in memo-requests.csv. | one named click, even in Auto (`binding_send`) |
| `budget_update` | Fairbuild Job Cost never changes a budget or moves budget between cost codes; accounting enters approved budget transfers. | refused |
| `cost_recode` | Fairbuild Job Cost never recodes or reverses job cost entries. | refused |
| `email_send` | Fairbuild Job Cost never sends the memo; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Budget by cost code (`budget`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` | text | Job, Job Number, Job No, Job #, Job No., Job ID | Projekt, Chantier, 工事番号, 项目编号 |
| `cost_code` (required) | text | Cost Code, Costcode, Cost Code Number, Phase, Phase Code, Phase/Cost Code | Leistungsposition, Code de coût, 工種, 成本科目 |
| `cost_code_name` | text | Cost Code Description, Cost Code Name, Phase Description, Description, Item Description | Kostenart Bezeichnung, Libellé du poste, 工種名, 成本科目名称 |
| `cost_type` | text | Cost Type, Category, Cost Category, Cost Class, CostType, Type Code | Kostenart, Nature de coût, 原価区分, 成本类型 |
| `original_budget` | amount | Original Budget, Original Budget Amount, Original Estimate, Orig Est Cost, OrigEstCost, Est. Cost | Ursprüngliches Budget, Budget initial, 当初予算, 原始预算 |
| `approved_changes` | amount | Approved Changes, Approved COs, Approved Change Orders, Budget Changes, Budget Modifications, Change Orders | Genehmigte Nachträge, Avenants validés, 承認済み変更, 已批准变更 |
| `revised_budget` | amount | Revised Budget, Current Budget, Revised Estimate, Curr Est Cost, CurrEstCost, Current Estimate | Aktuelles Budget, Budget révisé, 変更後予算, 调整后预算 |
| `committed` | amount | Committed, Committed Costs, Committed Cost, Commitments, Total Cmtd Cost, TotalCmtdCost | Beauftragt, Engagé, 発注済, 已承诺 |
| `actual` | amount | Actual, Actual Cost, Actual Costs, Cost to Date, Job to Date Costs, JTD Cost | Ist-Kosten, Réalisé, 実績, 实际成本 |
| `estimate_to_complete` | amount | Estimate to Complete, Cost to Complete, ETC, Forecast to Complete, Remaining Cost | Restkosten, Reste à dépenser, 残予算, 待发生成本 |
| `projected` | amount | Projected, Projected Cost, Projected Costs, Estimated Cost at Completion, Forecast, EAC | Prognose, Prévision, 見込原価, 预计成本 |
| `percent_complete` | number | Percent Complete, % Complete, Pct Complete, Complete % | Fertigstellungsgrad, Avancement %, 出来高率, 完工百分比 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Procore | Budget tab, export to CSV | Cost Code, Original Budget Amount, Revised Budget | no |
| Viewpoint Vista | JC estimates by phase and cost type (list export with field names) | Phase, CostType, OrigEstCost | no |
| QuickBooks Desktop (Contractor edition) | Job Estimates vs. Actuals Detail report (CSV or Excel) | Item, Est. Cost, Act. Cost | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Job cost detail (`costs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Job No, Job #, Job No., Job ID | Projekt, Chantier, 工事番号, 项目编号 |
| `cost_code` | text | Cost Code, Costcode, Cost Code Number, Phase, Phase Code, Phase/Cost Code | Leistungsposition, Code de coût, 工種, 成本科目 |
| `cost_type` | text | Cost Type, Category, Cost Category, Cost Class, CostType, Type Code | Kostenart, Nature de coût, 原価区分, 成本类型 |
| `date` | date | Date, Transaction Date, Accounting Date, Posting Date, Posted, GL Date | Datum, Date, 日付, 日期 |
| `source` | text | Source, Tran Type, Transaction Type, Trans Type, Type, Journal | Herkunft, Origine, 発生元, 来源 |
| `vendor` | text | Vendor, Vendor Name, Subcontractor, Sub, Supplier, Contract Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `reference` | text | Reference, Ref, Document, Document Number, Invoice, Invoice Number | Referenz, Référence, 参照番号, 参考号 |
| `description` | text | Description, Memo, Line Description, Detail, Notes | Beschreibung, Description, 摘要, 摘要 |
| `amount` (required) | amount | Amount, Cost, Actual Cost, ActualCost, Total, Extended Cost | Betrag, Montant, 金額, 金额 |
| `hours` | number | Hours, Units, Actual Hours, ActualHours, Qty, Quantity | Stunden, Heures, 時間, 工时 |
| `commitment` | text | Commitment, PO, PO Number, Purchase Order, Subcontract, Contract Number | Auftragsnummer NU, N° de commande, 発注番号, 合同编号 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Sage 300 Construction and Real Estate | Job cost detail report exported to Excel or CSV | Job, Cost Code, Category, Tran Type, Amount | no |
| Sage 100 Contractor | Job cost records exported from the job cost journal | Job, Cost Type, Trn Date, Amount | no |
| Foundation Software | Job cost detail export | Job No, Cost Code, Cost Class, Amount | no |
| Viewpoint Vista | JC cost detail (list export with field names) | Phase, CostType, ActualCost, ActualDate | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Subcontracts and purchase orders (`commitments`)

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

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Procore | Commitments tool, export to CSV (subcontracts and purchase orders) | Number, Contract Company, Original Contract Amount | no |
| Buildertrend | Purchase Orders list, export to Excel | PO #, Assigned To, Total | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-job-cost inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-job-cost demo
npx -y fairbuild-job-cost mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-job-cost": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-job-cost",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-job-cost -- npx -y fairbuild-job-cost mcp --root .`, or install the `fairbuild-job-cost` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-job-cost approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-job-cost approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-job-cost kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-job-cost tools                 # every tool, its policy and arguments
fairbuild-job-cost sources               # the columns each input is read from
fairbuild-job-cost inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-job-cost call job_cost_check '{"budget":"<budget>"}'
fairbuild-job-cost eval                  # the private eval cases on the fictional fixtures
fairbuild-job-cost demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Projected cost is the budget file's own projection, or cost to date plus the cost to complete it gives. Fairbuild Job Cost does not estimate cost to complete itself.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
