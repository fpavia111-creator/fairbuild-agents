# Fairbuild Duplicate Vendors (`fairbuild-duplicate-vendors`)

Finds duplicates in the vendor master and AP invoices: vendors entered twice (same tax id, bank account, address, phone or name once legal forms are set aside), invoices entered under two numbers, two vendor records or twice for one vendor, duplicates already paid twice and duplicates still open. Drafts recovery letters. Merging vendors and stopping payments is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-duplicate-vendors demo
npx -y fairbuild-duplicate-vendors mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `vendors` (required) | Vendor master under --root (CSV, Excel or JSON): vendor id, name, tax id, address, city, phone, e-mail, last four of the bank account |
| `invoices` | Optional AP invoices with vendor id, invoice number, date, amount and payment status |
| `settings` | Optional settings JSON (duplicate_settings schema): name_threshold, near_days |

Only `vendors` is required. Each optional file turns on the checks that need it.

## What it refuses, and what waits for a person

Refused in every mode (the tool is listed so an assistant can see it, and every call is blocked):

- `vendor_merge`: Fairbuild Duplicate Vendors never merges, deactivates or edits vendor records.
- `payment_void`: Fairbuild Duplicate Vendors never voids, stops or reissues a payment.
- `email_send`: Fairbuild Duplicate Vendors never sends the recovery letter; a person sends the approved draft.

Waits for one named person's click, even in Auto mode (nothing is sent, paid or posted by the agent; the click is recorded for the person who acts):

- `duplicates_request_send`: Approve the recovery (one click)

## Checks

What `duplicates_check` flags, each with the first example it finds in the fictional fixtures (the eval cases for `duplicates_check`):

| Code | Example from the fixtures |
|---|---|
| `same_number` | Invoice number EC-2210 is entered also as EC2210 under vendor records V100 and V101. |
| `same_amount_near_number` | EE-5501 and EE-5510 are for the same amount 45000, 2 day(s) apart, with near-identical numbers. |
| `same_tax_id` | Both have tax id ending 6789. |
| `same_bank` | Both pay to a bank account ending 4321. |
| `same_address` | Same address. |
| `same_phone` | Same phone number. |
| `same_name` | Names "Example Concrete LLC" and "Example Concrete, L.L.C." match once legal forms and punctuation are set aside (100%). |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-duplicate-vendors demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Duplicate Vendors demo (fictional vendors and invoices), Auto mode on for drafts

▶ Look for duplicate vendors and invoices
  status: executed  decision: allow
  9 vendor record(s), 10 invoice(s): 3 likely duplicate vendor pair(s), 4 duplicate invoice group(s). 101000 paid twice (2 group(s)), 32400 in open duplicates to stop before payment.
    invoice_dup  EC-2210 EC2210      56000  paid_twice same_number
    invoice_dup  EE-5501 EE-5510     45000  paid_twice same_amount_near_number
    invoice_dup  0088120 SL-88120        0  stop       same_number
    invoice_dup  TD-101 TD-101           0  stop       same_number
    vendor_pair  V100 V101               0  merge      same_tax_id, same_bank, same_address, same_phone, same_name
    vendor_pair  V200 V201               0  merge      same_bank, same_address, same_name
    vendor_pair  V500 V501               0  review     same_name

▶ Explain the concrete duplicate
  status: executed  decision: allow
  Invoices EC-2210 EC2210 (Example Concrete LLC / Example Concrete, L.L.C.): paid_twice. EC-2210 2026-10-20 56000 paid; EC2210 2026-10-22 56000 paid. Invoice number EC-2210 is entered also as EC2210 under vendor records V100 and V101.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 9 vendor record(s), 10 invoice(s): 3 likely duplicate vendor pair(s), 4 duplicate invoice group(s). 101000 paid twice (2 group(s)), 32400 in open duplicates to stop before payment.

▶ Draft a recovery letter (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  recovery Example Concrete LLC drafted for 56000 with 3 open marker(s) ([TO CONFIRM vendor accounts receivable contact], [TO CONFIRM your name and company], [TO CONFIRM: check both payments cleared before sending]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to merge the vendors itself
  status: blocked  decision: block
  reason: Fairbuild Duplicate Vendors never merges, deactivates or edits vendor records.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `duplicates_check` | Vendor pairs that share a tax id, bank account, address or phone, or whose names match once legal forms are set aside. | runs |
| `duplicates_explain` | Show one duplicate vendor pair or invoice group with every finding. | runs |
| `duplicates_write_report` | Write the duplicates worklist as duplicate-vendors.csv (one row per item, blank decision columns for people to fill in) and duplicate-vendors.html into out_dir (default fairbuild-out/duplicate-vendors). | runs |
| `duplicates_draft_recovery` | Write drafts/recovery-<vendor>.md: a refund or credit request to one vendor for invoices paid twice. | asks first (Auto can be opted in) |
| `duplicates_request_send` | After one named human click (even in Auto), record that the reviewed recovery draft is approved in recovery-requests.csv. | one named click, even in Auto (`binding_send`) |
| `vendor_merge` | Fairbuild Duplicate Vendors never merges, deactivates or edits vendor records. | refused |
| `payment_void` | Fairbuild Duplicate Vendors never voids, stops or reissues a payment. | refused |
| `email_send` | Fairbuild Duplicate Vendors never sends the recovery letter; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Vendor master (`vendors`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `vendor_id` (required) | text | Vendor ID, Vendor Number, Vendor No, Vendor Code, ID | Lieferantennummer, Code fournisseur, 仕入先コード, 供应商编号 |
| `name` | text | Name, Vendor, Vendor Name, Company | Name, Nom, 名前, 名称 |
| `tax_id` | text | Tax ID, TIN, EIN, Federal ID, Tax Number | Steuernummer, Numéro de TVA, 法人番号, 统一社会信用代码 |
| `address` | text | Address, Street, Address 1, Remit Address | Adresse, Adresse, 住所, 地址 |
| `city` | text | City | - |
| `phone` | text | Phone, Phone Number, Telephone | Telefon, Téléphone, 電話番号, 电话 |
| `email` | text | Email, E-mail, Remit Email | E-Mail, E-mail, メールアドレス, 邮箱 |
| `bank_last4` | text | Bank Last 4, Account Last 4, Bank Account Last 4, ACH Last 4 | - |

### AP invoices (`invoices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `invoice_number` (required) | text | Invoice Number, Invoice, Invoice No, Bill #, Num | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `vendor_id` | text | Vendor ID, Vendor Number, Vendor Code | Lieferantennummer, Code fournisseur, 仕入先コード, 供应商编号 |
| `vendor` | text | Vendor, Vendor Name, Payee, Supplier | Lieferant, Fournisseur, 仕入先, 供应商 |
| `invoice_date` | date | Invoice Date, Date, Bill Date | Rechnungsdatum, Date de facture, 請求日, 发票日期 |
| `amount` | amount | Amount, Invoice Amount, Total | Betrag, Montant, 金額, 金额 |
| `status` | text | Status, Payment Status, Paid | Status, Statut, ステータス, 状态 |
| `paid_date` | date | Paid Date, Payment Date, Check Date | Zahlungsdatum, Date de paiement, 支払日, 付款日期 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-duplicate-vendors inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-duplicate-vendors demo
npx -y fairbuild-duplicate-vendors mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-duplicate-vendors": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-duplicate-vendors",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-duplicate-vendors -- npx -y fairbuild-duplicate-vendors mcp --root .`, or install the `fairbuild-duplicate-vendors` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-duplicate-vendors approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-duplicate-vendors approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-duplicate-vendors kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-duplicate-vendors tools                 # every tool, its policy and arguments
fairbuild-duplicate-vendors sources               # the columns each input is read from
fairbuild-duplicate-vendors inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-duplicate-vendors call duplicates_check '{"vendors":"<vendors>"}'
fairbuild-duplicate-vendors eval                  # the private eval cases on the fictional fixtures
fairbuild-duplicate-vendors demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- A duplicate here is a likely duplicate: confirm with the invoices, the bank and the vendor before stopping or recovering a payment.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
