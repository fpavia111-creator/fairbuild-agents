# Fairbuild construction agents

English · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português](README.pt-BR.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · [한국어](README.ko.md) (translations by Claude; native review pending)

Thirty small MCP agents for the back office of general contractors, subcontractors and trade service companies. Each one owns **one job**, such as checking job cost against the budget, building the WIP schedule, matching lien waivers to payments or checking certified payroll, and cannot act outside it. They read the files you already export from Procore, Sage 100 and 300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan or a spreadsheet, write reports on your machine, and wait for one named person before anything that moves money, sends a message or changes a live system.

MIT licence · Node 20 or newer · local files only · no credentials · no dependencies · fictional test data only

Set up as a fixed-price package: [Fairbuild](https://fair-agents.com/fairbuild.html).

## Try one

```bash
npx -y fairbuild-job-cost demo     # job cost against budget on fictional jobs
npx -y fairbuild-payment-release demo     # the release check before a subcontractor is paid
```

Every agent has a `demo` that runs on fictional files, an `eval` that checks it against its own test cases, and an MCP server (`npx -y <agent> mcp --root <folder>`) for Claude Desktop, Claude Code, Cursor and other MCP hosts. Each agent's README lists its tools, the columns it reads and its limits.

From a clone of this repository:

```bash
npm install
npm test
node packages/fairbuild-job-cost/bin/fairbuild-job-cost.js demo
```

## The agents

### Job cost, billing and cash

| Agent | What it does | Waits for a person before |
|---|---|---|
| [`fairbuild-job-cost`](packages/fairbuild-job-cost) | Job cost against budget by job, cost code and cost type: over or projected over, spend ahead of percent complete, cost on codes with no budget | Sending the cost review memo |
| [`fairbuild-commitments`](packages/fairbuild-commitments) | Subcontracts and POs against AP invoices and payments: billed past value, unsigned subcontracts, retainage at the wrong rate, stale open POs | Sending a vendor letter |
| [`fairbuild-change-orders`](packages/fairbuild-change-orders) | The change order log: pending too long or unpriced, approved and not billed, billed past approval, priced below cost | Sending an owner follow-up |
| [`fairbuild-schedule-of-values`](packages/fairbuild-schedule-of-values) | Schedule of values against billing and field percent complete: billed ahead of or behind progress, lines that do not add up | Sending the project manager memo |
| [`fairbuild-pay-applications`](packages/fairbuild-pay-applications) | The arithmetic of a G702/G703-layout pay application, yours or a subcontractor's, down to the payment due | Sending a correction note. It never submits or approves a pay application |
| [`fairbuild-wip-schedule`](packages/fairbuild-wip-schedule) | The month-end WIP schedule by cost-to-cost: earned revenue, over and under billings, loss jobs | Posting the over/under billing journal |
| [`fairbuild-retainage`](packages/fairbuild-retainage) | Retainage both ways: held by owners and held from subcontractors, rates, release timing, releases not collected | Sending a release request or approving a retainage payment |
| [`fairbuild-job-cash-flow`](packages/fairbuild-job-cash-flow) | Net cash by job and month from receipts and disbursements; jobs paid out more than collected; slow owner invoices | Sending a collection letter |

### Subcontractors and payables

| Agent | What it does | Waits for a person before |
|---|---|---|
| [`fairbuild-three-way-match`](packages/fairbuild-three-way-match) | Three-way match: invoice, subcontract or PO, and the work the project manager approved | Approving an invoice for payment |
| [`fairbuild-payment-release`](packages/fairbuild-payment-release) | The release check before a subcontractor is paid: approval, pay-when-paid, conditional waiver, insurance, W-9, retainage | Approving a payment release |
| [`fairbuild-lien-waivers`](packages/fairbuild-lien-waivers) | Every payment matched to its conditional and unconditional lien waivers; finals without final waivers | Sending a waiver request. It never files or releases a lien |
| [`fairbuild-insurance-certificates`](packages/fairbuild-insurance-certificates) | Certificates of insurance against your requirements: coverages, limits, endorsements, expiry against the work | Sending a certificate request |
| [`fairbuild-sub-compliance`](packages/fairbuild-sub-compliance) | Subcontractor compliance documents by trade: missing, expired, rejected, waiting for review, safety ratings | Sending a document request |
| [`fairbuild-duplicate-vendors`](packages/fairbuild-duplicate-vendors) | Duplicate vendors and duplicate invoices, including duplicates already paid twice | Sending a recovery letter |
| [`fairbuild-backcharges`](packages/fairbuild-backcharges) | Backcharges from notice to recovery: late notices, agreed and never deducted, more than you still owe or hold | Sending a notice or approving a deduction |
| [`fairbuild-delivery-tickets`](packages/fairbuild-delivery-tickets) | Material invoices against signed delivery tickets and agreed prices; tickets not yet invoiced to accrue | Sending a supplier credit request |
| [`fairbuild-sales-tax`](packages/fairbuild-sales-tax) | Sales tax on material invoices against the rates you supply; use tax to accrue. Not tax advice | Sending a refund request |

### Payroll and labour

| Agent | What it does | Waits for a person before |
|---|---|---|
| [`fairbuild-certified-payroll`](packages/fairbuild-certified-payroll) | Certified payroll lines against the job's wage determination: underpaid, overtime, missing rates, full SSNs on the report. Names masked | Sending payroll corrections. It never submits payroll |
| [`fairbuild-union-fringes`](packages/fairbuild-union-fringes) | Union fringe remittances by local, fund and month against payroll hours and your contribution rates | Sending a fund letter or approving a shortfall payment |
| [`fairbuild-timecards`](packages/fairbuild-timecards) | Field timecards against crew assignments, job status and budgeted cost codes. Names masked | Sending a recode request |

### Field, permits and closeout

| Agent | What it does | Waits for a person before |
|---|---|---|
| [`fairbuild-equipment-rentals`](packages/fairbuild-equipment-rentals) | Equipment rental invoices against day, week and month rates, off-rent dates and hours used | Sending a credit request |
| [`fairbuild-permits`](packages/fairbuild-permits) | Permits and inspections by job: expiring permits, failed inspections not re-booked; writes a calendar file | Sending a notice to the project manager |
| [`fairbuild-submittals`](packages/fairbuild-submittals) | The submittal register worked back from the date material is needed on site | Sending a reminder |
| [`fairbuild-punch-lists`](packages/fairbuild-punch-lists) | Punch list items by trade and subcontractor: past due, reopened, unassigned, open on subcontractors paid in full | Sending a punch notice |
| [`fairbuild-closeout`](packages/fairbuild-closeout) | The closeout checklist of completed jobs, and which jobs are ready for final billing | Sending a reminder |

### Bids, backlog and bonding

| Agent | What it does | Waits for a person before |
|---|---|---|
| [`fairbuild-bid-leveling`](packages/fairbuild-bid-leveling) | Subcontractor bids levelled by package: scope gaps at your plug values, missing addenda or bid bonds, outliers | Sending a clarification letter. Awarding stays a person's decision |
| [`fairbuild-backlog`](packages/fairbuild-backlog) | Backlog and gross profit left to earn; margin fade since the first estimate or last month | Sending the backlog memo |
| [`fairbuild-bonding-capacity`](packages/fairbuild-bonding-capacity) | Bonded backlog against the single and aggregate limits your surety gave you. Not surety advice | Sending the summary to your broker |

### Service and warranty

| Agent | What it does | Waits for a person before |
|---|---|---|
| [`fairbuild-service-tickets`](packages/fairbuild-service-tickets) | Service tickets and technician timesheets: utilisation, revenue per paid hour, recalls, tickets not invoiced. Names masked | Sending a billing follow-up |
| [`fairbuild-warranty-callbacks`](packages/fairbuild-warranty-callbacks) | Warranty callbacks by trade and subcontractor: cost a subcontractor should cover, repeat callbacks. Homeowners masked | Sending a subcontractor notice |

## How they stay safe

- **Local files only.** No logins to your accounting or project management system, bank, surety, insurer or any government portal; no network calls, no telemetry.
- **One job each, allowlisted.** Every tool an agent has is listed with its policy: allow, ask (one named person's click) or block. Anything not on the list is blocked.
- **People pay, file and send.** Paying, filing or releasing a lien, submitting or approving a pay application, posting to the ledger and sending email are refused outright. Drafts are marked DRAFT and wait for one named person's click, tied to the exact draft by its hash, even in Auto mode.
- **Masked before the model sees it.** Worker names, worker ids, Social Security numbers and homeowner contact details become pseudonyms (`PERSON-3f9a1c2e`) in what the agents return to an AI model. The files they write keep the real values.
- **Settings instead of hidden rules.** Retainage rates, notice days, thresholds and wage rates come from a settings file you control; each result says which values were used.
- **A record of everything.** Each call is written to a hash-chained audit log in `.fairbuild/` under the folder you point it at.

## Checks this repository runs

| Command | What it checks |
|---|---|
| `npm test` | Every agent's contract, shared and domain tests (20 or more per agent) |
| `npm run evals` | Every agent's eval cases on its fictional fixtures (15 or more per agent) |
| `npm run hostile` / `npm run hostile:args` | Instructions planted in file contents and in tool arguments are reported, never followed |
| `npm run intl` | German (Windows-1252, `1.234,56`, `03.11.2026`) and Japanese (Shift_JIS) versions of the fixtures give the same results |
| `npm run bench` | Each agent on 10,000 rows |
| `npm run release:check:offline` | Package metadata, licences, secrets, honest copy, what each package would publish, one-click policy |

`REVIEW-ver1.md` has the numbers from the last run.

## Limits

Not legal, tax, lien, insurance, surety or accounting advice. The column names of each export were written from public documentation and memory, not checked against real exports yet; the first setup confirms them with you and names any differences in `fairbuild-sources.json`. Files in nine languages are read (encodings, numbers, dates, column names); results and CSV files stay in English, and report pages can be written in any of the nine (`--lang`).

## Licence

MIT. See [LICENSE](LICENSE).
