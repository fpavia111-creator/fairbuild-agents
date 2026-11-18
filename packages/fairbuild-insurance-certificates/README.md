# Fairbuild Insurance Certificates (`fairbuild-insurance-certificates`)

Checks subcontractor certificates of insurance against your requirements: required coverages missing, policies expired or expiring, limits below your minimums, missing additional insured, waiver of subrogation or primary and non-contributory, and policies that end before the subcontractor's work does. Drafts certificate requests. Blocking a vendor or holding payment is a person's decision.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-insurance-certificates demo
npx -y fairbuild-insurance-certificates mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `certificates` (required) | Certificate log under --root (CSV, Excel or JSON), one row per subcontractor and coverage: insurer, policy number, effective and expiration dates, limits, additional insured, waiver of subrogation, primary and non-contributory |
| `requirements` (required) | Your insurance requirements JSON (insurance_requirements schema): required coverages, minimum limits and endorsements per coverage, expiring_days, coverage_aliases |
| `schedule` | Optional subcontractor schedule (vendor, job, start, end) to flag policies that end before the work does; a subcontractor on it with no certificate is reported |

Only `certificates` and `requirements` are required. Each optional file turns on the checks that need it.

## Checks

What `coi_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `expired` | WC policy WC-3003 expired on 2026-10-31. |
| `coverage_missing` | No Auto certificate on file for Sample Painting Co. |
| `no_additional_insured` | GL does not show you as additional insured. |
| `limit_low` | GL each-occurrence limit is 500000; you require 1000000. |
| `aggregate_low` | GL aggregate is 1000000; you require 2000000. |
| `lapse_during_work` | WC ends 2027-01-01, before Example Concrete LLC finishes work on 2027-02-28 (24-101). Ask for the renewal certificate. |
| `expiring_soon` | GL policy GL-2001 expires on 2026-11-30, in 14 day(s). |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-insurance-certificates demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Insurance Certificates demo (fictional subcontractors and certificates), Auto mode on for drafts

▶ Check five subcontractors against your requirements
  status: executed  decision: allow
  6 subcontractor(s), 19 coverage(s) checked as of 2026-11-16: 2 missing or expired, 2 below your requirements, 2 expiring or ending before the work does. 1 subcontractor(s) fully clear.
    Example Electric Inc   WC        2026-10-31  expired    expired
    Sample Painting Co     Auto                  expired    coverage_missing
    Example Electric Inc   GL        2027-02-01  deficient  no_additional_insured
    Example Roofing LLC    GL        2027-04-01  deficient  limit_low, aggregate_low
    Example Concrete LLC   WC        2027-01-01  expiring   lapse_during_work
    Test Drywall Co        GL        2026-11-30  expiring   lapse_during_work, expiring_soon

▶ Explain Example Electric
  status: executed  decision: allow
  Example Electric Inc WC: expired. Insurer Example Mutual Insurance, policy WC-3003, expires 2026-10-31, each occurrence 500000, aggregate n/a. WC policy WC-3003 expired on 2026-10-31.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 6 subcontractor(s), 19 coverage(s) checked as of 2026-11-16: 2 missing or expired, 2 below your requirements, 2 expiring or ending before the work does. 1 subcontractor(s) fully clear.

▶ Draft a certificate request (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  request Example Electric Inc drafted with 2 open marker(s) ([TO CONFIRM subcontractor or their insurance agent], [TO CONFIRM your name and company]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to block the vendor itself
  status: blocked  decision: block
  reason: Fairbuild Insurance Certificates never blocks a vendor or holds payments in your accounting system; a person decides.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `coi_check` | Per subcontractor and coverage: required coverage on file, expired or expiring, each-occurrence and aggregate limits against your minimums, additional insured, waiver of subrogation, primary and non-contributory, and … | runs |
| `coi_explain` | Show one subcontractor's coverage and every finding. | runs |
| `coi_write_report` | Write the certificate worklist as insurance-certificates.csv (one row per item, blank decision columns for people to fill in) and insurance-certificates.html into out_dir (default fairbuild-out/insurance-certificates). | runs |
| `coi_draft_request` | Write drafts/request-<vendor>.md: a certificate request to one subcontractor (or its insurance agent) listing every coverage that is missing, expired, short or missing an endorsement. | asks first (Auto can be opted in) |
| `coi_request_send` | After one named human click (even in Auto), record that the reviewed request draft is approved in request-requests.csv. | one named click, even in Auto (`binding_send`) |
| `vendor_block` | Fairbuild Insurance Certificates never blocks a vendor or holds payments in your accounting system; a person decides. | refused |
| `insurer_contact` | Fairbuild Insurance Certificates never contacts an insurer or an agent. | refused |
| `email_send` | Fairbuild Insurance Certificates never sends the request; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Certificate of insurance log (`certificates`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `vendor` (required) | text | Vendor, Subcontractor, Insured, Named Insured, Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `coverage` | text | Coverage, Policy Type, Type of Insurance, Line of Coverage, Type | Versicherungsart, Garantie, 保険種類, 险种 |
| `insurer` | text | Insurer, Insurance Company, Carrier, Insurer Name | Versicherer, Assureur, 保険会社, 保险公司 |
| `policy_number` | text | Policy Number, Policy No, Policy #, Policy | Policennummer, N° de police, 証券番号, 保单号 |
| `effective` | date | Effective, Effective Date, Policy Effective, Start | Gültig ab, Date d'effet, 適用開始日, 生效日期 |
| `expires` | date | Expires, Expiration, Expiration Date, Expiry, Policy Expiration, End | Ablaufdatum, Date d'expiration, 有効期限, 到期日 |
| `each_occurrence` | amount | Each Occurrence, Per Occurrence, Each Accident, Limit, Each Occurrence Limit, Combined Single Limit | Je Schadenfall, Par sinistre, 1事故あたり, 每次事故限额 |
| `aggregate` | amount | Aggregate, General Aggregate, Aggregate Limit | Jahreshöchstleistung, Plafond annuel, 総支払限度額, 累计限额 |
| `additional_insured` | yes/no | Additional Insured, Addl Insured, AI, Addl Insd | - |
| `waiver_of_subrogation` | yes/no | Waiver of Subrogation, Subrogation Waived, WOS, Subr Wvd | - |
| `primary_noncontributory` | yes/no | Primary and Non-Contributory, Primary Non-Contributory, Primary, PNC | - |

### Subcontractor schedule (`schedule`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `vendor` (required) | text | Vendor, Subcontractor, Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `job` | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `start_date` | date | Start Date, Start, Mobilization, On Site From | Eintrittsdatum, Date d'entrée, 入社日, 入职日期 |
| `end_date` | date | End Date, Finish, Finish Date, On Site Until, Completion | Austrittsdatum, Date de sortie, 退職日, 离职日期 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-insurance-certificates inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-insurance-certificates demo
npx -y fairbuild-insurance-certificates mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-insurance-certificates": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-insurance-certificates",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-insurance-certificates -- npx -y fairbuild-insurance-certificates mcp --root .`, or install the `fairbuild-insurance-certificates` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-insurance-certificates approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-insurance-certificates approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-insurance-certificates kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-insurance-certificates tools                 # every tool, its policy and arguments
fairbuild-insurance-certificates sources               # the columns each input is read from
fairbuild-insurance-certificates inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-insurance-certificates call coi_check '{"certificates":"<certificates>","requirements":"<requirements>"}'
fairbuild-insurance-certificates eval                  # the private eval cases on the fictional fixtures
fairbuild-insurance-certificates demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Fairbuild Insurance Certificates reads the certificate data you entered; a certificate is evidence of insurance, not the policy. Endorsements and exclusions are for your insurance agent to confirm.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
