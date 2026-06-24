# Grocery Shopping Habits Experiment

## Project Overview

A single-purpose web app for a research experiment on grocery shopping habits. Participants browse a catalog of fictional grocery items (name, image, price, production details such as origin/organic status) and build a shopping basket within a budget. The site has no purpose beyond running this one experiment — keep it narrow in scope, not a general-purpose store.

**Status:** Pre-implementation. This file exists before any application code, so the architecture and working agreement are settled first. No `package.json` or server code yet — commands will be documented here once scaffolding exists.

## Working Agreement

1. Ask, don't assume. If something is unclear, ask before writing a single line. Never make silent assumptions about intent, architecture, or requirements. When running unattended, pick the most reasonable interpretation, proceed, and record the assumption rather than blocking.
2. Implement the simplest solution for simple problems, better solutions for harder problems. Do not over-engineer or add flexibility that isn't needed yet.
3. Don't touch unrelated code but please do surface bad code or design smells you discover with me so we can address them as a separate issue.
4. Flag uncertainty explicitly. If you're unsure about something, see point 1 above. If it makes sense to do so, conduct a small, localised and low-risk experiment and bring the hypothesis and results to me to discuss. Confidence without certainty causes more damage than admitting a gap.
5. I'm always open to ideas on better ways to do things. Please don't hesitate to suggest a better way, or one that has long lasting impact over a tactical change (as a few examples).

## Roadmap to Deployment

Decisions along the way are being made by Claude as each phase is reached (per working-agreement rule 1's "record the assumption rather than blocking" — see the Decisions Log below for what's been chosen and why). Phases that touch external/shared state (a new GitHub remote, the Railway account itself, spending money) pause for explicit go-ahead rather than proceeding autonomously, since those aren't easily reversible.

1. ~~**Scaffold Express app skeleton**~~ — `package.json`, server, views, static assets, `.gitignore`. ✅ Done.
2. ~~**Data layer**~~ — schema, db client, startup migration. ✅ Done.
3. ~~**Core experiment logic**~~ — session identity, random condition assignment, basket, hard budget cap, submit flow. ✅ Done.
4. ~~**Catalog content**~~ — placeholder items/categories/production details, conditions config. ✅ Done.
5. ~~**Local end-to-end test**~~ — run it, exercise every condition, verify DB writes and randomization. ✅ Done (see Environment Notes).
6. ~~**Railway setup**~~ — public GitHub repo, push-to-deploy, Postgres plugin. ✅ Done (see Deployment section).
7. ~~**Data export path**~~ — `GET /admin/export.csv`, secret-protected. ✅ Done (see Data Export section).
8. ~~**Deploy & launch**~~ — live URL verified end-to-end. ✅ Done. Still open: how participants get the link, target sample size, teardown timing (Gavin's call, not built yet).

## Deployment

- **Live URL:** https://starryknight.up.railway.app (changed from the original `grocery-web-production.up.railway.app`, which now 404s — discovered mid-session, not something Claude changed; Gavin appears to be configuring Railway directly in parallel with this session, including briefly adding then removing a custom domain `schellingout.com` that Claude observed but didn't touch). **Always verify the current domain with `railway domain list --service grocery-web` rather than trusting this value blindly** — it's evidently not stable.
- **GitHub:** https://github.com/hemlums1/grocery-shopping-experiment (public). Pushing to `main` auto-deploys via Railway's GitHub integration — no manual deploy step.
- **Railway project:** "grocery-shopping-experiment", two services: `Postgres` (database) and `grocery-web` (the app, GitHub-connected). `DATABASE_URL` on `grocery-web` is a Railway variable *reference* (`${{Postgres.DATABASE_URL}}`), not a copied value — it stays correct automatically if Postgres's credentials ever rotate.
- **Production secrets:** `COOKIE_SECRET` and `EXPORT_KEY` were freshly generated for production — **deliberately different values from the local `.env`**, so a compromise of one environment doesn't compromise the other. Neither value is written here or anywhere else in this repo (it's public) — check them with `railway variable list --service grocery-web --kv` if you need them.
- **Verified end-to-end on the live URL** (not just locally): homepage renders all 106 items, a static image asset serves, the full shop → basket → review → confirm → done flow works against the real production database, and the export route correctly 404s with no/wrong key and returns valid CSV with the right key. A test session created during this verification was deleted from the production database afterward — production should currently have zero session rows.
- **Local Postgres connection note:** Railway's `DATABASE_URL` (`postgres.railway.internal`) only resolves *inside* Railway's network. To reach the database from this laptop (e.g. to inspect/clean data), use the Postgres service's `DATABASE_PUBLIC_URL` instead — get it with `railway variable list --service Postgres --json`.

## Experiment Design

- Each session is randomly assigned to one of several **conditions**. Conditions currently differ by **budget amount** (how much the participant is given to spend) — e.g. low / medium / high.
- The budget is a **hard cap**: participants cannot add an item that would push the basket total over their assigned budget. This must be enforced server-side as the source of truth, with client-side disabling/feedback for UX.
- No consent or debrief screens are required for this study.
- Data recorded per session: the **assigned condition** and the **final basket contents** at submission. Per-action event logging, dwell-time tracking, and survey questions are explicitly out of scope unless we decide otherwise later.

## Tech Stack & Architecture

- **Backend:** Node.js + Express, server-rendered views (plain HTML/CSS/JS, no frontend framework). Chosen for simplicity and minimal moving parts — this is a "very simple, one purpose" site, not a platform.
- **Database:** PostgreSQL via Railway's Postgres plugin (`DATABASE_URL` env var). Used only to persist session/condition/basket data. The grocery catalog itself is static data in code (e.g. a single data file), not DB-backed, since it doesn't change at runtime.
- **Hosting:** Railway. The app must read `PORT` from `process.env.PORT` and `DATABASE_URL` from the environment — no hardcoded ports or local-only assumptions.

## Data Export

`GET /admin/export.csv?key=...` — protected by `EXPORT_KEY` (env var; route 404s if the env var is unset or the key doesn't match, using a constant-time comparison). Mounted in `server.js` *before* `ensureSession` so hitting it never creates a participant session row. Exports one CSV row per basket line item (long/tidy format — session columns repeated, plus full item attributes: category, brand, organic, sourcing, country, Nutri-Score, price), which is what you want for actual analysis (e.g. "did condition affect organic-item selection") rather than one opaque JSON-blob-per-respondent. Sessions with an empty basket still get exactly one row (item fields blank) so completion-rate has a true denominator — every session appears at least once, including in-progress/abandoned ones, with a `status` column to filter by.

**Deployment note:** `EXPORT_KEY` must be set on Railway too, or this route 404s in production exactly like it does locally without it. Generate a long random value, set it as a Railway env var, never commit it (it's in the local `.env`, which is gitignored).

## Catalog Content

- 106 fictional grocery SKUs across 26 product types (e.g. Apples, Milk, Chicken Breast, Coffee), 3-6 variants each. Source of truth for the design is [`catalog-design.xlsx`](catalog-design.xlsx) (and its generator, `scripts/build_catalog_design.py`) — `src/catalog.js` should stay in sync with that spreadsheet.
- Each item varies on four dimensions: **Price**, **Brand** (a named brand vs. the "EveryDay Basics" store-brand line — off-brand is always cheaper than its matched brand counterpart), **Ethicality of sourcing** (category-appropriate: Factory-Farmed/Free-Range for meat & eggs, Farmed/Wild-Caught for seafood, Fair-Trade for coffee/chocolate/bananas, Local/Imported for domestic produce, plus Organic Yes/No and Country of Origin), and **Nutrition** (Nutri-Score A-E, color-coded to the real EU scheme).
- Nutri-Score mostly varies *across* product types, not within one (an apple is grade A whether organic or not) — it varies *within* a type only where a genuine reformulated variant exists (plain vs. sweetened yogurt, white vs. whole-wheat bread, regular vs. frosted cereal).
- 104 items (was 106 — see below). Real product photos live in `public/images/items/`, **one distinct photo per item now, not shared per product type** — superseded the original shared-photo approach once Gavin supplied 4 priced photos per product type ("1" cheapest ... "4" priciest). Mapping is by actual price rank within each product type (verified programmatically — catalog row order does *not* always match price order, e.g. Bread/Pasta/Rice/Cereal/Potato Chips have a reformulated variant that's cheaper than the row above it), not by array position.
- Three product types (Butter, Canned Tuna, Cheddar Cheese) had a missing tier number and a duplicate (two genuinely different candidate photos, not a format difference) for another tier. Resolved by renaming the more clearly *branded*-looking photo into the gap (matching that tier's Brand requirement) and keeping the generic/unbranded one at its original number (matching an Off-Brand tier) — confirmed with Gavin before applying.
- Yogurt had 6 catalog variants but only 4 numbered photos. Resolved by dropping the two "vanilla" variants (Gavin's call) rather than mapping unevenly — Yogurt now follows the same off-brand-conventional/brand-conventional/off-brand-organic/brand-organic pattern as Milk, Eggs, Cheddar Cheese, and Butter. `catalog-design.xlsx` and its generator were updated to match (104 items now, not 106).
- The project folder was moved from `~/grocery-shopping-experiment` to `~/Desktop/grocery-shopping-experiment` outside of Claude's actions (git history, `.env`, `node_modules` all came with it intact) — all paths in this file and in scripts now reflect the new location.

## Visual Design

Styled after [erewhon.com/shop](https://erewhon.com/shop) per Gavin's request (premium-minimalist grocery aesthetic), minus its irrelevant categories. **Caveat: Claude could not actually view the reference site** — the Claude in Chrome extension wasn't connected, and a plain fetch of a JS-heavy page only returned a generic "premium, minimalist" impression, not the real layout/colors/type. The current design is built from general knowledge of Erewhon's known branding (black/white/cream, generous whitespace, clean typography, large uncluttered product photography) rather than direct observation. Treat the current look as a reasoned best-effort draft, not a verified match — Gavin should eyeball `localhost:3000` and redirect specifics.

Current implementation: warm off-white background (`#faf8f4`), near-black text/borders, no bright accent colors except the Nutri-Score badges (which keep their real A-E colors since that's a recognizable standard, not a style choice). "Fraunces" (Google Fonts) for headings/product names, system sans-serif for body/labels. Sharp corners throughout (no border-radius on cards), uppercase letter-spaced small text for category headers and brand labels.

## Image Zoom

Every product image (on `/`, `/basket`, and `/review`) is wrapped in a `.zoom-trigger` button. Clicking it opens a full-screen lightbox showing the *uncropped* image (`object-fit: contain`, vs. the thumbnail's `object-fit: cover`) — added because the square thumbnail crop cuts off parts of some of Gavin's photos, and this gives a way to see the whole picture. Closes via the X button, clicking anywhere in the lightbox, or Escape.

Implementation: `views/partials/lightbox.ejs` (shared markup, included once per page) + `public/js/lightbox.js` (vanilla JS, event delegation, no dependencies — consistent with the project's no-framework approach). The thumbnail's already-loaded `<img src>` is reused directly, so opening the lightbox costs no extra network request.

**Verified behaviorally, not just structurally** — Claude in Chrome still wouldn't connect (4th attempt this session), so instead of stopping at "the HTML looks right," the actual `lightbox.js` was executed against the real rendered page in a jsdom sandbox (a temporary dev-only dependency, installed with `--no-save` and removed immediately after — never touched `package.json`). Confirmed: click opens with the correct image per item (not stuck on whichever was clicked first), and all three close paths (X, background, Escape) work. This is real DOM/event verification, not a guess — but still not the same as a human actually looking at it, which remains outstanding for this feature like the rest of the visual design.

## Sorting, Basket View & Mobile

- **Sort dropdown** (top right toolbar): Default / Price (asc/desc) / Name A-Z/Z-A / Nutri-Score A-E/E-A. Sorts globally by the chosen key, which produces correct within-category ordering once the template filters by category (stable sort, so ties keep their catalog-authored relative order). Choice persists across requests via a plain `sortBy` cookie (separate from the signed `sid` session cookie) — needed because basket updates redirect through `/`, which would otherwise reset the sort each time.
- **Basket view** (`GET /basket`, linked from "Basket (N)" in the header): consolidated list of current basket contents with the same quantity controls as the shop page. `POST /basket/update` now takes an optional `returnTo` field (`'basket'` → redirects to `/basket`, anything else → `/`) so editing from either page keeps you there. `returnTo` is allowlisted server-side (only the literal value `'basket'` is honored) rather than trusted as a raw redirect target, to avoid an open-redirect hole.
- **Mobile**: two breakpoints (640px, 380px) — header stacks vertically, item grid drops to 2 columns, quantity buttons and the "Finish Shopping" button grow for touch, basket rows reflow from a 3-column grid to image+info on one row / controls below.

## Review/Confirm & Reopen Flow

- "Finish Shopping" (on `/` and `/basket`) no longer submits directly — it links to `GET /review`, a read-only review of the full cart (images, brand, Nutri-Score, sourcing, line totals) with two actions: "Confirm & Finish Shopping" (`POST /submit`, same as before) or "Back to Shopping". `/review` is purely a GET render, no state change, so revisiting it repeatedly is harmless.
- `/done` now has an "Edit My Basket" button (`POST /reopen`) that sets `status` back to `in_progress` and clears `submitted_at`, returning to `/basket`. **Important nuance:** re-finishing overwrites `submitted_at` with a new timestamp — there is no history of earlier submissions, only the latest one is ever kept. If Gavin wants to know *whether* a session was reopened/edited (not just its final state), that needs a separate column — not built, flagging per rule 1 rather than silently deciding it doesn't matter.

## Decisions Log

Per working-agreement rule 1: decisions below were made by Claude when each phase was reached, using the simplest reasonable option (rule 2), and are recorded here rather than buried silently in code. All are easy to revisit — flag anything that should change.

| Decision | Choice | Why |
|---|---|---|
| Number of conditions / budget amounts | 3 conditions (low/medium/high), placeholder dollar amounts | Catalog is placeholder anyway; amounts live in one config object so they're trivial to retune once real research design is set |
| Quantities | Basket items support a quantity (+/- stepper), not binary in/out | Matches normal grocery shopping; negligible extra complexity |
| End of session | Simple "your shopping is complete" confirmation, nothing further | No consent/debrief required for this study |
| Images | Category-based placeholder graphics, not photos | Can't generate photographic images in this environment; kept swappable |
| Templating | EJS | Closest to plain HTML, least new syntax for a server-rendered, low-complexity site |
| CSS | Hand-written, no framework | Small enough surface area that a framework is overhead, not value |
| DB access | Raw `pg` client, no ORM | Schema is one table — Knex/Prisma/Drizzle would be overhead without payoff |
| Schema creation | Startup script (`CREATE TABLE IF NOT EXISTS …`) run on boot | Self-contained and reproducible; no separate manual migration step to forget |
| Repeat visits (same browser) | Resume same in-progress session/basket | Simplest behavior; revisit if duplicate-submission prevention turns out to matter for data quality |
| Local dev database | Postgres.app (standalone local install) | Machine had no Homebrew/Docker; Gavin chose to install Postgres.app directly rather than route dev traffic through Railway |
| Data export (superseded — see below) | Direct DB access via Railway's dashboard/CLI, no `/admin/export` route | Was the right call until an actual export mechanism was requested; superseded once it was |
| Catalog port | Replaced placeholder catalog with the full 106-item spreadsheet design in `src/catalog.js` | Spreadsheet was reviewed/approved in principle; styling work needed the real fields (brand, sourcing, Nutri-Score) to be meaningful |
| Visual reference verification | Proceeded from general brand knowledge + a weak fetch signal, not a direct look | Claude in Chrome extension wouldn't connect (tried twice); Gavin chose to proceed rather than keep troubleshooting the connection |
| Spreadsheet formula verification | Verified Summary sheet formulas independently via a plain Python pass over the same data, not LibreOffice recalc | LibreOffice isn't installed locally; installing a ~1GB office suite for 6 formulas was disproportionate |
| Sort persistence | Plain (unsigned) cookie, separate from the session cookie | UI display preference, not experimental data — doesn't belong in the `sessions` table or its DB writes |
| Basket view scope | Editable (qty +/- controls), not strictly read-only | Gavin asked to "view" the basket, but a non-editable cart page is unusual UX; reused the existing qty-form rather than building something new |
| Review page scope | Read-only (no qty controls), unlike the basket page | Confirm-before-commit screens shouldn't blend with editing — "Back to Shopping" is the deliberate way to change something, not inline fiddling |
| Reopen history | Not tracked — re-finishing just overwrites `submitted_at` | Simplest behavior matching "go back" literally; flagged to Gavin that this means no audit trail of edits, only the final state |
| Data export mechanism | Secret-protected CSV route over the data already in Postgres, not Google Sheets/Airtable/a DB GUI client | Gavin's explicit choice among presented options — zero new external accounts/credentials, builds on existing data capture |
| GitHub/Railway auth | Gavin ran `gh auth login` and `railway login` himself; Claude only used the CLIs afterward | OAuth/account login is his to grant, not Claude's to drive, even though both tools needed installing first |
| Production secrets | Freshly generated `COOKIE_SECRET`/`EXPORT_KEY` for Railway, distinct from local `.env` values; neither written into any committed file | Standard practice — a leaked dev secret shouldn't compromise production, and the repo is public |
| `DATABASE_URL` on the web service | Set as a Railway variable reference (`${{Postgres.DATABASE_URL}}`), not a copy-pasted connection string | Stays correct automatically if Postgres credentials ever rotate; avoids a stale hardcoded value |
| Post-deploy DB cleanup | Deleted the one test session created while verifying the live deploy | Production is the real system of record from now on — unlike local dev, leftover test rows there would pollute actual study data |
| Export row shape | Long/tidy (one row per basket line item, session columns repeated), not one-row-per-respondent with a JSON blob | Matches how the data will actually get analyzed (e.g. cross-tabbing condition against item attributes) rather than requiring Gavin to parse JSON in Excel first |
| Photo-to-price mapping | Sort each product type's variants by actual `priceCents`, not by their position in the catalog array | Verified programmatically that row order ≠ price order for 5 product types (reformulated variants are sometimes cheaper than the row above) — assuming otherwise would have silently mis-assigned photos |
| Butter/Canned Tuna/Cheddar duplicate photos | Branded-looking photo fills the gap (matching that tier's Brand requirement); generic/unbranded photo keeps its original number | Gavin confirmed this approach; consistent logic applied across all three rather than three separate one-off calls |
| Yogurt variant count | Dropped the 2 "vanilla" variants rather than unevenly mapping 6 variants to 4 photos | Gavin's explicit choice; also makes Yogurt's structure consistent with every other Dairy & Eggs product type |

**Not Claude's to decide** (study logistics, left open for Gavin): how participants receive the link, target sample size, and when the site comes down after data collection ends.

## Environment Notes

This machine had no Node.js, npm, Homebrew, Docker, or `psql` installed as of 2026-06-24. Gavin installed Homebrew and Postgres.app himself (sudo password and GUI installer steps Claude can't perform). Claude then ran `brew install node` (Node 26.3.1) and initialized/started Postgres.app's server from the command line (no GUI interaction needed — Postgres.app's bundled `initdb`/`pg_ctl` work the same either way).

**Local dev database:** Postgres.app server running on port 5432, data dir at `~/Library/Application Support/Postgres/var-18`, database name `grocery_experiment`. Start/stop with:
```
pg_ctl -D ~/Library/Application\ Support/Postgres/var-18 start   # or stop
```
`psql` and friends are on PATH via a line added to `~/.zprofile` (new terminal windows pick it up automatically; this session needed it exported manually since `.zprofile` is only sourced by login shells).

**Status: Phase 1-5 complete and verified.** `npm install` succeeds, the server boots and runs its startup migration cleanly, and a full local smoke test passed: adding/removing items updates totals correctly, the hard budget cap blocks an over-budget add both via the disabled button and server-side, submit locks the session and redirects to `/done`, post-submit edits are rejected, and 10 fresh sessions distributed across all 3 conditions (no randomization skew).

**Catalog port + Erewhon-style redesign (2026-06-24):** full 106-item catalog is live in `src/catalog.js`, all 26 product-type images render with 200s, and the basket/budget logic was re-verified against the new data (all still passes). **Still not checked: actual visual appearance in a browser.** Claude in Chrome wouldn't connect (tried twice — see Decisions Log), so this whole styling pass has only been verified structurally (curl + grep on the rendered HTML), never visually. Gavin should look at `localhost:3000` himself before this is considered done.

**Sort/basket/mobile additions (2026-06-24):** all three verified functionally via curl — sorting confirmed correct (and within-category, specifically checked) for price, name, and Nutri-Score in both directions; cookie persistence confirmed across requests; basket view confirmed showing correct items/quantities/totals; `returnTo` confirmed routing correctly including a deliberate malicious-value test (open redirect attempt correctly falls back to `/`, not the attacker-supplied URL). Claude in Chrome still would not connect on a third attempt. **The mobile responsiveness work has had zero visual verification** — not even the structural kind the other two features got, since there's no way to curl-test a layout at a given viewport width. This is the part most likely to need a follow-up pass once actually viewed on a phone or resized browser window.
