# Mekong of Tickets (`mekong-of-tickets`)

Matches supplier invoice lines for materials to the signed delivery tickets and your agreed prices: quantities billed past what was delivered, prices above the agreed price, extensions that do not add up, tickets billed twice, lines with no ticket, and tickets not yet invoiced to accrue. Drafts supplier credit requests. Paying is a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y mekong-of-tickets demo
npx -y mekong-of-tickets mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `tickets` (required) | Signed delivery tickets under --root (CSV, Excel or JSON): ticket, supplier, job, date, material, quantity delivered, unit |
| `invoices` (required) | Supplier invoice lines: invoice, supplier, job, ticket referenced, material, quantity, unit price, amount |
| `prices` | Optional agreed prices by supplier and material (quote, PO or price list) |
| `settings` | Optional settings JSON (ticket_settings schema): accrue_after_days, price_tolerance, tolerance |

Only `tickets` and `invoices` are required. Each optional file turns on the checks that need it.

## Checks

What `mekong_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `price_over_agreed` | Billed 6.75 a unit; the agreed price for 2x6 studs is 6.5. |
| `extension_off` | 200 × 24 is 4800; the line says 4900. |
| `ticket_billed_twice` | Ticket DT-504 (200 EA) was already billed on SL-88341. |
| `qty_over_ticket` | Billed 38 CY; ticket DT-502 shows 36 delivered: 2 over. |
| `no_ticket` | No delivery ticket on this line; ticket DT-505 matches by supplier, material and quantity. Get the signed ticket before approving. |
| `ticket_not_invoiced` | Delivered 2026-11-10 (20 CY), not invoiced after 6 days. Accrue about 3000 at the agreed price. |

<!-- generated:start -->

## A demo run

`npx -y mekong-of-tickets demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Mekong of Tickets demo (fictional suppliers, tickets and invoices), Auto mode on for drafts

▶ Match supplier invoices to delivery tickets
  status: executed  decision: allow
  6 invoice line(s), 29140 billed: 4 overbilled by 5380 against tickets and agreed prices, 2 to review. 1 delivered ticket(s) not invoiced (about 3000 to accrue).
    SL-88120  DT-503  2x6 studs            4050  overbilled price_over_agreed
    SL-88341  DT-504  OSB sheathing        4900  overbilled extension_off
    SL-88342  DT-504  OSB sheathing        4800  overbilled ticket_billed_twice
    SRM-7702  DT-502  Concrete 4000 psi    6270  overbilled qty_over_ticket
    EBC-310   -       CMU 8in              2520  review     no_ticket
    -         DT-506  Concrete 3000 psi    3000  review     ticket_not_invoiced
    SRM-7701  DT-501  Concrete 4000 psi    6600  ok         

▶ Explain the second bill for ticket DT-504
  status: executed  decision: allow
  SL-88342 DT-504 OSB sheathing (Sample Lumber Supply, job 24-101): overbilled. 200 at 24 (agreed 24) = 4800. Ticket DT-504 (200 EA) was already billed on SL-88341.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 6 invoice line(s), 29140 billed: 4 overbilled by 5380 against tickets and agreed prices, 2 to review. 1 delivered ticket(s) not invoiced (about 3000 to accrue).

▶ Draft a credit request (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  credit Sample Lumber Supply drafted for 5050 with 3 open marker(s) ([TO CONFIRM supplier billing contact], [TO CONFIRM your name and company], [ATTACH signed delivery tickets]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to pay the supplier itself
  status: blocked  decision: block
  reason: Mekong never pays or approves a supplier invoice for payment.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `mekong_check` | Per invoice line: quantity billed against the signed ticket (including what earlier invoices already billed on it), price against the agreed price, quantity times price against the amount, lines with no ticket (and th… | runs |
| `mekong_explain` | Show one invoice line or ticket and every finding. | runs |
| `mekong_write_report` | Write the ticket matching worklist as mekong-tickets.csv (one row per item, blank decision columns for people to fill in) and mekong-tickets.html into out_dir (default fairbuild-out/mekong). | runs |
| `mekong_draft_credit` | Write drafts/credit-<supplier>.md: a credit request to one supplier for every overbilled line, with [ATTACH] for the signed tickets. | asks first (Auto can be opted in) |
| `mekong_request_send` | After one named human click (even in Auto), record that the reviewed credit draft is approved in credit-requests.csv. | one named click, even in Auto (`binding_send`) |
| `ap_pay_invoice` | Mekong never pays or approves a supplier invoice for payment. | refused |
| `receiving_update` | Mekong never changes receiving or ticket records. | refused |
| `email_send` | Mekong never sends the credit request; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Delivery tickets (`tickets`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `ticket` (required) | text | Ticket, Ticket Number, Delivery Ticket, Delivery Note, Packing Slip, BOL | Lieferschein, Bon de livraison, 納品書番号, 送货单号 |
| `supplier` | text | Supplier, Vendor, Vendor Name | Lieferant, Fournisseur, 仕入先, 供应商 |
| `job` | text | Job, Job Number, Project | Projekt, Chantier, 工事番号, 项目编号 |
| `date` | date | Date, Delivery Date, Delivered, Received Date | Datum, Date, 日付, 日期 |
| `material` | text | Material, Item, Product, Description, Mix | Material, Matériau, 資材, 材料 |
| `quantity` | number | Quantity, Qty, Qty Delivered, Delivered Qty | Menge, Quantité, 数量, 数量 |
| `uom` | text | UOM, Unit, Units | Einheit, Unité, 単位, 单位 |

### Supplier invoice lines (`invoices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `invoice_number` (required) | text | Invoice Number, Invoice, Invoice No, Inv # | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `supplier` | text | Supplier, Vendor, Vendor Name | Lieferant, Fournisseur, 仕入先, 供应商 |
| `job` | text | Job, Job Number, Project | Projekt, Chantier, 工事番号, 项目编号 |
| `ticket` | text | Ticket, Ticket Number, Delivery Ticket, Delivery Note, Reference | Lieferschein, Bon de livraison, 納品書番号, 送货单号 |
| `material` | text | Material, Item, Product, Description | Material, Matériau, 資材, 材料 |
| `quantity` | number | Quantity, Qty, Qty Billed | Menge, Quantité, 数量, 数量 |
| `unit_price` | amount | Unit Price, Price, Rate | Einzelpreis, Prix unitaire, 単価, 单价 |
| `amount` | amount | Amount, Extended, Line Total, Extension | Betrag, Montant, 金額, 金额 |
| `invoice_date` | date | Invoice Date, Date | Rechnungsdatum, Date de facture, 請求日, 发票日期 |

### Agreed prices (`prices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `supplier` (required) | text | Supplier, Vendor | Lieferant, Fournisseur, 仕入先, 供应商 |
| `material` (required) | text | Material, Item, Product, Description | Material, Matériau, 資材, 材料 |
| `unit_price` | amount | Unit Price, Price, Agreed Price, Contract Price | Einzelpreis, Prix unitaire, 単価, 单价 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx mekong-of-tickets inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y mekong-of-tickets demo
npx -y mekong-of-tickets mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "mekong-of-tickets": {
      "command": "npx",
      "args": [
        "-y",
        "mekong-of-tickets",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add mekong-of-tickets -- npx -y mekong-of-tickets mcp --root .`, or install the `mekong-of-tickets` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `mekong-of-tickets approve <id> --as "Your Name"` (or on the local approvals page, `mekong-of-tickets approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`mekong-of-tickets kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
mekong-of-tickets tools                 # every tool, its policy and arguments
mekong-of-tickets sources               # the columns each input is read from
mekong-of-tickets inspect <file>        # how a file would be read (names and shapes, never values)
mekong-of-tickets call mekong_check '{"tickets":"<tickets>","invoices":"<invoices>"}'
mekong-of-tickets eval                  # the private eval cases on the fictional fixtures
mekong-of-tickets demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Mekong compares the quantities and prices in your files. It does not read scanned tickets; tickets typed with the wrong quantity give wrong results.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
