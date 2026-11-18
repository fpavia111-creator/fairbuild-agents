# Seine of Values (`seine-of-values`)

Compares the schedule of values line by line with billing to date and the field percent complete: lines billed ahead of progress, lines billed behind it, a schedule of values that does not add up to the contract, approved change orders with no line, billing on zero-value lines and items entered twice. Drafts the project manager memo. Changing a billing is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y seine-of-values demo
npx -y seine-of-values mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `sov` (required) | Schedule of values with billing to date under --root (CSV, Excel or JSON): job, item, description, scheduled value, completed and stored to date (or previous + this period + stored), and the field percent complete from the project manager |
| `jobs` | Optional job list with the revised contract amount, to check the schedule of values adds up to the contract |
| `change_orders` | Optional change order log; approved change orders must have a line on the schedule of values (matched by change order number in the description) |
| `settings` | Optional settings JSON (sov_settings schema): ahead_pts, behind_pts, tolerance |

Only `sov` is required. Each optional file turns on the checks that need it.

## Checks

What `seine_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `billed_ahead` | Billed 29.69% (19000) with 15% in place in the field: 9400 billed ahead of the work. |
| `billed_behind` | 65% is in place in the field but 48.91% (45000) is billed: 14800 not yet billed. |
| `sov_not_equal_contract` | The schedule of values adds up to 450000; the revised contract is 455000. |
| `co_not_on_sov` | Approved change order CO-001 (5000) has no line on the schedule of values, so it cannot be billed. |
| `billed_on_zero_line` | 2500 billed on a line with no scheduled value. Move it to a priced line or a change order line. |
| `no_field_percent` | 2500 billed with no field percent complete to compare it with. |

<!-- generated:start -->

## A demo run

`npx -y seine-of-values demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Seine of Values demo (fictional jobs and schedule of values), Auto mode on for drafts

▶ Compare two schedules of values with billing and the field
  status: executed  decision: allow
  13 schedule of values line(s) on 2 job(s), 393300 billed of 710000. 2 line(s) billed ahead of the field (16200), 2 behind it (41800 not yet billed), 2 to review.
    24-101 4    Drywall and framing             29.69   15  ahead   billed_ahead
    24-101 6    Doors and hardware              77.78   40  ahead   billed_ahead
    24-101 5    Electrical                      48.91   65  behind  billed_behind
    24-102 2    Membrane roofing                57.14   70  behind  billed_behind
    24-101 JOB  Schedule of values as a whole    55.7       review  sov_not_equal_contract, co_not_on_sov
    24-102 4    Final cleanup                               review  billed_on_zero_line, no_field_percent
    24-101 1    General conditions                 60   60  ok      
    24-101 2    Cast-in-place concrete             75   80  ok      
    24-101 3    Rough carpentry                 95.45   95  ok      
    24-101 7    Painting                           40   40  ok      
    24-101 8    Change order CO-002 lighting     37.5   40  ok      
    24-101 9    Sitework                           30   30  ok      
    24-102 1    Mobilization                      100  100  ok      
    24-102 3    Sheet metal                         0    0  ok      

▶ Explain the drywall line
  status: executed  decision: allow
  24-101 4 Drywall and framing: ahead. Scheduled 64000, billed 19000 (29.69%), field 15%. Billed 29.69% (19000) with 15% in place in the field: 9400 billed ahead of the work.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 13 schedule of values line(s) on 2 job(s), 393300 billed of 710000. 2 line(s) billed ahead of the field (16200), 2 behind it (41800 not yet billed), 2 to review.

▶ Draft the memo for job 24-101 (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  memo 24-101 drafted with 2 open marker(s) ([TO CONFIRM your name], [TO CONFIRM project manager]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to change the billing itself
  status: blocked  decision: block
  reason: Seine never changes a billing, a schedule of values or a pay application.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `seine_check` | Per line: percent billed against field percent complete (billed ahead or behind beyond your thresholds, with the amount), billing on zero-value lines, items entered twice. | runs |
| `seine_explain` | Show one line's scheduled value, billing, field percent and every finding. | runs |
| `seine_write_report` | Write the schedule of values worklist as seine-sov.csv (one row per item, blank decision columns for people to fill in) and seine-sov.html into out_dir (default fairbuild-out/seine). | runs |
| `seine_draft_memo` | Write drafts/memo-<job>.md: the lines of one job billed ahead or behind the field, for the project manager to confirm before the next pay application. | asks first (Auto can be opted in) |
| `seine_request_send` | After one named human click (even in Auto), record that the reviewed memo draft is approved in memo-requests.csv. | one named click, even in Auto (`binding_send`) |
| `billing_update` | Seine never changes a billing, a schedule of values or a pay application. | refused |
| `payapp_submit` | Seine never submits a pay application. | refused |
| `email_send` | Seine never sends the memo; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Schedule of values with billing (`sov`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` | text | Job, Job Number, Job No, Job #, Job No., Job ID | Projekt, Chantier, 工事番号, 项目编号 |
| `application` | text | Application, Application Number, Application No, Pay App, Pay App Number, App # | Abschlagsrechnung Nr., N° de situation, 出来高請求番号, 进度款申请号 |
| `period_to` | date | Period To, Period Ending, Period End, Through Date | Leistungszeitraum bis, Période au, 対象期間末, 截止日期 |
| `item` (required) | text | Item, Item No, Item Number, Line, Line Item, Line Number | Position, Ligne, 明細番号, 行号 |
| `description` | text | Description, Description of Work, Scope, Line Description | Beschreibung, Description, 摘要, 摘要 |
| `scheduled_value` | amount | Scheduled Value, Scheduled Values, Contract Value, SOV Amount, Budget | Vertragswert der Position, Montant du poste, 契約内訳金額, 分项合同金额 |
| `previous` | amount | From Previous Application, Previous, Previously Completed, Work Completed Previous, Previous Applications, Prior Billed | Bisher abgerechnet, Cumul précédent, 前回までの出来高, 上期累计 |
| `this_period` | amount | This Period, Work Completed This Period, Current Billing, This Application, Billed This Period | Dieser Abschlag, Ce mois, 今回出来高, 本期完成 |
| `stored_materials` | amount | Materials Presently Stored, Stored Materials, Materials Stored, Stored | Gelagertes Material, Approvisionnements, 搬入材料, 现场材料 |
| `completed_stored` | amount | Total Completed and Stored, Completed and Stored to Date, Total Completed, Billed to Date | Gesamt abgerechnet, Cumul à date, 累計出来高, 累计完成 |
| `percent` | number | %, Percent, % (G / C), Percent Complete, % Complete | Fertigstellungsgrad, Avancement %, 出来高率, 完工百分比 |
| `balance` | amount | Balance to Finish, Balance, Remaining | Saldo, Solde, 残高, 余额 |
| `retainage` | amount | Retainage, Retainage Amount, Retention | Einbehalt, Retenue de garantie, 保留金, 质保金 |
| `field_percent` | number | Field Percent, Field % Complete, PM % Complete, Physical % Complete | Baustellenfortschritt %, Avancement chantier %, 現場出来高率, 现场进度 % |

### Jobs and contract amounts (`jobs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Job No, Job #, Job No., Job ID | Projekt, Chantier, 工事番号, 项目编号 |
| `job_name` | text | Job Name, Project Name, Job Description, Description, Title | Projektname, Nom du chantier, 工事名, 项目名称 |
| `client` | text | Customer, Owner, Client, Customer Name, Owner Name, Bill To | Bauherr, Maître d'ouvrage, 発注者, 建设单位 |
| `contract_amount` | amount | Contract Amount, Revised Contract, Revised Contract Amount, Contract Value, Contract Total, Current Contract | Auftragssumme, Montant du marché, 請負金額, 合同金额 |
| `estimated_cost` | amount | Estimated Cost, Revised Estimated Cost, Total Estimated Cost, Current Estimate, Estimated Cost at Completion, EAC | Kalkulierte Kosten, Coût prévisionnel, 実行予算, 预计总成本 |
| `start_date` | date | Start Date, Start, Notice to Proceed, NTP Date | Eintrittsdatum, Date d'entrée, 入社日, 入职日期 |
| `completion_date` | date | Completion Date, Substantial Completion, Substantial Completion Date, Finish Date, Completed | Fertigstellung, Date de réception, 竣工日, 竣工日期 |
| `status` | text | Status, Job Status, Project Status, Stage | Status, Statut, ステータス, 状态 |
| `project_manager` | text | Project Manager, PM, Manager | Projektleiter, Conducteur de travaux, 工事責任者, 项目经理 |
| `retainage_pct` | number | Retainage %, Retainage Percent, Retention %, Retainage Rate, Retention Rate | Einbehalt %, Retenue de garantie %, 保留率, 质保金比例 |
| `bonded` | yes/no | Bonded, Bond, Bond Required, P&P Bond | Bürgschaft, Caution, 履行保証, 履约保函 |
| `tax_exempt` | yes/no | Tax Exempt, Exempt, Tax Status | Steuerbefreit, Exonéré, 非課税, 免税 |

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

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx seine-of-values inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y seine-of-values demo
npx -y seine-of-values mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "seine-of-values": {
      "command": "npx",
      "args": [
        "-y",
        "seine-of-values",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add seine-of-values -- npx -y seine-of-values mcp --root .`, or install the `seine-of-values` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `seine-of-values approve <id> --as "Your Name"` (or on the local approvals page, `seine-of-values approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`seine-of-values kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
seine-of-values tools                 # every tool, its policy and arguments
seine-of-values sources               # the columns each input is read from
seine-of-values inspect <file>        # how a file would be read (names and shapes, never values)
seine-of-values call seine_check '{"sov":"<sov>"}'
seine-of-values eval                  # the private eval cases on the fictional fixtures
seine-of-values demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Field percent complete is the project manager's estimate as given in the file; Seine does not measure progress.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
