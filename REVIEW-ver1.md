# Fairbuild ver 1: review

18 Nov 2026. The Fairbuild family (construction and trades back office: general contractors, subcontractors, trade service companies) built to the Mythos ver 6 bar from `BUILD-BRIEF.md`, without input from Kurt, then renamed under Kurt's naming rule ("name it after what it does"). What was built, every check with its numbers, what was found and fixed, what is not checked yet, and every decision made along the way.

## Scope

30 agents, each named after what it does (`fairbuild-<job words>`), and `fairbuild-core`, version 0.1.0 each, in six areas:

| Area | Agents |
|---|---|
| Job cost, billing and cash (8) | fairbuild-job-cost, fairbuild-commitments, fairbuild-change-orders, fairbuild-schedule-of-values, fairbuild-pay-applications, fairbuild-wip-schedule, fairbuild-retainage, fairbuild-job-cash-flow |
| Subcontractors and payables (9) | fairbuild-three-way-match, fairbuild-payment-release, fairbuild-lien-waivers, fairbuild-insurance-certificates, fairbuild-sub-compliance, fairbuild-duplicate-vendors, fairbuild-backcharges, fairbuild-delivery-tickets, fairbuild-sales-tax |
| Payroll and labor (3) | fairbuild-certified-payroll, fairbuild-union-fringes, fairbuild-timecards |
| Field, permits and closeout (5) | fairbuild-equipment-rentals, fairbuild-permits, fairbuild-submittals, fairbuild-punch-lists, fairbuild-closeout |
| Bids, backlog and bonding (3) | fairbuild-bid-leveling, fairbuild-backlog, fairbuild-bonding-capacity |
| Service and warranty (2) | fairbuild-service-tickets, fairbuild-warranty-callbacks |

They read files contractors already export: Procore (budget, commitments, change orders, submittals, punch list, inspections), Sage 100 and 300 Contractor (job cost, AP invoices, timecards), Foundation (job cost), Vista (job cost estimates and detail), QuickBooks (job estimates against actuals), Buildertrend (purchase orders, bills, change orders), ServiceTitan (jobs, timesheets), the WH-347 certified payroll layout, and plain spreadsheets.

Every agent is read and report only. Nothing pays, files or releases a lien, submits or approves a pay application, posts to the ledger, runs or submits payroll, requests a bond or sends a message. Each agent writes one kind of draft (memo, letter, notice, request, journal, summary) marked DRAFT; sending it goes through a one-click request tool tied to the draft's hash. Five agents also record one-click money approvals for accounts payable to act on (`retainage_request_payment`, `fringes_request_payment`, `three_way_match_request_approval`, `backcharges_request_deduction`, `payment_release_request_release`).

## Naming (Kurt's rule, applied on 18 Nov)

The agents were first built under river names (`rhine-of-costcodes` and so on). They were renamed to `fairbuild-<what it does>`: folder, package name, bin, `mcpName`, tool prefix (short job words: `job_cost_check`, `lien_waivers_check`, `payment_release_request_release`), output folder (`fairbuild-out/<job words>`), report file names, titles ("Fairbuild WIP Schedule", acronyms kept), READMEs, plugin files, registry metadata, sample reports and sales copy. Evals were regenerated and every test, eval and check below was run again after the rename. All 30 new names are free on npm (E404, 18 Nov). The two scaffolders (`scripts/new-agent.mjs` and the core's `fairbuild-new-agent`) now accept only `fairbuild-<1 to 4 job words>`.

## The ver 6 checklist

| # | Bar | Result |
|---|---|---|
| 1 | One family core (Lodestar pattern), one job per agent, 30+ agents | `fairbuild-core` copied from the Lodestar core working tree (18 Nov Windows fixes included), freight code replaced by construction modules (`construction.js`, `construction-sources.js`, construction export catalog, report texts, column words) and personal-data masking (`personal.js`, ported from the Remedy core). 30 agents on the shared `standardTools` / `draftPair` / `requestTool` / `refusedTools` kit. |
| 2 | 20+ tests and 15+ eval cases per agent, all pass | 795 tests pass (127 core, 668 agents: 21 to 25 per agent). 691 eval cases pass (21 to 27 per agent). |
| 3 | `npm run hostile` and `npm run hostile:args`: 0 findings | Data, export and argument passes: 30 agents, 16,785 calls, 850 planted values, 0 findings. Rerun inside `release:check:offline --full` after the scale fixes: 0 findings. |
| 4 | Binding actions refused or one named click; release check's one-click policy passes | 91 refused tools (3 per agent, 4 for `fairbuild-commitments`), each an eval case that must come back `blocked`. 35 request tools, all in one-click categories (`binding_send` for sending, `move_money` for the five money approvals, `production_deploy` for the WIP journal), all `ask`; the generated policy evals check each is `needs_approval` even in Auto. Release check: "no one-click tool is set to allow". |
| 5 | Reads exports in the 9 languages; `--lang` for pages | `npm run intl`: 450 spreadsheet eval cases rerun as German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean exports (legacy encodings, `1.234,56`, local dates, local column names): every case that passes in English passes in all eight. 377 of 420 column names have translated words (German count). Report pages in nine languages (contract test per agent). |
| 6 | Root README in 9 languages; every agent has README, CHANGELOG, LICENSE (MIT) | Done. Agent READMEs: the top (what it does, what it needs, its checks with a real example of each from the fixtures, limits) from `scripts/agent-readmes.mjs`, the middle (demo run, tools, columns, install, modes, CLI) from `scripts/readme-sections.mjs`; `readme:check` passes. Root README translations from `scripts/readme-i18n.mjs`. |
| 7 | `npm run bench` (10,000 rows) and `release:check:offline` pass | Both pass. `npm run bench`: 91 tools across 30 agents at 1,000 and 10,000 rows, 0 need attention; slowest 4.5 s at 10,000 rows, peak memory 309 MB (after the scale fixes below). `release:check:offline`: "Dry run passed, 1 skipped" (npm name and version checks are skipped offline; names were checked separately with `npm view`), working tree clean, honest copy, one-click policy, tests, evals, hostile and packing (31 packages, 631 KB) all ok; the same check with `--full` (argument pass included) also passed. |
| 8 | `npm test` passes on Windows with Node 24 | Node v24.20.0, Windows 10: 795/795. |
| 9 | MCP Registry ready | `node ..\add-mcp-registry.cjs fairbuild-agents fairbuild.html` after the rename: `mcpName` (`io.github.fpavia111-creator/fairbuild-<job words>`) and `server.json` for all 30 agents; titles keep acronyms ("Fairbuild WIP Schedule"). |
| 10 | Masking on for personal data; fictional data only | Worker and technician names, worker ids, SSNs, homeowner names, phones, emails and addresses are masked in everything returned to the model (default `--personal mask`). `npm run masking`: 53 fictional canaries planted in 7 agents' fixtures, 166 calls, 0 leaks (self-test with masking off: 213 leaks, so the check works). Every fixture is fictional ("Example Concrete LLC", "Sample Painting Co", made-up people). |

## Checks run, and results

| Check | Result |
|---|---|
| `npm test` (31 workspaces, Node 24.20.0, Windows 10) | 795 tests, 795 pass |
| `npm run evals` | 691 eval cases across 30 agents, all pass (21 to 27 per agent) |
| `npm run hostile:args` (formulas, HTML, `../` ids and AI-aimed instructions planted in every fixture and every argument, every eval case) | 30 agents, 16,785 calls, 850 planted values, 149 results flagged for instruction-like text, 45 calls refused or held because of planted data, 0 findings |
| `npm run intl` (8 languages) | 450 cases with spreadsheet inputs per language, all pass; 377 of 420 column names translated |
| `npm run columns:check` | 68 sources, no translated word belongs to two fields of one file |
| `npm run masking` | 7 agents with personal columns, 53 canaries, 166 calls, 0 leaks |
| `npm run mcp:check` (official MCP SDK client over real stdio, installed with `--no-save`) | 30 agents, 307 tools, 0 issues (rerun after the rename) |
| `npm run bench` (1,000 and 10,000 rows per input file) | 91 tools across 30 agents, 0 need attention; slowest 4.5 s at 10,000 rows, peak memory 309 MB. Before the scale fixes: one timeout (>180 s) and four tools at 3 to 65 s |
| `npm run release:check:offline` | Dry run passed, 1 skipped (npm names, offline); every other check ok, 31 packages, 631 KB packed. Also passed with `--full` |
| `npm run plugin:check`, `npm run readme:check` | both pass (61 plugin files; 30 agent READMEs) |
| `npm view <name>` for all 31 names (read-only) | all 31 free on npm (E404 from registry.npmjs.org) |
| Demos | every `demo` run on its fictional files; output captured in each README |
| Sample reports | `sample-reports/`: an HTML page and a CSV worklist for every agent (60 files) plus `index.html`, in English, on fictional data |

## Found and fixed during the build

- **Core, header letter case (reported by the Fairmake session, confirmed here):** a header that is a field's own name in another case ("Vendor" for `vendor`, "Invoice_Number") was not re-keyed, so the agent read a blank column. `fairbuild-payment-release` read 0 of 6 invoices from such a file and said nothing. Fixed in `sources.js`, with a core test and a new contract variant ("headers in title case") that every agent now runs.
- **Core, very long paths:** the hostile argument pass found that a write tool given an `out_dir` of 200,000 characters never returned on Windows (a recursive mkdir that does not give up). `safePath` now refuses names over 255 characters and paths over 1,024 before touching the disk. The argument pass itself replayed the earlier eval cases for every bad value (more than five minutes for one agent); it now runs that setup once per tool.
- **Scale (found by the 10,000-row bench):** `fairbuild-duplicate-vendors` compared every vendor and invoice with every other (more than 3 minutes, timed out); it now compares only vendors that share a tax id, bank account, address, phone or the start of a name word, and invoices inside one vendor group (0.9 s, same results). `fairbuild-warranty-callbacks` rescanned every earlier callback and listed all of them (65 s); it now finds the window by binary search and names the five latest ("and N more") (3 s). `fairbuild-delivery-tickets` (36 s) and `fairbuild-lien-waivers` (3.5 s) index tickets by supplier and waivers by vendor (under 1 s). `fairbuild-bid-leveling` counted a scope item listed twice twice (32 s and a doubled plug); a scope item now counts once per package, at the higher plug whatever the row order (0.4 s). The core masker now indexes registered names by first word and length.
- **Core, column words:** in French and Italian "Caisse"/"Cassa" was a word for both the union local and the union fund, so `fairbuild-union-fringes` read the fund as the local (the language check failed 8 cases in French and Italian). The union local got its own words. A new check (`npm run columns:check`) then found three more fields sharing words inside one file: the submittal and revision numbers in `fairbuild-submittals` (both took "reference" words, even "check number"), the per-occurrence and aggregate limits in `fairbuild-insurance-certificates`, and Italian "Posizione" for both punch item and location. Each got its own words.
- **Core, retainage columns:** Procore's commitments export has "Retainage" and "Retainage %"; the `%` was dropped from header names, so both mapped to one field. `%` is kept now ("pct"), and an English alias never takes a column another field already took.
- **Core, report pages:** the report titles, sections and labels were still freight words, so the job cost report page came out half English in other languages (2 failing contract tests). Construction texts for all 30 titles in nine languages.
- **Row order (contract test):** duplicate-vendor pairs and leveled bids depended on the order of rows in the file. Both sort first now.
- **Double counting:** `fairbuild-delivery-tickets` accrued a ticket that was both "probably billed" and "not invoiced"; `fairbuild-backcharges` counted a subcontractor's shortfall against every open backcharge of that subcontractor. Both count once now (backcharges allocate the room left in date order).
- **`fairbuild-closeout`:** a total named `items` collided with the list of items (an eval caught it); renamed `item_count`.
- **`fairbuild-sub-compliance`:** "W9" on a vendor's document list did not match "W-9" in the requirements; names compare without punctuation now.
- **Eval expectations:** a `not_contains: "late"` also matched "translated" in language notes; a `not_contains: "4411"` (a worker id that must stay masked) failed once in the Chinese run because a random hex pseudonym happened to contain those digits. The eval runner now has `not_matches` for short values, and both cases test the finding or the whole value. Several hand-written expectations were wrong arithmetic on my side (job cash flow October net, bonding aggregate, job cost open markers) and were corrected against the fixtures.
- **Stable READMEs:** demos and README generation use a fixed pseudonym key for the fictional fixtures (`DEMO_PERSONAL_KEY`), so READMEs no longer change on every run; real runs keep the per-customer random key.
- **Scripts from Lodestar:** the README demo capture kept Windows temp paths (`C:\Users\...\AppData\Local\Temp`); freight words in the plugin marketplace, bench id columns and README text; a hostile-check exception for a Lodestar agent; scripts that took the tool prefix as the first word of a tool name (wrong for `payment_release_*`). All fixed.
- **Windows output:** the hostile, intl, evals and release scripts ended with `process.exit()`, which on Windows can drop output still queued for a pipe (a piped hostile run printed 9 of 30 agents and no summary). They set `process.exitCode` now.
- **Packing:** two stray `fixtures/.fairbuild/` folders from manual CLI runs would have been published; the release check caught them and they were removed.
- **Honest copy:** "certified payroll" is the name of the WH-347 report, not a claim; the release check's ban on "certified" now allows that phrase, the agent name and the tool prefix only.

## Not checked yet (say this out loud)

- **Export layouts:** the column names for Procore, Sage 100 and 300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan and the WH-347 layout were written from public documentation and memory (every profile is marked `recalled`), not from a live account. The first setup confirms them with `inspect`. In the language check, files in a named product's layout (`fixtures/exports/`) are kept in English: once their headers are translated they are no longer that layout, and the generic reader is what the other 450 cases test.
- **Rules:** prevailing-wage overtime, fringe credits and apprentice rates, retainage limits, lien waiver forms and deadlines, pay-when-paid, insurance requirements, sales and use tax and bonding limits vary by state, contract and surety. They are settings with example values. A construction accountant, a construction lawyer, a labor compliance adviser and the customer's surety broker should read the defaults before a client relies on them.
- **Node 20 and 22, and Linux:** only Node 24 on Windows was run here. `engines` says Node 20 or newer; `.github/workflows/test.yml` runs Linux and Windows on 20, 22 and 24 once the repository is pushed.
- **Translations:** root READMEs and report headings in eight languages were written by Claude and not reviewed by native speakers. Agent READMEs, finding sentences and sales copy are English only.
- **Real data:** no real contractor export has been read. No contractor, construction accountant, lawyer or surety has reviewed the agents.
- **Sample report pages** were checked as text (title, summary, tables, CSV columns), not looked at in a browser: the preview pane does not screenshot local files.
- **Duplicate vendors:** two names now count as candidates only if they share the start of a word or the first five letters; a name word shared by more than 200 vendors is not used on its own. A same-name pair that shares neither would no longer be compared (none in the fixtures).

## Decisions made without Kurt

- **Names:** `fairbuild-<job words>` per Kurt's rule; tool prefixes are short job words (`coi` for insurance certificates, `sov` for schedule of values, `wip`, `fringes`, `rentals`, `duplicates`, `service`, `warranty`, `bonding`, `punch_list`); the rest are the package's job words in snake_case.
- **Agent list:** built from the brief's examples (job cost against budget, commitments, change orders, pay applications, WIP, retainage, lien waivers, insurance certificates, certified payroll, subcontractor compliance) plus union fringes, timecards, equipment rentals, delivery tickets, three-way match, duplicate vendors, permits and inspections, bid leveling, backlog and margin fade, warranty callbacks, service tickets, sales and use tax, closeout, punch lists, submittals, bonding capacity, job cash flow, backcharges and the payment release check.
- **Refused outright, not one click:** filing or releasing a lien (`fairbuild-lien-waivers`), submitting or approving a pay application (`fairbuild-pay-applications`, `fairbuild-schedule-of-values`), posting to the ledger (`fairbuild-wip-schedule`, `fairbuild-backlog`, `fairbuild-sales-tax`), running or submitting payroll (`fairbuild-certified-payroll`, `fairbuild-timecards`, `fairbuild-service-tickets`), requesting bonds (`fairbuild-bonding-capacity`), paying (every agent that touches payables), sending email (every agent).
- **Masking:** workers, technicians and homeowners are people and are masked; companies (owners, subcontractors, suppliers, sureties) are business data and are not. Pseudonyms are stable per customer (`PERSON-3f9a1c2e`, key in `.fairbuild/personal.key`); explain accepts them. Report files keep the real names for the person reading them. Vendor phones and emails in `fairbuild-duplicate-vendors` are masked too, to be safe.
- **Pay-when-paid and waivers** are settings in `fairbuild-payment-release` (on by default only when the owner payment or waiver file is given), because whether they apply is a contract and state-law question.
- **Settings:** every threshold, rate and rule is a setting in the customer's JSON file with working defaults; results list `settings_used`. A misspelled settings key is an error naming the schema, not silently ignored.
- **Pricing (in `sales/`), proposals for Kurt:** packs from 1,500 to 4,000 for one company, whole back office 12,000, partner rollout (up to 5 companies, for contractor groups and accounting firms) 15,000 plus 2,000 per extra company, support 200 a month per pack, 600 for the whole back office, 250 per company for partner rollouts. Above the restaurant family, because a contractor's back office moves more money per transaction and works under more rules per job.
- **Site page name:** `fairbuild.html` on fair-agents.com (used in the MCP Registry metadata and the README links).

## Final pass (19 Nov 2026)

Run at the main session's request after the family was public on GitHub and live on fair-agents.com, following `FINAL-PASS-REQUEST.md` and the brief's "Final pass" list. Every number below is from a fresh `git clone` of this folder and `npm install --offline` on Windows 10, Node v24.20.0, unless it says otherwise.

### The checklist

| # | Point | Result |
|---|---|---|
| 1 | Names | Every package, bin, tool prefix, title, README and CHANGELOG uses `fairbuild-<what it does>`. `git grep` for the old river names finds only the rename history in this review and "Shannon entropy" (a maths term in the core). |
| 2 | Read as a buyer | Each agent README now has a "What it refuses, and what waits for a person" section, generated from the agent's own policy, besides what it does, what it needs, its checks (a real example of each from the fixtures) and its limits. Demos and sample reports regenerated. |
| 3 | Honest copy | The sub-compliance summary said "fully compliant"; it now says "with every required document on file and current" (and the result key `vendors_compliant` is now `vendors_complete`). No compliance, certification, savings or advice claims are left in READMEs, `site.json`, the pricing page or the sample reports; "certified payroll" is the report's name. Release check: honest copy ok. |
| 4 | Binding actions | 91 tools refused outright, 35 one-click request tools; release check: no one-click tool is set to allow. |
| 5 | Full bar from a clean install | All pass from a fresh clone on Windows 10, Node v24.20.0: `npm test` 795/795 (127 core, 668 agents; 21 to 25 per agent), evals 691/691, `npm run accuracy` (below), `hostile:args` 0 findings (data, export and argument passes; 16,785 calls, 850 planted values), `bench` 91 tools at 1,000 and 10,000 rows with 0 needing attention (slowest 4.5 s, peak 309 MB), `intl` 450 cases in 8 languages all passing, `masking` 0 leaks, `columns:check` 0 clashes, `readme:check` and `plugin:check` pass, `release:check:offline` "Dry run passed, 1 skipped" (npm names are checked online only; all 31 names were checked with `npm view`), working tree clean. |
| 6 | Fictional fixtures, masking | Every party in the fixtures is an "Example", "Sample" or "Test" name or a code. Masking now also covers the contractor's own staff named on records (project manager, superintendent, foreman, estimator). |
| 7 | `site.json` and pricing | 10 packages with the same names and prices in `site.json` and `pricing-page-ver1.md`; the 8 packs cover all 30 agents once; `site.json` check names match the agents. |
| 8 | Packing | Release check from a fresh clone: 31 packages, 634 KB packed, no tests, state, output, keys or `.npmrc`; secret scan of 1,053 tracked files found nothing; no `.fairbuild` or `fairbuild-out` state is tracked. |

Also found and fixed in this pass:

- **Line endings on a Windows clone.** A fresh clone checked READMEs and plugin files out with CRLF (git for Windows default), so `readme:check` and `plugin:check` failed on a clean install. `.gitattributes` now keeps code and docs LF and fixtures byte-exact, and both checks compare line ends as LF. Both pass on a fresh clone.
- **Real data** (below) found two false-positive patterns in `fairbuild-permits`, now fixed and tested.

### Question 1: accuracy

Measured by `npm run accuracy` (`scripts/accuracy.mjs`) on the fictional fixtures. Planted: the problem types each agent's fixtures were built to contain (its `every-planted-issue` eval case); recall is the share found. Clean: the rows the agent passed, run again on their own; every finding there counts as a false positive. Mutations: one clean row changed to carry one known problem (for three agents whose fixtures have no clean row, a planted row that did not yet carry that problem).

| Agent | Planted types found | Clean rows | False positives on clean rows | Mutations caught |
|---|---:|---:|---:|---:|
| `fairbuild-backcharges` | 5/5 | 1 | 0 | 2/2 |
| `fairbuild-backlog` | 5/5 | 7 | 0 | 1/1 |
| `fairbuild-bid-leveling` | 6/6 | 3 | 0 | 2/2 |
| `fairbuild-bonding-capacity` | 4/4 | 4 | 0 | 1/1 |
| `fairbuild-certified-payroll` | 6/6 | 0 | 0 | 2/2 (on planted rows) |
| `fairbuild-change-orders` | 8/8 | 1 | 0 | 2/2 |
| `fairbuild-closeout` | 3/3 | 2 | 0 | 1/1 |
| `fairbuild-commitments` | 9/9 | 1 | 0 | 1/1 |
| `fairbuild-delivery-tickets` | 6/6 | 1 | 0 | 1/1 |
| `fairbuild-duplicate-vendors` | 7/7 | 1 | 0 | 1/1 |
| `fairbuild-equipment-rentals` | 5/5 | 1 | 0 | 2/2 |
| `fairbuild-insurance-certificates` | 7/7 | 3 | 0 | 2/2 |
| `fairbuild-job-cash-flow` | 3/3 | 3 | 0 | 1/1 |
| `fairbuild-job-cost` | 8/8 | 1 | 0 | 1/1 |
| `fairbuild-lien-waivers` | 6/6 | 1 | 0 | 2/2 |
| `fairbuild-pay-applications` | 5/5 | 5 | 0 | 1/1 |
| `fairbuild-payment-release` | 6/6 | 1 | 0 | 2/2 |
| `fairbuild-permits` | 6/6 | 1 | 0 | 2/2 |
| `fairbuild-punch-lists` | 5/5 | 4 | 0 | 2/2 |
| `fairbuild-retainage` | 6/6 | 1 | 0 | 1/1 |
| `fairbuild-sales-tax` | 5/5 | 2 | 0 | 2/2 |
| `fairbuild-schedule-of-values` | 6/6 | 7 | 0 | 1/1 |
| `fairbuild-service-tickets` | 4/4 | 2 | 0 | 1/1 |
| `fairbuild-sub-compliance` | 6/6 | 6 | 0 | 2/2 |
| `fairbuild-submittals` | 6/6 | 2 | 0 | 1/1 |
| `fairbuild-three-way-match` | 6/6 | 2 | 0 | 2/2 |
| `fairbuild-timecards` | 6/6 | 0 | 0 | 2/2 (on planted rows) |
| `fairbuild-union-fringes` | 6/6 | 0 | 0 | 1/1 (on planted rows) |
| `fairbuild-warranty-callbacks` | 5/5 | 1 | 0 | 2/2 |
| `fairbuild-wip-schedule` | 4/4 | 3 | 0 | 2/2 |
| **Family** | **170/170** | **67** | **0** | **46/46** |

What this does not show: the fixtures are small (67 clean rows for 30 agents) and were written by the same author as the agents. No real contractor export has been measured. On real public data (below) the permits agent's first run had 736 false positives out of 737 findings, fixed in this pass, which is the better warning about real-world accuracy.

### Question 2: what reaches the model

When an assistant calls a tool, the agent reads the exported files on the user's computer and returns a result to the assistant, which sends it to whatever model that assistant uses. For sensitive records, use a local model or one covered by your own agreements. No claim of compliance with any privacy law is made.

Masked in everything returned (results, error messages, approval previews, also inside sentences): worker and technician names, worker ids, Social Security numbers (also any `000-00-0000` pattern in text), homeowner names, phones, emails and addresses, the contractor's own staff named on records (project manager, superintendent, foreman, estimator), birth dates; ZIP codes and named workers' pay rates in `--personal strict`. In clear: amounts, dates, job numbers, cost codes, quantities, statuses, and company names (owners, subcontractors, suppliers, insurers, sureties), which are business data. Free text typed into a description or notes field is sent as written, apart from the masked values and SSN, e-mail and phone patterns. The report files written on the user's computer keep real values.

| Agent | Masked fields | Free-text fields | In clear |
|---|---|---|---|
| `fairbuild-backcharges` | none | description | 12 fields (backcharge, job, vendor, date, amount, status, ...) |
| `fairbuild-backlog` | none | none | 5 fields (job, period, contract_amount, estimated_cost, cost_to_date) |
| `fairbuild-bid-leveling` | none | includes, exclusions, item | 7 fields (bid_package, bidder, base_bid, bond, addenda_acknowledged, received_at, ...) |
| `fairbuild-bonding-capacity` | none | none | 9 fields (job, job_name, contract_amount, estimated_cost, cost_to_date, bonded, ...) |
| `fairbuild-certified-payroll` | worker, worker_id | none | 9 fields (job, week_ending, classification, hours, overtime_hours, rate_paid, ...) |
| `fairbuild-change-orders` | none | description | 12 fields (change_order, job, co_type, status, amount, cost, ...) |
| `fairbuild-closeout` | project_manager | item | 6 fields (job, job_name, completion_date, status, due_date, received_date) |
| `fairbuild-commitments` | none | description | 27 fields (commitment, commitment_type, job, vendor, cost_code, cost_type, ...) |
| `fairbuild-delivery-tickets` | none | none | 11 fields (ticket, supplier, job, date, material, quantity, ...) |
| `fairbuild-duplicate-vendors` | phone, email | none | 12 fields (vendor_id, name, tax_id, address, city, bank_last4, ...) |
| `fairbuild-equipment-rentals` | none | description | 13 fields (equipment_id, vendor, job, invoice_number, period_from, period_to, ...) |
| `fairbuild-insurance-certificates` | none | none | 14 fields (vendor, coverage, insurer, policy_number, effective, expires, ...) |
| `fairbuild-job-cash-flow` | none | none | 7 fields (job, date, amount, party, invoice, invoice_date, ...) |
| `fairbuild-job-cost` | none | description | 28 fields (job, cost_code, cost_code_name, cost_type, original_budget, approved_changes, ...) |
| `fairbuild-lien-waivers` | none | none | 12 fields (check_number, vendor, job, date, amount, invoice_number, ...) |
| `fairbuild-pay-applications` | none | item, description | 12 fields (job, application, period_to, scheduled_value, previous, this_period, ...) |
| `fairbuild-payment-release` | none | description | 24 fields (invoice_number, vendor, vendor_id, job, cost_code, cost_type, ...) |
| `fairbuild-permits` | none | none | 11 fields (permit_number, job, type, jurisdiction, issued, expires, ...) |
| `fairbuild-punch-lists` | none | item, location, description | 9 fields (job, trade, vendor, created, due_date, status, ...) |
| `fairbuild-retainage` | none | description | 25 fields (job, client, contract_amount, billed_to_date, retainage_pct, retainage_held, ...) |
| `fairbuild-sales-tax` | none | none | 8 fields (invoice_number, vendor, job, jurisdiction, amount, tax, ...) |
| `fairbuild-schedule-of-values` | project_manager | item, description | 32 fields (job, application, period_to, scheduled_value, previous, this_period, ...) |
| `fairbuild-service-tickets` | technician | none | 12 fields (ticket, date, business_unit, job_type, status, invoice_total, ...) |
| `fairbuild-sub-compliance` | none | none | 7 fields (vendor, document_type, status, received_date, expires, value, ...) |
| `fairbuild-submittals` | none | title | 11 fields (submittal, revision, spec_section, vendor, status, ball_in_court, ...) |
| `fairbuild-three-way-match` | none | description | 29 fields (invoice_number, vendor, vendor_id, job, cost_code, cost_type, ...) |
| `fairbuild-timecards` | worker, worker_id | none | 9 fields (date, job, cost_code, hours, overtime_hours, start_date, ...) |
| `fairbuild-union-fringes` | worker, worker_id | none | 8 fields (union, month, hours, union_fund, rate, hours_reported, ...) |
| `fairbuild-warranty-callbacks` | homeowner, contact_phone | description | 10 fields (callback_id, job, date_reported, trade, vendor, cost, ...) |
| `fairbuild-wip-schedule` | none | none | 6 fields (job, job_name, contract_amount, estimated_cost, cost_to_date, billed_to_date) |

Re-run in this pass: `npm run masking` (53 fictional canaries in 7 agents, 166 calls, 0 reached the model; 213 do with masking off) and `npm run hostile:args` (16,785 calls, 850 planted values, 0 findings).

### Question 3: compatibility

| Source | Export | Status |
|---|---|---|
| Procore | Budget; Commitments; Change Orders; Submittals; Punch List; Inspections (each "export to CSV") | written from documentation |
| Sage 300 Construction and Real Estate | Job cost detail; AP invoice register; payroll timecards | written from documentation |
| Sage 100 Contractor | Job cost records | written from documentation |
| Foundation | Job cost detail | written from documentation |
| Vista | JC estimates; JC cost detail | written from documentation |
| QuickBooks | Job Estimates vs. Actuals Detail | written from documentation |
| Buildertrend | Purchase Orders; Bills; Change Orders | written from documentation |
| ServiceTitan | Jobs; Technician timesheets | written from documentation |
| U.S. Department of Labor | WH-347 certified payroll column order | written from documentation |
| City of Austin, NYC Department of Buildings | Issued building permits (open data CSV) | tested on public data, with a column mapping |

So 0 of 20 named vendor exports have been tested against a real export; all 20 are marked `recalled` in the core catalog and the first setup confirms them with `inspect`. The generic reader (any CSV or Excel file, columns named once in `fairbuild-sources.json`) was tested on 10,000 rows of public permit data in two real formats (ISO dates with time; month-first dates).

### Question 4: commercial traction

None yet. The main session reports no paying customers for the suite and no live checkout. The prices in `sales/` are proposals for Kurt.

### Question 5: support, and every dated rule

Nobody maintains rules for a customer automatically, and the agents never fetch rules from the internet. The customer keeps the rule files; paid support (the monthly price in `sales/`) is the offer to update them. Every result lists the values it used (`settings_used`, and the files it read).

| Rule | Where it lives | Source | Date | How a customer updates it |
|---|---|---|---|---|
| Prevailing wage rates per classification | `rates.csv` given to `fairbuild-certified-payroll` | The job's Davis-Bacon wage determination (SAM.gov) | the determination's own modification date; not stored by the agent (add `wd_number` and `modification` columns: extra columns are kept) | Replace `rates.csv` when the determination is modified |
| Overtime after 40 straight-time hours a week, at 1.5 times the base rate | `fairbuild-certified-payroll` settings `weekly_ot_after`, `ot_multiplier` (defaults 40 and 1.5) | Contract Work Hours and Safety Standards Act (40 U.S.C. 3702) | written 18 Nov 2026 from memory, not checked against the statute text | settings.json |
| Only the last four SSN digits or an id on a certified payroll | built into `fairbuild-certified-payroll` (`full_ssn_on_report`) | WH-347 instructions | written 18 Nov 2026 from memory | not a setting; a code change |
| Union fringe contribution rates and due day | `rates.csv` and `due_day` (default 15) for `fairbuild-union-fringes` | The collective bargaining agreements | the customer's | Replace `rates.csv`; settings.json |
| Sales and use tax rates by jurisdiction | `rates.csv` for `fairbuild-sales-tax` | The state revenue department's rate tables | the customer's (rates change quarterly in many states) | Replace `rates.csv` |
| Insurance coverages and minimum limits | `requirements.json` for `fairbuild-insurance-certificates` | The customer's subcontract insurance schedule | the customer's | Edit `requirements.json` |
| Compliance documents per trade, safety rating limit | `requirements.json` for `fairbuild-sub-compliance` | The customer's prequalification rules | the customer's | Edit `requirements.json` |
| Retainage rate | `retainage_pct` per job or subcontract in the files read by `fairbuild-retainage`, `fairbuild-commitments` and `fairbuild-payment-release`; settings default 10% in `fairbuild-pay-applications` | The contract; some states cap retainage on public work | state caps not encoded; the 10% default is an example | the files, or settings.json |
| Single and aggregate bonding limits | `limits.json` for `fairbuild-bonding-capacity` | The surety's letter | the letter's date | Edit `limits.json` |
| Warranty term | `warranty_months` (default 12) or per job in the jobs file | The contracts | the customer's | settings.json or jobs file |
| Lien waiver timing (unconditional due 30 days after payment) | `unconditional_days` for `fairbuild-lien-waivers` | Customer practice; statutory waiver forms differ by state and are not checked | not encoded | settings.json |
| Permit renewal window, renewals per job and type | `expiring_days` (30), `latest_per_job_and_type` (true) | Jurisdiction rules are not encoded | n/a | settings.json |

Export layouts change when a vendor changes a report: the 20 named layouts live in `packages/fairbuild-core/src/exports.js`; a customer can map any changed column in `fairbuild-sources.json` without a release.

### Real data

Building permits are the one Fairbuild input that cities publish in its real format; everything else the agents read is a contractor's private record, and no vendor publishes a sample export we could use. So 1 of 30 agents was tested on real data (`fairbuild-permits`); the other 29 were not. Script: `scripts/realdata.mjs` (downloads to the git-ignored `_realdata/`, requests only permit columns, never contractor or applicant names); results and notes: `realdata/README.md` and `realdata/results.json`.

| Source | Downloaded | Licence | Rows | Found |
|---|---|---|---|---|
| City of Austin, Issued Construction Permits (https://data.austintexas.gov/Building-and-Development/Issued-Construction-Permits/3syk-w9eu) | 19 Nov 2026 | Public Domain U.S. Government | 5,000 | 1 expired (its status says Expired), 4 expiring |
| NYC Department of Buildings, DOB Permit Issuance (https://data.cityofnewyork.us/Housing-Development/DOB-Permit-Issuance/ipu4-2q9a) | 19 Nov 2026 | NYC Open Data terms of use (no licence in the portal metadata) | 5,000 issued in 2026 | 221 past expiry with no renewal of the same type in the file, 63 expiring |

False positives: the first Austin run flagged 736 finaled permits as expired (fixed: a status starting with Final, Finaled, Withdrawn or Aborted counts as closed); the first NYC run flagged older rows of renewed permits (fixed: per job, type and jurisdiction only the permit that expires last is checked; 377 of 598 past-date NYC rows are now recognised as renewed). The 221 NYC permits still flagged cannot be confirmed either way: the public data has no sign-off status.

### Final numbers

- Tests: 795/795 (Windows 10, Node v24.20.0, fresh clone).
- Evals: 691/691 (21 to 27 per agent).
- Accuracy on fictional fixtures: 170/170 planted problem types found, 0 findings outside the planted lists, 0 false positives on 67 clean rows, 46/46 one-field mutations caught.
- Hostile inputs: 0 findings in 16,785 calls. Masking: 0 of 53 canaries reached the model.
- Languages: 450 spreadsheet cases pass in 8 languages. Bench: 91 tools, slowest 4.5 s at 10,000 rows.
- Real data: 2 public files (10,000 permit records) on 1 agent; 2 false-positive patterns found and fixed; 221 NYC findings not confirmable from public data.
- Formats: 0 of 20 named vendor exports tested on a real export.
- Release check (offline): "Dry run passed, 1 skipped" (npm names are checked online only; all 31 names were checked with `npm view`), working tree clean.

### For Kurt to decide

- The prices in `sales/` are still proposals.
- Whether to show the accuracy numbers on the site as they are: they are on small fictional fixtures written by the same author, and the one real-data test found 736 false positives before the fix.
- Whether to look for a contractor willing to share one real export per vendor (Procore, Sage, Foundation, Vista): 20 of 20 named layouts are untested on a real export.

## For the main session

- `sales/site.json` is in the brief's exact shape (10 packages, 6 groups, 30 checks named like the agents); `sales/pricing-page-ver1.md` lists the new package names with plain-number prices.
- MCP Registry metadata points at `https://fair-agents.com/fairbuild.html`; change the page name if the site uses another, and rerun `add-mcp-registry.cjs` (then set the titles from the package descriptions again: the shared script title-cases "WIP" as "Wip").
- `sales/final-pass.json` is in the shape from `FINAL-PASS-REQUEST.md`, for the product page; every number in it is from the final pass above.
- Worth porting to other family cores: the header-case fix in `sources.js`, the path-length guard in `util.js` `safePath`, the masker index in `personal.js`, `scripts/column-words-check.mjs`, `scripts/masking-check.mjs`, `scripts/accuracy.mjs` (per-agent link table), `.gitattributes` (a Windows clone otherwise fails `readme:check`), and `process.exitCode` instead of `process.exit()` at the end of long scripts.
- Since the public push, this pass changed agent code in `fairbuild-permits` (finaled permits and renewals), `fairbuild-sub-compliance` (wording and the `vendors_complete` key) and the core masker (staff names), plus READMEs, sample reports and scripts. GitHub needs the new commits; nothing is on npm yet (`npm view` E404 on 19 Nov), so every package stays at 0.1.0.
- Nothing was published, pushed, uploaded or sent. All work is in local commits in this folder.
