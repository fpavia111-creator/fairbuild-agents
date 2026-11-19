# Fairbuild Sub Compliance (`fairbuild-sub-compliance`)

Checks each active subcontractor's compliance documents against your list and the extra ones its trade needs: missing, expired, expiring, rejected, waiting too long for review, and safety ratings above your limit. Drafts document requests. Approving or blocking a vendor is a person's decision.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-sub-compliance demo
npx -y fairbuild-sub-compliance mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `documents` (required) | Compliance document log under --root (CSV, Excel or JSON): vendor, document type, status, received date, expiration date, and a value column for ratings such as an EMR |
| `requirements` (required) | Your document requirements JSON (document_requirements schema): required documents, extra documents by trade, expiring_days, review_days, max_emr, document_aliases |
| `vendors` | Optional subcontractor list with trade and status; only active ones are checked, and an active one with no documents is reported |

Only `documents` and `requirements` are required. Each optional file turns on the checks that need it.

## What it refuses, and what waits for a person

Refused in every mode (the tool is listed so an assistant can see it, and every call is blocked):

- `vendor_approve`: Fairbuild Sub Compliance never approves a subcontractor or changes its status in your systems.
- `vendor_block`: Fairbuild Sub Compliance never blocks a vendor or holds payments.
- `email_send`: Fairbuild Sub Compliance never sends the request; a person sends the approved draft.

Waits for one named person's click, even in Auto mode (nothing is sent, paid or posted by the agent; the click is recorded for the person who acts):

- `sub_compliance_request_send`: Approve the request (one click)

## Checks

What `sub_compliance_check` flags, each with the first example it finds in the fictional fixtures (the eval cases for `sub_compliance_check`):

| Code | Example from the fixtures |
|---|---|
| `document_expired` | Electrical license expired on 2026-09-30. |
| `document_missing` | Example Electric Inc has no W-9 on file. |
| `document_rejected` | Fall protection plan was rejected; a new one is needed. |
| `emr_high` | Experience modification rate 1.35 is above your limit of 1.2. |
| `not_reviewed` | Signed subcontract was received 2026-08-20 and is still pending after 88 days. |
| `document_expiring` | Contractor license expires on 2026-12-01, in 15 day(s). |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-sub-compliance demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Sub Compliance demo (fictional subcontractors and documents), Auto mode on for drafts

▶ Check five active subcontractors against your document list
  status: executed  decision: allow
  5 active subcontractor(s), 27 required document(s) as of 2026-11-16: 5 missing, expired or rejected, 2 to review, 1 expiring soon. 1 subcontractor(s) with every required document on file and current.
    Example Electric Inc   Electrical license     missing   document_expired
    Example Electric Inc   W-9                    missing   document_missing
    Example Roofing LLC    Fall protection plan   missing   document_rejected
    Sample Painting Co     EMR letter             missing   document_missing
    Sample Painting Co     Safety program         missing   document_missing
    Test Drywall Co        EMR letter             review    emr_high
    Test Drywall Co        Signed subcontract     review    not_reviewed
    Test Drywall Co        Contractor license     expiring  document_expiring

▶ Explain Test Drywall
  status: executed  decision: allow
  Test Drywall Co (Drywall) EMR letter: review. Status Approved, received 2026-08-10, expires 2027-08-01. Experience modification rate 1.35 is above your limit of 1.2.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 5 active subcontractor(s), 27 required document(s) as of 2026-11-16: 5 missing, expired or rejected, 2 to review, 1 expiring soon. 1 subcontractor(s) with every required document on file and current.

▶ Draft a document request (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  request Sample Painting Co drafted with 2 open marker(s) ([TO CONFIRM subcontractor contact], [TO CONFIRM your name and company]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to approve the vendor itself
  status: blocked  decision: block
  reason: Fairbuild Sub Compliance never approves a subcontractor or changes its status in your systems.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `sub_compliance_check` | Per active subcontractor and required document (your list plus the extra documents its trade needs): on file, approved, not expired or expiring, not waiting too long for review, and an EMR within your limit. | runs |
| `sub_compliance_explain` | Show one subcontractor document and every finding. | runs |
| `sub_compliance_write_report` | Write the compliance worklist as sub-compliance.csv (one row per item, blank decision columns for people to fill in) and sub-compliance.html into out_dir (default fairbuild-out/sub-compliance). | runs |
| `sub_compliance_draft_request` | Write drafts/request-<vendor>.md: one request to one subcontractor for every document that is missing, expired, rejected or expiring. | asks first (Auto can be opted in) |
| `sub_compliance_request_send` | After one named human click (even in Auto), record that the reviewed request draft is approved in request-requests.csv. | one named click, even in Auto (`binding_send`) |
| `vendor_approve` | Fairbuild Sub Compliance never approves a subcontractor or changes its status in your systems. | refused |
| `vendor_block` | Fairbuild Sub Compliance never blocks a vendor or holds payments. | refused |
| `email_send` | Fairbuild Sub Compliance never sends the request; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Compliance document log (`documents`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `vendor` (required) | text | Vendor, Subcontractor, Company, Vendor Name | Lieferant, Fournisseur, 仕入先, 供应商 |
| `document_type` | text | Document Type, Document, Type, Requirement, Item | Dokumentart, Type de document, 書類種別, 文件类型 |
| `status` | text | Status, Review Status, Approval Status | Status, Statut, ステータス, 状态 |
| `received_date` | date | Received Date, Received, Date Received, Uploaded, Submitted | Eingangsdatum, Date de réception, 受領日, 收到日期 |
| `expires` | date | Expires, Expiration, Expiration Date, Expiry, Valid Until | Ablaufdatum, Date d'expiration, 有効期限, 到期日 |
| `value` | number | Value, Rating, EMR, Experience Modifier, Score | - |

### Subcontractor list (`vendors`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `vendor` (required) | text | Vendor, Subcontractor, Company, Vendor Name, Name | Lieferant, Fournisseur, 仕入先, 供应商 |
| `trade` | text | Trade, Scope, Category, Type, Vendor Type | Gewerk, Corps d'état, 職種, 专业 |
| `status` | text | Status, Vendor Status, Active | Status, Statut, ステータス, 状态 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-sub-compliance inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-sub-compliance demo
npx -y fairbuild-sub-compliance mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-sub-compliance": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-sub-compliance",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-sub-compliance -- npx -y fairbuild-sub-compliance mcp --root .`, or install the `fairbuild-sub-compliance` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-sub-compliance approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-sub-compliance approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-sub-compliance kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-sub-compliance tools                 # every tool, its policy and arguments
fairbuild-sub-compliance sources               # the columns each input is read from
fairbuild-sub-compliance inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-sub-compliance call sub_compliance_check '{"documents":"<documents>","requirements":"<requirements>"}'
fairbuild-sub-compliance eval                  # the private eval cases on the fictional fixtures
fairbuild-sub-compliance demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Fairbuild Sub Compliance checks what your document log records. Whether a licence or document is valid is for the issuing body or your compliance lead to confirm.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
