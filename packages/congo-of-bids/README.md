# Congo of Bids (`congo-of-bids`)

Tabulates and levels subcontractor bids by bid package: scope items a bidder left out priced at your plug values, bids missing addenda or a bid bond, late bids, and bids far below or above the others; shows the lowest responsive leveled bid per package. Drafts clarification letters. Awarding is a person's decision.

MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)

```bash
npx -y congo-of-bids demo
npx -y congo-of-bids mcp --root ./exports
```

## What it needs

| Argument | What to give it |
|---|---|
| `bids` (required) | Bids received under --root (CSV, Excel or JSON): bid package, bidder, base bid, scope included (items separated by ;), exclusions, bid bond, addenda acknowledged, time received |
| `scope` | Optional scope checklist: bid package, scope item, your plug value for it |
| `settings` | Optional settings JSON (bid_settings schema): addenda_required, require_bond, due_at, outlier_pct |

Only `bids` is required. Each optional file turns on the checks that need it.

## Checks

What `congo_check` flags, each with the first example it finds in the fictional fixtures (eval case `check-totals`):

| Code | Example from the fixtures |
|---|---|
| `scope_gap` | Does not include insulation (plug 18000); leveled bid is 249500. |
| `has_exclusions` | Exclusions: Insulation by others. |
| `late_bid` | Received 2026-11-10 14:10, after the due time 2026-11-10 14:00. |
| `no_bond` | No bid bond with the bid. |
| `missing_addenda` | Acknowledges 1 of 2 addenda. |
| `low_outlier` | Base bid 189000 is 18.36% below the package median 231500. Confirm the bidder's scope and quantities before relying on it. |

<!-- generated:start -->

## A demo run

`npx -y congo-of-bids demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Congo of Bids demo (fictional bidders and packages), Auto mode on for drafts

▶ Level six bids on two packages
  status: executed  decision: allow
  6 bid(s) on 2 package(s): 5 responsive, 1 not responsive (late, no bond or missing addenda), 2 leveled for scope gaps (53000 in plugs). Lowest responsive leveled: 09 Drywall: Test Drywall Co 248000; 26 Electrical: Example Electric Inc 412000.
    09 Drywall     Test Drywall Co         248000  248000 rank 1  ok              
    09 Drywall     Sample Interiors LLC    231500  249500 rank 2  leveled         scope_gap, has_exclusions
    09 Drywall     Example Wallboard Inc   189000  189000 rank -  non_responsive  late_bid, no_bond, missing_addenda, low_outlier
    26 Electrical  Example Electric Inc    412000  412000 rank 1  ok              
    26 Electrical  Sample Power Co         398000  433000 rank 2  leveled         scope_gap, has_exclusions
    26 Electrical  Test Circuit LLC        455000  455000 rank 3  ok              

▶ Explain the Sample Power bid
  status: executed  decision: allow
  Sample Power Co on 26 Electrical: leveled, rank 2. Base 398000, plugs 35000, leveled 433000. Does not include fire alarm (plug 35000); leveled bid is 433000. Exclusions: Fire alarm excluded.

▶ Write the tabulation
  status: executed  decision: allow
  Worklist written: 6 bid(s) on 2 package(s): 5 responsive, 1 not responsive (late, no bond or missing addenda), 2 leveled for scope gaps (53000 in plugs). Lowest responsive leveled: 09 Drywall: Test Drywall Co 248000; 26 Electrical: Example Electric Inc 412000.

▶ Draft a clarification letter (Auto is opted in for drafts here)
  status: executed  decision: allow  (auto)
  clarification Sample Power Co drafted with 2 open marker(s) ([TO CONFIRM bidder contact], [TO CONFIRM your name and company]). Nothing was sent.

▶ Approve sending it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ Agent tries to award the contract itself
  status: blocked  decision: block
  reason: Congo never awards a bid or issues a subcontract.

Audit log: <demo folder>
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `congo_check` | Per bid package and bidder: scope items not included, priced at your plug values into a leveled bid; addenda not acknowledged, no bid bond, late; base bids far below or above the package median; exclusions. | runs |
| `congo_explain` | Show one bid's base, plugs, leveled price, rank and every finding. | runs |
| `congo_write_report` | Write the bid tabulation as congo-bids.csv (one row per item, blank decision columns for people to fill in) and congo-bids.html into out_dir (default fairbuild-out/congo). | runs |
| `congo_draft_clarification` | Write drafts/clarification-<bidder>.md: a letter asking one bidder to confirm scope gaps, exclusions, addenda or a low price. | asks first (Auto can be opted in) |
| `congo_request_send` | After one named human click (even in Auto), record that the reviewed clarification draft is approved in clarification-requests.csv. | one named click, even in Auto (`binding_send`) |
| `award_contract` | Congo never awards a bid or issues a subcontract. | refused |
| `bid_reject_notice` | Congo never rejects or notifies a bidder. | refused |
| `email_send` | Congo never sends the clarification; a person sends the approved draft. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Bids received (`bids`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `bid_package` (required) | text | Bid Package, Package, Trade, Scope Package, Division | Vergabepaket, Lot, 入札パッケージ, 招标包 |
| `bidder` (required) | text | Bidder, Subcontractor, Company, Vendor | Bieter, Soumissionnaire, 入札者, 投标人 |
| `base_bid` | amount | Base Bid, Bid Amount, Bid, Amount, Price | Angebotssumme, Offre de base, 基本入札額, 基本报价 |
| `includes` | text | Includes, Included Scope, Scope Included, Inclusions | - |
| `exclusions` | text | Exclusions, Excludes, Qualifications | Ausschlüsse, Exclusions, 除外項目, 不含项目 |
| `bond` | yes/no | Bond, Bid Bond, Bond Included | - |
| `addenda_acknowledged` | number | Addenda Acknowledged, Addenda, Addenda Received | - |
| `received_at` | date and time | Received At, Received, Submitted At, Time Received | - |

### Scope checklist and plugs (`scope`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `bid_package` (required) | text | Bid Package, Package, Trade | Vergabepaket, Lot, 入札パッケージ, 招标包 |
| `item` (required) | text | Item, Scope Item, Scope | Position, Ligne, 明細番号, 行号 |
| `plug_value` | amount | Plug Value, Plug, Estimate, Allowance | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. Columns named differently? Run `npx congo-of-bids inspect <file>` (names and shapes only, never values) and name them in `fairbuild-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy" } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y congo-of-bids demo
npx -y congo-of-bids mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "congo-of-bids": {
      "command": "npx",
      "args": [
        "-y",
        "congo-of-bids",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add congo-of-bids -- npx -y congo-of-bids mcp --root .`, or install the `congo-of-bids` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `congo-of-bids approve <id> --as "Your Name"` (or on the local approvals page, `congo-of-bids approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`congo-of-bids kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
congo-of-bids tools                 # every tool, its policy and arguments
congo-of-bids sources               # the columns each input is read from
congo-of-bids inspect <file>        # how a file would be read (names and shapes, never values)
congo-of-bids call congo_check '{"bids":"<bids>"}'
congo-of-bids eval                  # the private eval cases on the fictional fixtures
congo-of-bids demo
```

## Audit log and data

Every call is written to `.fairbuild/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Plug values are your estimates, not the bidders' prices. The lowest leveled bid is a starting point for review, not an award recommendation.
- Reads only the files you give it. It does not log in to your accounting system, project management system, bank, surety, insurer or any government portal.
- Thresholds, percentages, rates and dates come from the settings file you supply; the defaults it used are listed in the result.
- Not legal, tax, lien, insurance, surety or accounting advice. A person decides what to bill, pay, hold, send or file.
