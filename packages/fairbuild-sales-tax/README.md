# Fairbuild Sales Tax (`fairbuild-sales-tax`)

Checks tax charged on material invoices against the rates you supply for each jurisdiction: tax not charged (use tax to accrue), charged at another jurisdiction's rate, overcharged, charged on jobs you mark exempt, and deliveries to a different jurisdiction than the job. Drafts vendor refund requests. Not tax advice; filing and posting are a person's job.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y fairbuild-sales-tax demo
npx -y fairbuild-sales-tax mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `lines` (required) | Material invoice lines under --root (CSV, Excel or JSON): invoice, vendor, job, delivery jurisdiction, taxable amount, tax charged |
| `rates` (required) | Your tax rate table: jurisdiction and combined rate in percent. You maintain it; Fairbuild Sales Tax does not look rates up |
| `jobs` | Optional job list with jurisdiction and whether you treat the job as tax exempt |
| `settings` | Optional settings JSON (tax_settings schema): tolerance |

Only `lines` and `rates` are required. Each optional file turns on the checks that need it.

## Checks

What `sales_tax_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `tax_overcharged` | Charged 148.5 (8.25%); 7% of 1800 in Sample County is 126. |
| `wrong_jurisdiction_rate` | The 8.25% charged is the Example City rate; the delivery was to Sample County. |
| `tax_on_exempt_job` | Job 24-201 is marked exempt, but 336 of tax was charged. Send the vendor the exemption certificate and ask for a credit. |
| `tax_undercharged` | Charged 0 (0%); 8.25% of 4800 in Example City is 396. Accrue the difference as use tax unless the purchase is exempt. |
| `jurisdiction_mismatch` | Delivered to Test Township, but job 24-102 is in Sample County. Check the ship-to address. |
| `no_rate` | No rate on file for "Test Township". |

<!-- generated:start -->

## A demo run

`npx -y fairbuild-sales-tax demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairbuild Sales Tax demo (fictional jurisdictions, rates and invoices), Auto mode on for drafts

▶ Check tax on seven material invoice lines
  status: executed  decision: allow
  7 material invoice line(s), 25470 taxable, 1515.53 tax charged: 478.5 undercharged (use tax to accrue on 2 line(s)), 358.5 overcharged or charged on exempt jobs (2 line(s)), 1 to review.
    EBC-311   Sample County    1800 tax   148.5 expected     126  refund   tax_overcharged, wrong_jurisdiction_rate
    SG-55     Sample County    4800 tax     336 expected       0  refund   tax_on_exempt_job
    SL-88341  Example City     4800 tax       0 expected     396  use_tax  tax_undercharged
    SRM-7701  Example City     6600 tax     462 expected   544.5  use_tax  tax_undercharged, wrong_jurisdiction_rate
    SP-20     Test Township     900 tax    58.5 expected    58.5  review   jurisdiction_mismatch
    EBC-310   Sample County    2520 tax   176.4 expected   176.4  ok       
    SL-88120  Example City     4050 tax  334.13 expected  334.13  ok       

▶ Explain SRM-7701
  status: executed  decision: allow
  SRM-7701 Sample Ready Mix (job 24-101, Example City): use_tax. 6600 taxable, 462 tax (7%), your rate 8.25%, expected 544.5. Charged 462 (7%); 8.25% of 6600 in Example City is 544.5. Accrue the difference as use tax unless the purchase is exempt. The 7% charged is the Sample County rate; the delivery was to Example City.

▶ Write the worklist
  status: executed  decision: allow
  Worklist written: 7 material invoice line(s), 25470 taxable, 1515.53 tax charged: 478.5 undercharged (use tax to accrue on 2 line(s)), 358.5 overcharged or charged on exempt jobs (2 line(s)), 1 to review.

▶ Draft a tax credit request (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  refund Sample Glass Co drafted for 336 with 3 open marker(s) ([TO CONFIRM vendor billing contact], [TO CONFIRM your name and company], [ATTACH certificate where the job is exempt]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to file a tax return itself
  status: blocked  decision: block
  reason: Fairbuild Sales Tax never prepares or files a sales or use tax return.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `sales_tax_check` | Per invoice line, against your rate for the delivery jurisdiction: tax not charged (use tax to accrue), overcharged, charged at another jurisdiction's rate, charged on a job you mark exempt, delivered to a jurisdictio… | runs |
| `sales_tax_explain` | Show one line's amount, tax, rates and every finding. | runs |
| `sales_tax_write_report` | Write the sales tax worklist as sales-tax.csv (one row per item, blank decision columns for people to fill in) and sales-tax.html into out_dir (default fairbuild-out/sales-tax). | runs |
| `sales_tax_draft_refund` | Write drafts/refund-<vendor>.md: a credit request to one vendor for tax overcharged or charged on exempt jobs, with [ATTACH] for the exemption certificate. | asks first (Auto can be opted in) |
| `sales_tax_request_send` | After one named human click (even in Auto), record that the reviewed refund draft is approved in refund-requests.csv. | one named click, even in Auto (`binding_send`) |
| `tax_return_file` | Fairbuild Sales Tax never prepares or files a sales or use tax return. | refused |
| `gl_post` | Fairbuild Sales Tax never posts a use tax accrual or any entry. | refused |
| `email_send` | Fairbuild Sales Tax never sends the request; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Material invoice lines (`lines`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `invoice_number` (required) | text | Invoice Number, Invoice, Invoice No | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `vendor` | text | Vendor, Supplier, Vendor Name | Lieferant, Fournisseur, 仕入先, 供应商 |
| `job` | text | Job, Job Number, Project | Projekt, Chantier, 工事番号, 项目编号 |
| `jurisdiction` | text | Jurisdiction, Ship To Jurisdiction, Tax Jurisdiction, Delivery Jurisdiction, Tax Code, Tax Area | Steuergebiet, Juridiction fiscale, 課税地域, 税收管辖区 |
| `amount` | amount | Taxable Amount, Amount, Material Amount, Subtotal, Net Amount | Betrag, Montant, 金額, 金额 |
| `tax` | amount | Tax, Sales Tax, Tax Charged, Tax Amount | Steuer, TVA, 消費税, 税额 |

### Tax rate table (`rates`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `jurisdiction` (required) | text | Jurisdiction, Tax Jurisdiction, Tax Code, Tax Area | Steuergebiet, Juridiction fiscale, 課税地域, 税收管辖区 |
| `tax_rate` | number | Tax Rate, Rate, Rate %, Combined Rate | Steuersatz, Taux de taxe, 税率, 税率 |

### Jobs, jurisdictions and exemptions (`jobs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `job` (required) | text | Job, Job Number, Project | Projekt, Chantier, 工事番号, 项目编号 |
| `jurisdiction` | text | Jurisdiction, Tax Jurisdiction, Tax Code, Tax Area | Steuergebiet, Juridiction fiscale, 課税地域, 税收管辖区 |
| `tax_exempt` | yes/no | Tax Exempt, Exempt, Exemption | Steuerbefreit, Exonéré, 非課税, 免税 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx fairbuild-sales-tax inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairbuild-sales-tax demo
npx -y fairbuild-sales-tax mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairbuild-sales-tax": {
      "command": "npx",
      "args": [
        "-y",
        "fairbuild-sales-tax",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairbuild-sales-tax -- npx -y fairbuild-sales-tax mcp --root .`, or install the `fairbuild-sales-tax` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairbuild-sales-tax approve <id> --as "Your Name"` (or on the local approvals page, `fairbuild-sales-tax approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairbuild-sales-tax kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairbuild-sales-tax tools                 # every tool, its policy and arguments
fairbuild-sales-tax sources               # the columns each input is read from
fairbuild-sales-tax inspect <file>        # how a file would be read (names and shapes, never values)
fairbuild-sales-tax call sales_tax_check '{"lines":"<lines>","rates":"<rates>"}'
fairbuild-sales-tax eval                  # the private eval cases on the fictional fixtures
fairbuild-sales-tax demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Fairbuild Sales Tax applies the rates and exemptions you supply. Whether materials, a job or a contract type are taxable, and how use tax is reported, is for your tax adviser.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
