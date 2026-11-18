# Zambezi of Permits (`zambezi-of-permits`)

Keeps permits and inspections by job in view: permits expired or expiring, failed inspections with no re-inspection booked, inspections past their date with no result, inspections on permits you have no record of, and what is coming up. Writes a calendar file and drafts notices to the project manager. Dealing with the jurisdiction is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y zambezi-of-permits demo
npx -y zambezi-of-permits mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `permits` (required) | Permit log under --root (CSV, Excel or JSON): permit number, job, type, jurisdiction, issued, expires, status |
| `inspections` | Optional inspection log: job, permit, inspection type, scheduled date, result, completed date. Procore inspection exports are recognised by their columns |
| `settings` | Optional settings JSON (permit_settings schema): expiring_days, upcoming_days, reminder_days |

Only `permits` is required. Each optional file turns on the checks that need it.

## Checks

What `zambezi_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `failed_no_reinspection` | Framing on job 24-101 failed on 2026-11-05 and no re-inspection is booked. |
| `permit_expired` | Roofing permit RP-2026-0090 expired on 2026-10-15 and is not closed out. Renew it or close it out with Sample County. |
| `inspection_overdue` | Roof final was scheduled for 2026-11-10 and has no result 6 day(s) later. Record the result or rebook it. |
| `permit_missing` | Inspection "Mechanical rough" is on permit MP-2026-0999, which is not in your permit log. Check the permit was pulled. |
| `inspection_upcoming` | Mechanical rough on 2026-11-25, in 9 day(s). |
| `permit_expiring` | Electrical permit EP-2026-0333 expires on 2026-12-01, in 15 day(s). |

<!-- generated:start -->

## A demo run

`npx -y zambezi-of-permits demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Zambezi of Permits demo (fictional permits and inspections), Auto mode on for drafts

▶ Check permits and inspections on two jobs
  status: executed  decision: allow
  4 permit(s) and 7 inspection(s) as of 2026-11-16: 4 need action (expired permits, failed inspections not rebooked, overdue results, unknown permits), 2 coming up. 5 calendar event(s).
    inspection 24-101 Framing 2026-11-05              action failed_no_reinspection
    permit     RP-2026-0090                           action permit_expired
    inspection 24-102 Roof final 2026-11-10           action inspection_overdue
    inspection 24-102 Mechanical rough 2026-11-25     action permit_missing, inspection_upcoming
    inspection 24-101 Rough electrical 2026-11-20     soon   inspection_upcoming
    permit     EP-2026-0333                           soon   permit_expiring
    inspection 24-101 Footing 2026-06-10              ok     
    permit     BP-2026-0141                           ok     
    inspection 24-102 Underground plumbing 2026-10-01 ok     
    inspection 24-102 Underground plumbing 2026-10-08 ok     
    permit     PP-2026-0212                           ok     

▶ Explain the roofing permit
  status: executed  decision: allow
  permit RP-2026-0090 (job 24-102): action. Date 2026-10-15. Roofing permit RP-2026-0090 expired on 2026-10-15 and is not closed out. Renew it or close it out with Sample County.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 4 permit(s) and 7 inspection(s) as of 2026-11-16: 4 need action (expired permits, failed inspections not rebooked, overdue results, unknown permits), 2 coming up. 5 calendar event(s).

▶ Write the calendar file
  status: executed  decision: allow
  Calendar written with 5 event(s). Nothing was sent.

▶ Draft a notice for job 24-102 (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  notice 24-102 drafted with 2 open marker(s) ([TO CONFIRM project manager], [TO CONFIRM your name]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to book an inspection itself
  status: blocked  decision: block
  reason: Zambezi never books or cancels an inspection.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `zambezi_check` | Per permit: expired or expiring. | runs |
| `zambezi_explain` | Show one permit or inspection with every finding. | runs |
| `zambezi_write_report` | Write the permit and inspection worklist as zambezi-permits.csv (one row per item, blank decision columns for people to fill in) and zambezi-permits.html into out_dir (default fairbuild-out/zambezi). | runs |
| `zambezi_write_calendar` | Write zambezi-calendar.ics into out_dir (default fairbuild-out/zambezi): one all-day event per permit expiration and per booked inspection without a result, with reminders. | runs |
| `zambezi_draft_notice` | Write drafts/notice-<job>.md: a notice to one job's project manager listing permits to renew or close and inspections to rebook or record. | asks first (Auto can be opted in) |
| `zambezi_request_send` | After one named human click (even in Auto), record that the reviewed notice draft is approved in notice-requests.csv. | one named click, even in Auto (`binding_send`) |
| `permit_portal_submit` | Zambezi never applies for, renews or closes a permit with a jurisdiction. | refused |
| `inspection_schedule` | Zambezi never books or cancels an inspection. | refused |
| `email_send` | Zambezi never sends the notice; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Permit log (`permits`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `permit_number` (required) | text | Permit Number, Permit, Permit No, Permit # | Genehmigung, Permis, 許可番号, 许可证号 |
| `job` | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `type` | text | Type, Permit Type, Trade, Discipline | Typ, Type, 種類, 类型 |
| `jurisdiction` | text | Jurisdiction, Authority, City, County, Issuing Authority, AHJ | Steuergebiet, Juridiction fiscale, 課税地域, 税收管辖区 |
| `issued` | date | Issued, Issue Date, Issued Date, Date Issued | Datum, Date, 日付, 日期 |
| `expires` | date | Expires, Expiration, Expiration Date, Expiry, Valid Until | Ablaufdatum, Date d'expiration, 有効期限, 到期日 |
| `status` | text | Status, Permit Status | Status, Statut, ステータス, 状态 |

### Inspection log (`inspections`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `permit_number` | text | Permit Number, Permit, Permit No, Permit # | Genehmigung, Permis, 許可番号, 许可证号 |
| `inspection_type` (required) | text | Inspection Type, Inspection, Type, Description | Abnahme, Contrôle, 検査, 验收 |
| `scheduled_date` | date | Scheduled Date, Scheduled, Inspection Date, Date, Requested Date | Datum, Date, 日付, 日期 |
| `result` | text | Result, Outcome, Status, Inspection Result | Ergebnis, Résultat, 結果, 结果 |
| `completed_date` | date | Completed Date, Completed, Result Date, Inspected On | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx zambezi-of-permits inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y zambezi-of-permits demo
npx -y zambezi-of-permits mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "zambezi-of-permits": {
      "command": "npx",
      "args": [
        "-y",
        "zambezi-of-permits",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add zambezi-of-permits -- npx -y zambezi-of-permits mcp --root .`, or install the `zambezi-of-permits` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `zambezi-of-permits approve <id> --as "Your Name"` (or on the local approvals page, `zambezi-of-permits approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`zambezi-of-permits kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
zambezi-of-permits tools                 # every tool, its policy and arguments
zambezi-of-permits sources               # the columns each input is read from
zambezi-of-permits inspect <file>        # how a file would be read (names and shapes, never values)
zambezi-of-permits call zambezi_check '{"permits":"<permits>"}'
zambezi-of-permits eval                  # the private eval cases on the fictional fixtures
zambezi-of-permits demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Zambezi reads your permit and inspection logs. It does not check a jurisdiction's portal; a permit can expire on other rules (no inspection in a set time) that only the jurisdiction knows.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
