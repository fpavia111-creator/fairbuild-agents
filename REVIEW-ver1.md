# Fairbuild ver 1: review

18 Nov 2026. The Fairbuild family (construction and trades back office: general contractors, subcontractors, trade service companies) built to the Mythos ver 6 bar from `BUILD-BRIEF.md`, without input from Kurt. What was built, every check with its numbers, what was found and fixed, what is not checked yet, and every decision made along the way.

## Scope

30 agents (river names) and `fairbuild-core`, version 0.1.0 each, in six areas:

| Area | Agents |
|---|---|
| Job cost, billing and cash (8) | rhine-of-costcodes, danube-of-commitments, volga-of-changeorders, seine-of-values, thames-of-payapps, loire-of-wip, nile-of-retainage, lena-of-cashflow |
| Subcontractors and payables (9) | yangtze-of-matching, platte-of-releases, tiber-of-waivers, ganges-of-insurance, indus-of-compliance, orinoco-of-vendors, brazos-of-backcharges, mekong-of-tickets, tagus-of-salestax |
| Payroll and labor (3) | hudson-of-wages, yukon-of-fringes, columbia-of-timecards |
| Field, permits and closeout (5) | colorado-of-equipment, zambezi-of-permits, oder-of-submittals, elbe-of-punchlists, douro-of-closeout |
| Bids, backlog and bonding (3) | congo-of-bids, limpopo-of-backlog, vistula-of-bonding |
| Service and warranty (2) | shannon-of-service, murray-of-warranty |

They read files contractors already export: Procore (budget, commitments, change orders, submittals, punch list, inspections), Sage 100 and 300 Contractor (job cost, AP invoices, timecards), Foundation (job cost), Vista (job cost estimates and detail), QuickBooks (job estimates against actuals), Buildertrend (purchase orders, bills, change orders), ServiceTitan (jobs, timesheets), the WH-347 certified payroll layout, and plain spreadsheets.

Every agent is read and report only. Nothing pays, files or releases a lien, submits or approves a pay application, posts to the ledger, runs or submits payroll, requests a bond or sends a message. Each agent writes one kind of draft (memo, letter, notice, request, journal, summary) marked DRAFT; sending it goes through a one-click request tool tied to the draft's hash. Five agents also record one-click money approvals for accounts payable to act on (`nile_request_payment`, `yukon_request_payment`, `yangtze_request_approval`, `brazos_request_deduction`, `platte_request_release`).

## The ver 6 checklist

| # | Bar | Result |
|---|---|---|
| 1 | One family core (Lodestar pattern), one job per agent, 30+ agents | `fairbuild-core` copied from the Lodestar core working tree (18 Nov Windows fixes included), freight code replaced by construction modules (`construction.js`, `construction-sources.js`, construction export catalog, report texts, column words) and personal-data masking (`personal.js`, ported from the Remedy core). 30 agents on the shared `standardTools` / `draftPair` / `requestTool` / `refusedTools` kit. |
| 2 | 20+ tests and 15+ eval cases per agent, all pass | 789 tests pass (125 core, 664 agents: 22 per agent, Danube 23, Rhine 25). 691 eval cases pass (21 to 27 per agent). |
| 3 | `npm run hostile` and `npm run hostile:args`: 0 findings | Data and export pass: 0 findings (3,473 calls, 850 planted values). **Argument pass: NOT finished.** It found a real hang (see below), now fixed in the core, but the full 30-agent argument run has not been redone. |
| 4 | Binding actions refused or one named click; release check's one-click policy passes | 91 refused tools (3 per agent, 4 for Danube), each an eval case that must come back `blocked`. 35 request tools, all in one-click categories (`binding_send` for sending, `move_money` for the five money approvals, `production_deploy` for Loire's journal), all `ask`; the generated policy evals check each is `needs_approval` even in Auto. Release check: "no one-click tool is set to allow". |
| 5 | Reads exports in the 9 languages; `--lang` for pages | `npm run intl`: 450 spreadsheet eval cases rerun as German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean exports (legacy encodings, `1.234,56`, local dates, local column names): every case that passes in English passes in all eight. 377 of 420 column names have translated words (German count). Report pages in nine languages (contract test per agent). |
| 6 | Root README in 9 languages; every agent has README, CHANGELOG, LICENSE (MIT) | Done. Agent READMEs: the top (what it does, what it needs, its checks with a real example of each from the fixtures, limits) from `scripts/agent-readmes.mjs`, the middle (demo run, tools, columns, install, modes, CLI) from `scripts/readme-sections.mjs`. Root README translations from `scripts/readme-i18n.mjs`. |
| 7 | `npm run bench` (10,000 rows) and `release:check:offline` pass | **Not finished.** `release:check:offline` passed every check except packing (2 stray state folders, since removed) before the last two core fixes; it has not been rerun. `npm run bench` has not been run. |
| 8 | `npm test` passes on Windows with Node 24 | Node v24.20.0, Windows 10. 789/789. |
| 9 | MCP Registry ready | `node ..\add-mcp-registry.cjs fairbuild-agents fairbuild.html`: `mcpName` and `server.json` for all 30 agents. |
| 10 | Masking on for personal data; fictional data only | Worker and technician names, worker ids, SSNs, homeowner names, phones, emails and addresses are masked in everything returned to the model (default `--personal mask`). `npm run masking`: 51 fictional canaries planted in 6 agents' fixtures, 143 calls, 0 leaks (self-test with masking off: 213 leaks, so the check works). Every fixture is fictional ("Example Concrete LLC", "Sample Painting Co", made-up people). |

## Checks run, and results

| Check | Result |
|---|---|
| `npm test` (31 workspaces, Node 24.20.0, Windows 10) | 789 tests, 789 pass |
| `npm run evals` | 691 eval cases across 30 agents, all pass (21 to 27 per agent) |
| `npm run hostile` (formulas, HTML, `../` ids and AI-aimed instructions planted in every fixture, every eval case) | 30 agents, 3,473 calls, 850 planted values, 149 results flagged for instruction-like text, 45 calls refused or held because of planted data, 0 findings |
| `npm run hostile:args` (the same planted text in tool arguments) | NOT finished: found that `out_dir` of 200,000 characters made a write tool hang forever on Windows (recursive mkdir); fixed in `safePath` (names over 255 characters, paths over 1,024 refused). The script also replayed setup cases for every bad value; it now runs setup once per tool. Full rerun still to do. |
| `npm run intl` (8 languages) | 450 cases with spreadsheet inputs per language, all pass; 377 of 420 column names translated |
| `npm run columns:check` | 68 sources, no translated word belongs to two fields of one file |
| `npm run masking` | 6 agents with personal columns, 51 canaries, 143 calls, 0 leaks |
| `npm run mcp:check` (official MCP SDK client over real stdio, installed with `--no-save`) | 30 agents, 307 tools, 0 issues |
| `npm run bench` (1,000 and 10,000 rows per input file) | NOT run yet |
| `npm run release:check:offline` | Ran once before the last two core fixes: every check passed except packing (two stray `fixtures/.fairbuild/` folders, removed). Rerun still to do (add `--full` for the argument pass). |
| `npm run plugin:check` | 61 plugin files for 30 agents, current |
| `npm view <name>` for all 31 names (read-only) | all 31 free on npm (E404 from registry.npmjs.org) |
| Demos | every `demo` run on its fictional files; output captured in each README |
| Sample reports | `sample-reports/`: an HTML page and a CSV worklist for every agent (60 files) plus `index.html`, in English, on fictional data |

## Found and fixed during the build

- **Core, header letter case (reported by the Fairmake session, confirmed here):** a header that is a field's own name in another case ("Vendor" for `vendor`, "Invoice_Number") was not re-keyed, so the agent read a blank column. Platte read 0 of 6 invoices from such a file and said nothing. Fixed in `sources.js`, with a core test and a new contract variant ("headers in title case") that every agent now runs.
- **Core, column words:** in French and Italian "Caisse"/"Cassa" was a word for both the union local and the union fund, so Yukon read the fund as the local (the language check failed 8 Yukon cases in French and Italian). The union local got its own words. A new check (`npm run columns:check`) then found three more fields sharing words inside one file: Oder's submittal and revision numbers (both took "reference" words, even "check number"), Ganges' per-occurrence and aggregate limits, and Italian "Posizione" for both punch item and location. Each got its own words.
- **Core, retainage columns:** Procore's commitments export has "Retainage" and "Retainage %"; the `%` was dropped from header names, so both mapped to one field. `%` is kept now ("pct"), and an English alias never takes a column another field already took.
- **Core, report pages:** the report titles, sections and labels were still freight words, so Rhine's report page came out half English in other languages (2 failing contract tests). Construction texts for all 30 titles in nine languages.
- **Row order (contract test):** Orinoco's duplicate-vendor pairs and Congo's leveled bids depended on the order of rows in the file. Both sort first now.
- **Double counting:** Mekong accrued a ticket that was both "probably billed" and "not invoiced"; Brazos counted a subcontractor's shortfall against every open backcharge of that subcontractor. Both count once now (Brazos allocates the room left in date order).
- **Douro:** a total named `items` collided with the list of items (an eval caught it); renamed `item_count`.
- **Indus:** "W9" on a vendor's document list did not match "W-9" in the requirements; names compare without punctuation now.
- **Eval expectations:** Yukon's `not_contains: "late"` also matched "translated" in language notes; it now looks for the finding's own sentence. Several hand-written expectations were wrong arithmetic on my side (Lena October net cash, Vistula aggregate, Rhine open markers) and were corrected against the fixtures.
- **Scripts from Lodestar:** the README demo capture kept Windows temp paths (`C:\Users\...\AppData\Local\Temp`); freight words in the plugin marketplace, bench id columns and README text; a hostile-check exception for a Lodestar agent. All replaced.
- **Windows output:** the hostile, intl, evals and release scripts ended with `process.exit()`, which on Windows can drop output still queued for a pipe (a piped hostile run printed 9 of 30 agents and no summary). They set `process.exitCode` now.
- **Core, very long paths:** the argument pass found that a write tool given an `out_dir` of 200,000 characters never returned on Windows (a recursive mkdir that does not give up). `safePath` now refuses names over 255 characters and paths over 1,024 before touching the disk.
- **Packing:** two stray `fixtures/.fairbuild/` folders from manual CLI runs would have been published with Danube and Ganges; the release check caught them and they were removed.
- **Honest copy:** "certified payroll" is the name of the WH-347 report, not a claim; the release check's ban on "certified" now allows that phrase only.

## Not checked yet (say this out loud)

- **Still to run (session stopped at the usage limit):** `npm run hostile:args` on all 30 agents, `npm run bench` (10,000 rows), and `npm run release:check:offline -- --full` after the header-case and path-length fixes. Rerun `npm test` too (the path-length fix came after the last full run; core tests pass).

- **Export layouts:** the column names for Procore, Sage 100 and 300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan and the WH-347 layout were written from public documentation and memory (every profile is marked `recalled`), not from a live account. The first setup confirms them with `inspect`. In the language check, files in a named product's layout (`fixtures/exports/`) are kept in English: once their headers are translated they are no longer that layout, and the generic reader is what the other 450 cases test.
- **Rules:** prevailing-wage overtime, fringe credits and apprentice rates, retainage limits, lien waiver forms and deadlines, pay-when-paid, insurance requirements, sales and use tax and bonding limits vary by state, contract and surety. They are settings with example values. A construction accountant, a construction lawyer, a labor compliance adviser and the customer's surety broker should read the defaults before a client relies on them.
- **Node 20 and 22, and Linux:** only Node 24 on Windows was run here. `engines` says Node 20 or newer; `.github/workflows/test.yml` runs Linux and Windows on 20, 22 and 24 once the repository is pushed.
- **Translations:** root READMEs and report headings in eight languages were written by Claude and not reviewed by native speakers. Agent READMEs, finding sentences and sales copy are English only.
- **Real data:** no real contractor export has been read. No contractor, construction accountant, lawyer or surety has reviewed the agents.
- **Sample report pages** were checked as text (title, summary, tables, CSV columns), not looked at in a browser: the preview pane does not screenshot local files.

## Decisions made without Kurt

- **Names and count:** 30 agents named `<river>-of-<job>`; all 31 names (with `fairbuild-core`) are free on npm.
- **Agent list:** built from the brief's examples (job cost against budget, commitments, change orders, pay applications, WIP, retainage, lien waivers, insurance certificates, certified payroll, subcontractor compliance) plus union fringes, timecards, equipment rentals, material tickets, three-way match, duplicate vendors, permits and inspections, bid leveling, backlog and margin fade, warranty callbacks, service tickets, sales and use tax, closeout, punch lists, submittals, bonding capacity, cash by job, backcharges and the payment release check.
- **Refused outright, not one click:** filing or releasing a lien (Tiber), submitting or approving a pay application (Thames, Seine), posting to the ledger (Loire, Limpopo, Tagus), running or submitting payroll (Hudson, Columbia, Shannon), requesting bonds (Vistula), paying (every agent that touches payables), sending email (every agent).
- **Masking:** workers, technicians and homeowners are people and are masked; companies (owners, subcontractors, suppliers, sureties) are business data and are not. Pseudonyms are stable per customer (`PERSON-3f9a1c2e`, key in `.fairbuild/personal.key`); explain accepts them. Report files keep the real names for the person reading them. Vendor phones and emails in Orinoco are masked too, to be safe.
- **Pay-when-paid and waivers** are settings in Platte (on by default only when the owner payment or waiver file is given), because whether they apply is a contract and state-law question.
- **Settings:** every threshold, rate and rule is a setting in the customer's JSON file with working defaults; results list `settings_used`. A misspelled settings key is an error naming the schema, not silently ignored.
- **Pricing (in `sales/`), proposals for Kurt:** packs from 1,500 to 4,000 for one company, whole back office 12,000, partner rollout (up to 5 companies, for contractor groups and accounting firms) 15,000 plus 2,000 per extra company, support 200 a month per pack, 600 for the whole back office, 250 per company for partner rollouts. Above the restaurant family, because a contractor's back office moves more money per transaction and works under more rules per job.
- **Site page name:** `fairbuild.html` on fair-agents.com (used in the MCP Registry metadata and the README links).

## For the main session

- `sales/site.json` is in the brief's exact shape (10 packages, 6 groups, 30 checks); `sales/pricing-page-ver1.md` has plain-number prices.
- MCP Registry metadata points at `https://fair-agents.com/fairbuild.html`; change the page name if the site uses another, and rerun `add-mcp-registry.cjs`.
- The core header-case fix is worth porting to any other family core that still has the old line in `sources.js` (`if (has(f)) { ... from: [f] ...`).
- Nothing was published, pushed, uploaded or sent. All work is in local commits in this folder.
