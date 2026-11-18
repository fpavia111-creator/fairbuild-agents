# Oder of Submittals (`oder-of-submittals`)

Works the submittal register back from the date material is needed on site: submittals not submitted by their latest submit date, reviews over their allowed days, revise-and-resubmit not resubmitted, third and later revisions, approvals after the order-by date and spec sections with no submittal, with ball-in-court aging. Drafts reminders. Approving submittals is the design team's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y oder-of-submittals demo
npx -y oder-of-submittals mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `submittals` (required) | Submittal register under --root (CSV, Excel or JSON): number, revision, spec section, title, responsible contractor, status, ball in court, submitted and returned dates, required on-site date, lead time days, review days. Procore submittal log exports are recognised |
| `specs` | Optional list of spec sections that need submittals, to find sections with none |
| `settings` | Optional settings JSON (submittal_settings schema): review_days, resubmit_days, loop_revision |

Only `submittals` is required. Each optional file turns on the checks that need it.

## Checks

What `oder_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `submit_late` | Not submitted yet; to have it on site by 2026-12-15 with 42 day(s) lead time and 10 review day(s), it had to be submitted by 2026-10-24. |
| `review_overdue` | With Architect for 27 days since 2026-10-20; 10 review day(s) allowed. Order-by date is 2026-11-20. |
| `resubmit_overdue` | Returned "Revise and resubmit" on 2026-10-08 and not resubmitted after 39 days. |
| `resubmittal_loop` | Revision 2: this is submission 3. Meet with the reviewer and Test Drywall Co to settle the comments. |
| `approved_too_late` | Approved 2026-09-10, after the order-by date 2026-09-01: with 30 day(s) lead time it cannot be on site by 2026-10-01. Check the delivery date with Example Electric Inc. |
| `no_submittal_for_section` | Spec section 07 92 00 Joint sealants has no submittal in the register. |

<!-- generated:start -->

## A demo run

`npx -y oder-of-submittals demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Oder of Submittals demo (a fictional submittal register), Auto mode on for drafts

▶ Check the submittal register against site dates
  status: executed  decision: allow
  6 submittal(s) as of 2026-11-16: 3 late against the site dates (not submitted in time, reviews or resubmittals overdue), 3 to review, 1 in progress, 1 done. 2 spec section(s) with no submittal.
    S-083323-01  08 33 23  Overhead coiling doors           order by 2026-11-03 late        submit_late
    S-081113-01  08 11 13  Hollow metal doors and frames    order by 2026-11-20 late        review_overdue
    S-092900-01  09 29 00  Gypsum board                     order by 2026-12-27 late        resubmit_overdue, resubmittal_loop
    S-260500-01  26 05 00  Electrical gear                  order by 2026-09-01 review      approved_too_late
    -            07 92 00  Joint sealants                   order by            review      no_submittal_for_section
    -            22 40 00  Plumbing fixtures                order by            review      no_submittal_for_section
    S-233000-01  23 30 00  HVAC ductwork                    order by 2027-01-02 in_progress 
    S-033000-01  03 30 00  Concrete mix designs             order by 2026-06-08 done        

▶ Explain the coiling doors
  status: executed  decision: allow
  S-083323-01 08 33 23 Overhead coiling doors (Sample Door Supply): late, with Subcontractor ? day(s). Needed on site 2026-12-15, order by 2026-11-03, submit by 2026-10-24. Not submitted yet; to have it on site by 2026-12-15 with 42 day(s) lead time and 10 review day(s), it had to be submitted by 2026-10-24.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 6 submittal(s) as of 2026-11-16: 3 late against the site dates (not submitted in time, reviews or resubmittals overdue), 3 to review, 1 in progress, 1 done. 2 spec section(s) with no submittal.

▶ Draft a reminder to the architect (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  reminder Architect drafted with 2 open marker(s) ([TO CONFIRM contact at Architect], [TO CONFIRM your name and company]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to approve a submittal itself
  status: blocked  decision: block
  reason: Oder never approves, returns or changes a submittal.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `oder_check` | Per submittal (latest revision): order-by and latest submit dates worked back from the required on-site date, lead time and review time; not submitted in time; review running over; revise-and-resubmit not resubmitted;… | runs |
| `oder_explain` | Show one submittal's dates, ball in court and every finding. | runs |
| `oder_write_report` | Write the submittal worklist as oder-submittals.csv (one row per item, blank decision columns for people to fill in) and oder-submittals.html into out_dir (default fairbuild-out/oder). | runs |
| `oder_draft_reminder` | Write drafts/reminder-<party>.md: the late submittals sitting with one party (architect, engineer or subcontractor), with the dates material is needed on site. | asks first (Auto can be opted in) |
| `oder_request_send` | After one named human click (even in Auto), record that the reviewed reminder draft is approved in reminder-requests.csv. | one named click, even in Auto (`binding_send`) |
| `submittal_approve` | Oder never approves, returns or changes a submittal. | refused |
| `procore_update` | Oder never writes to your project management system. | refused |
| `email_send` | Oder never sends the reminder; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Submittal register (`submittals`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `submittal` (required) | text | Submittal, Submittal Number, Number, #, Submittal # | Referenz, Référence, 参照番号, 参考号 |
| `revision` | number | Revision, Rev, Revision Number | Referenz, Référence, 参照番号, 参考号 |
| `spec_section` | text | Spec Section, Specification Section, Spec, Section | LV-Abschnitt, Article du CCTP, 仕様書項目, 技术规格章节 |
| `title` | text | Title, Description, Name | - |
| `vendor` | text | Vendor, Responsible Contractor, Subcontractor, Submitted By | Lieferant, Fournisseur, 仕入先, 供应商 |
| `status` | text | Status, Submittal Status, Response, Action | Status, Statut, ステータス, 状态 |
| `ball_in_court` | text | Ball In Court, Ball in Court, With, Current Reviewer | Liegt bei, En attente de, 対応者, 当前处理人 |
| `submitted_date` | date | Submitted Date, Submitted, Date Submitted, Sent Date | Eingereicht am, Date de soumission, 提出日, 提交日期 |
| `returned_date` | date | Returned Date, Returned, Response Date, Date Returned | - |
| `required_on_site` | date | Required On-Site Date, Required On Site, Required On-Site, Need By, Required Date | - |
| `lead_time_days` | number | Lead Time, Lead Time Days, Lead Time (days), Fabrication Days | Lieferzeit (Tage), Délai de fabrication (jours), 製作期間（日）, 供货周期（天） |
| `review_days` | number | Review Days, Review Time, Design Team Review Time, Allowed Review Days | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Procore | Submittals log, export to CSV | Spec Section, Ball In Court, Required On-Site Date | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Spec sections needing submittals (`specs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `spec_section` (required) | text | Spec Section, Specification Section, Section | LV-Abschnitt, Article du CCTP, 仕様書項目, 技术规格章节 |
| `title` | text | Title, Section Title, Name | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx oder-of-submittals inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y oder-of-submittals demo
npx -y oder-of-submittals mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "oder-of-submittals": {
      "command": "npx",
      "args": [
        "-y",
        "oder-of-submittals",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add oder-of-submittals -- npx -y oder-of-submittals mcp --root .`, or install the `oder-of-submittals` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `oder-of-submittals approve <id> --as "Your Name"` (or on the local approvals page, `oder-of-submittals approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`oder-of-submittals kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
oder-of-submittals tools                 # every tool, its policy and arguments
oder-of-submittals sources               # the columns each input is read from
oder-of-submittals inspect <file>        # how a file would be read (names and shapes, never values)
oder-of-submittals call oder_check '{"submittals":"<submittals>"}'
oder-of-submittals eval                  # the private eval cases on the fictional fixtures
oder-of-submittals demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Lead times and review periods are the ones in your register; Oder does not know a supplier's real lead time. It does not read the submittal documents or the reviewer's comments.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
