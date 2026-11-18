# Fairbuild Pay Applications (`fairbuild-pay-applications`)

Checks the arithmetic of a pay application in the G702/G703 layout, yours or a subcontractor's: each line's completed and stored total, percent and balance, retainage at your rates, lines billed past their scheduled value, previous work against the last application, and the summary page down to the payment due. Drafts a correction note. Submitting and approving pay applications is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-pay-applications demo
npx -y fairbuild-pay-applications mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `lines` (required) | Continuation sheet (G703 layout) of the pay application under --root (CSV, Excel or JSON): item, description, scheduled value, from previous applications, this period, materials stored, completed and stored to date, percent, balance to finish, retainage |
| `summary` | Optional summary page (G702 layout) as JSON (payapp_summary schema): original contract sum, net change orders, contract sum to date, total completed and stored, total retainage, total earned less retainage, less previous certificates, current payment due, balance to finish |
| `previous` | Optional continuation sheet of the last application, to check "from previous applications" and previous certificates |
| `settings` | Optional settings JSON (payapp_settings schema): retainage_pct, stored_retainage_pct, percent_tolerance, tolerance |

Only `lines` is required. Each optional file turns on the checks that need it.

## Checks

What `pay_apps_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `current_due_off` | Line 8 current payment due (line 6 - line 7): the summary says 72220; it should be 71220. |
| `line_total_off` | Completed and stored to date says 19000; previous 0 + this period 9000 + stored 9000 is 18000. |
| `retainage_line_off` | Retainage says 900; 10% of work completed 12000 is 1200. |
| `previous_mismatch` | From previous applications says 12000; the last application showed 14000 completed and stored on this line. |
| `over_100` | Completed and stored 20000 is more than the scheduled value 18000 by 2000. Move the overage to a change order line or reduce the billing. |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-pay-applications demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Pay Applications demo (a fictional application 7 on job 24-101), Auto mode on for drafts

▶ Check application 7 against its summary page and application 6
  status: executed  decision: allow
  9 line(s), 450000 scheduled, 256800 completed and stored (57.1%), retainage 25380 (25680 at your rates). 4 item(s) with arithmetic errors, 1 line(s) billed past their scheduled value; summary page checked; checked against the last application.
    G702  Summary page                    256800  error  current_due_off
    4     Drywall and framing              19000  error  line_total_off
    7     Painting                         12000  error  retainage_line_off
    9     Sitework                         12000  error  previous_mismatch
    6     Doors and hardware               20000  over   over_100
    1     General conditions               28800  ok     
    2     Cast-in-place concrete           96000  ok     
    3     Rough carpentry                  21000  ok     
    5     Electrical                       45000  ok     
    8     Change order CO-002 lighting      3000  ok     

▶ Explain line 4
  status: executed  decision: allow
  Line 4 Drywall and framing: error. Scheduled 64000, previous 0, this period 9000, stored 9000, completed and stored 19000, retainage 1900. Completed and stored to date says 19000; previous 0 + this period 9000 + stored 9000 is 18000.

▶ Write the check
  status: executed  decision: allow
  Worklist written: 9 line(s), 450000 scheduled, 256800 completed and stored (57.1%), retainage 25380 (25680 at your rates). 4 item(s) with arithmetic errors, 1 line(s) billed past their scheduled value; summary page checked; checked against the last application.

▶ Draft the correction note (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  corrections 24-101 application 7 drafted with 1 open marker(s) ([TO CONFIRM your name]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to submit the pay application itself
  status: blocked  decision: block
  reason: Fairbuild Pay Applications never submits a pay application to an owner or a portal.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `pay_apps_check` | Every continuation sheet line: completed and stored = previous + this period + stored, percent = G / C, balance = C - G, retainage at your rates on work and on stored materials, billing past the scheduled value, and p… | runs |
| `pay_apps_explain` | Show one line's columns and every arithmetic finding. | runs |
| `pay_apps_write_report` | Write the pay application check as pay-applications.csv (one row per item, blank decision columns for people to fill in) and pay-applications.html into out_dir (default fairbuild-out/pay-applications). | runs |
| `pay_apps_draft_corrections` | Write drafts/corrections-<label>.md: a note to whoever prepared the pay application (your biller or a subcontractor) listing every line that does not add up. | asks first (Auto can be opted in) |
| `pay_apps_request_send` | After one named human click (even in Auto), record that the reviewed corrections draft is approved in corrections-requests.csv. | one named click, even in Auto (`binding_send`) |
| `payapp_submit` | Fairbuild Pay Applications never submits a pay application to an owner or a portal. | refused |
| `payapp_approve` | Fairbuild Pay Applications never approves a subcontractor pay application for payment. | refused |
| `email_send` | Fairbuild Pay Applications never sends the correction note; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Continuation sheet (G703 layout) (`lines`)

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

### Last application's continuation sheet (`previous`)

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

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-pay-applications inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-pay-applications demo
npx -y fairbuild-pay-applications mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-pay-applications": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-pay-applications",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-pay-applications -- npx -y fairbuild-pay-applications mcp --root .`, or install the `fairbuild-pay-applications` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-pay-applications approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-pay-applications approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-pay-applications kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-pay-applications tools                 # every tool, its policy and arguments
fairbuild-pay-applications sources               # the columns each input is read from
fairbuild-pay-applications inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-pay-applications call pay_apps_check '{"lines":"<lines>"}'
fairbuild-pay-applications eval                  # the private eval cases on the fictional fixtures
fairbuild-pay-applications demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Fairbuild Pay Applications checks arithmetic and consistency. Whether the work billed is in place is for the architect, owner or your project manager to confirm.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
