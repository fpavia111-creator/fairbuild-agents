# Tiber of Waivers (`tiber-of-waivers`)

Matches every payment to a subcontractor or supplier with its lien waivers: payments made without a conditional waiver, unconditional waivers missing after the payment cleared, waivers for less than was paid, unsigned waivers and final payments without final waivers. Drafts waiver requests. Never files or releases a lien and never pays.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y tiber-of-waivers demo
npx -y tiber-of-waivers mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `payments` (required) | Payments to subcontractors and suppliers under --root (CSV, Excel or JSON): check or payment number, vendor, job, date, amount, and whether it is a final payment |
| `waivers` (required) | Lien waiver log: vendor, job, waiver type (conditional or unconditional, progress or final), through date, amount, received date, the payment it covers, signed |
| `settings` | Optional settings JSON (waiver_settings schema): unconditional_days, tolerance |

Only `payments` and `waivers` are required. Each optional file turns on the checks that need it.

## Checks

What `tiber_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `paid_without_conditional` | CK-5004 paid 40500 on 2026-10-30 with no conditional waiver on file. |
| `unconditional_pending` | Unconditional waiver for CK-5004 not in yet; 17 day(s) since payment, due within 30. |
| `unconditional_missing` | No unconditional waiver for CK-5005 (14400) 32 days after payment. |
| `final_waiver_missing` | CK-5007 is a final payment of 9500, but the waivers on file are progress waivers. Get final conditional and unconditional waivers. |
| `waiver_short` | The conditional progress covers 130000; CK-5006 paid 136500. |
| `unsigned` | The conditional progress for CK-5003 is not signed. |

<!-- generated:start -->

## A demo run

`npx -y tiber-of-waivers demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Tiber of Waivers demo (fictional payments and waivers), Auto mode on for drafts

▶ Match seven payments to their lien waivers
  status: executed  decision: allow
  7 payment(s), 303500 paid: 3 with waivers missing (64400 paid without the waivers it needs), 2 with waiver problems, 1 waiting for an unconditional waiver within 30 days.
    CK-5004 Example Electric Inc     40500  missing  paid_without_conditional, unconditional_pending
    CK-5005 Sample Lumber Supply     14400  missing  unconditional_missing
    CK-5007 Sample Sheet Metal        9500  missing  final_waiver_missing
    CK-5006 Example Roofing LLC     136500  review   waiver_short, unconditional_pending
    CK-5003 Test Drywall Co          16200  review   unsigned, unconditional_pending
    CK-5002 Example Concrete LLC     36000  waiting  unconditional_pending
    CK-5001 Example Concrete LLC     50400  ok       

▶ Explain the final payment to Sample Sheet Metal
  status: executed  decision: allow
  CK-5007 to Sample Sheet Metal (job 24-102) 9500 on 2026-08-25: missing. Conditional: none; unconditional: none. CK-5007 is a final payment of 9500, but the waivers on file are progress waivers. Get final conditional and unconditional waivers.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 7 payment(s), 303500 paid: 3 with waivers missing (64400 paid without the waivers it needs), 2 with waiver problems, 1 waiting for an unconditional waiver within 30 days.

▶ Draft a waiver request to Example Electric (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  request Example Electric Inc drafted with 2 open marker(s) ([TO CONFIRM vendor contact], [TO CONFIRM form]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to file a lien itself
  status: blocked  decision: block
  reason: Tiber never files, records or releases a lien or a bond claim.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `tiber_check` | Per payment: a conditional waiver on file before the money went out, the unconditional waiver within your window after it, waivers for the full amount paid, signed waivers, and final waivers for a final payment. | runs |
| `tiber_explain` | Show one payment's waivers and every finding. | runs |
| `tiber_write_report` | Write the waiver worklist as tiber-waivers.csv (one row per item, blank decision columns for people to fill in) and tiber-waivers.html into out_dir (default fairbuild-out/tiber). | runs |
| `tiber_draft_request` | Write drafts/request-<vendor>.md: one request to one vendor for every waiver still missing, short or unsigned on its payments. | asks first (Auto can be opted in) |
| `tiber_request_send` | After one named human click (even in Auto), record that the reviewed request draft is approved in request-requests.csv. | one named click, even in Auto (`binding_send`) |
| `lien_file` | Tiber never files, records or releases a lien or a bond claim. | refused |
| `ap_pay_invoice` | Tiber never pays or holds a payment itself; a person decides. | refused |
| `email_send` | Tiber never sends the request; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Payments to vendors (`payments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `check_number` (required) | text | Check Number, Check #, Check No, Payment Number, Payment ID, Reference | Zahlungsnummer, N° de paiement, 支払番号, 付款编号 |
| `vendor` | text | Vendor, Vendor Name, Subcontractor, Sub, Supplier, Contract Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `job` | text | Job, Job Number, Job No, Job #, Job No., Job ID | Projekt, Chantier, 工事番号, 项目编号 |
| `date` | date | Date, Check Date, Payment Date, Paid Date | Datum, Date, 日付, 日期 |
| `amount` | amount | Amount, Check Amount, Payment Amount, Paid | Betrag, Montant, 金額, 金额 |
| `invoice_number` | text | Invoice Number, Invoice, Invoice No, Bill #, Applied To | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `status` | text | Status, Payment Status | Status, Statut, ステータス, 状态 |
| `final` | yes/no | Final, Final Payment, Is Final | - |

### Lien waiver log (`waivers`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `vendor` (required) | text | Vendor, Subcontractor, Supplier, Claimant, Company | Lieferant, Fournisseur, 仕入先, 供应商 |
| `job` | text | Job, Job Number, Project, Project Number | Projekt, Chantier, 工事番号, 项目编号 |
| `waiver_type` | text | Waiver Type, Type, Form, Waiver Form, Release Type | Art der Verzichtserklärung, Type de renonciation, 権利放棄書の種類, 弃权书类型 |
| `through_date` | date | Through Date, Through, Work Through, Period Through | Bis Datum, Jusqu'au, 対象期間末, 截至日期 |
| `amount` | amount | Amount, Waiver Amount, Payment Amount | Betrag, Montant, 金額, 金额 |
| `received_date` | date | Received Date, Received, Date Received, Date | Eingangsdatum, Date de réception, 受領日, 收到日期 |
| `check_number` | text | Check Number, Check #, Check No, Payment Number, Payment Ref, Reference | Zahlungsnummer, N° de paiement, 支払番号, 付款编号 |
| `signed` | yes/no | Signed, Executed, Signature | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx tiber-of-waivers inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y tiber-of-waivers demo
npx -y tiber-of-waivers mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "tiber-of-waivers": {
      "command": "npx",
      "args": [
        "-y",
        "tiber-of-waivers",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add tiber-of-waivers -- npx -y tiber-of-waivers mcp --root .`, or install the `tiber-of-waivers` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `tiber-of-waivers approve <id> --as "Your Name"` (or on the local approvals page, `tiber-of-waivers approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`tiber-of-waivers kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
tiber-of-waivers tools                 # every tool, its policy and arguments
tiber-of-waivers sources               # the columns each input is read from
tiber-of-waivers inspect <file>        # how a file would be read (names and shapes, never values)
tiber-of-waivers call tiber_check '{"payments":"<payments>","waivers":"<waivers>"}'
tiber-of-waivers eval                  # the private eval cases on the fictional fixtures
tiber-of-waivers demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Lien and waiver rules differ by state and contract; Tiber checks what your files record against the window you set. It does not read the waiver documents themselves.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
