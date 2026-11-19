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
| 2 | 20+ tests and 15+ eval cases per agent, all pass | 791 tests pass (125 core, 666 agents: 22 to 25 per agent). 691 eval cases pass (21 to 27 per agent). |
| 3 | `npm run hostile` and `npm run hostile:args`: 0 findings | Data, export and argument passes: 30 agents, 16,785 calls, 850 planted values, 0 findings. Rerun inside `release:check:offline --full` after the scale fixes: 0 findings. |
| 4 | Binding actions refused or one named click; release check's one-click policy passes | 91 refused tools (3 per agent, 4 for `fairbuild-commitments`), each an eval case that must come back `blocked`. 35 request tools, all in one-click categories (`binding_send` for sending, `move_money` for the five money approvals, `production_deploy` for the WIP journal), all `ask`; the generated policy evals check each is `needs_approval` even in Auto. Release check: "no one-click tool is set to allow". |
| 5 | Reads exports in the 9 languages; `--lang` for pages | `npm run intl`: 450 spreadsheet eval cases rerun as German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean exports (legacy encodings, `1.234,56`, local dates, local column names): every case that passes in English passes in all eight. 377 of 420 column names have translated words (German count). Report pages in nine languages (contract test per agent). |
| 6 | Root README in 9 languages; every agent has README, CHANGELOG, LICENSE (MIT) | Done. Agent READMEs: the top (what it does, what it needs, its checks with a real example of each from the fixtures, limits) from `scripts/agent-readmes.mjs`, the middle (demo run, tools, columns, install, modes, CLI) from `scripts/readme-sections.mjs`; `readme:check` passes. Root README translations from `scripts/readme-i18n.mjs`. |
| 7 | `npm run bench` (10,000 rows) and `release:check:offline` pass | Both pass. `npm run bench`: 91 tools across 30 agents at 1,000 and 10,000 rows, 0 need attention; slowest 3.3 s at 10,000 rows, peak memory 306 MB (after the scale fixes below). `release:check:offline`: "Dry run passed, 1 skipped" (npm name and version checks are skipped offline; names were checked separately with `npm view`), working tree clean, honest copy, one-click policy, tests, evals, hostile and packing (31 packages, 631 KB) all ok; the same check with `--full` (argument pass included) also passed. |
| 8 | `npm test` passes on Windows with Node 24 | Node v24.20.0, Windows 10: 791/791. |
| 9 | MCP Registry ready | `node ..\add-mcp-registry.cjs fairbuild-agents fairbuild.html` after the rename: `mcpName` (`io.github.fpavia111-creator/fairbuild-<job words>`) and `server.json` for all 30 agents; titles keep acronyms ("Fairbuild WIP Schedule"). |
| 10 | Masking on for personal data; fictional data only | Worker and technician names, worker ids, SSNs, homeowner names, phones, emails and addresses are masked in everything returned to the model (default `--personal mask`). `npm run masking`: 51 fictional canaries planted in 6 agents' fixtures, 143 calls, 0 leaks (self-test with masking off: 213 leaks, so the check works). Every fixture is fictional ("Example Concrete LLC", "Sample Painting Co", made-up people). |

## Checks run, and results

| Check | Result |
|---|---|
| `npm test` (31 workspaces, Node 24.20.0, Windows 10) | 791 tests, 791 pass |
| `npm run evals` | 691 eval cases across 30 agents, all pass (21 to 27 per agent) |
| `npm run hostile:args` (formulas, HTML, `../` ids and AI-aimed instructions planted in every fixture and every argument, every eval case) | 30 agents, 16,785 calls, 850 planted values, 149 results flagged for instruction-like text, 45 calls refused or held because of planted data, 0 findings |
| `npm run intl` (8 languages) | 450 cases with spreadsheet inputs per language, all pass; 377 of 420 column names translated |
| `npm run columns:check` | 68 sources, no translated word belongs to two fields of one file |
| `npm run masking` | 6 agents with personal columns, 51 canaries, 143 calls, 0 leaks |
| `npm run mcp:check` (official MCP SDK client over real stdio, installed with `--no-save`) | 30 agents, 307 tools, 0 issues (rerun after the rename) |
| `npm run bench` (1,000 and 10,000 rows per input file) | 91 tools across 30 agents, 0 need attention; slowest 3,260 ms at 10,000 rows, peak memory 306 MB. Before the scale fixes: one timeout (>180 s) and four tools at 3 to 65 s |
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

## For the main session

- `sales/site.json` is in the brief's exact shape (10 packages, 6 groups, 30 checks named like the agents); `sales/pricing-page-ver1.md` lists the new package names with plain-number prices.
- MCP Registry metadata points at `https://fair-agents.com/fairbuild.html`; change the page name if the site uses another, and rerun `add-mcp-registry.cjs` (then set the titles from the package descriptions again: the shared script title-cases "WIP" as "Wip").
- Worth porting to other family cores: the header-case fix in `sources.js`, the path-length guard in `util.js` `safePath`, the masker index in `personal.js`, `scripts/column-words-check.mjs`, `scripts/masking-check.mjs`, and `process.exitCode` instead of `process.exit()` at the end of long scripts.
- Nothing was published, pushed, uploaded or sent. All work is in local commits in this folder.
