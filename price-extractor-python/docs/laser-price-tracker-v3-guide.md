# Laser Price Tracker System

## 1. Overview & Architecture

**Goal:**
Automatically fetch and validate current prices for each laser machine + variant (e.g. wattage), maintain a clean audit trail, and keep a fast-lookup table up to date—with minimal cost and human oversight.

### High-Level Flow

```
       ┌─────────────────────┐   Reads   ┌─────────────────┐
       │   1. Scheduler      │ --------> │    machines     │
       │ (cron/APScheduler)  │           │(URL, variants..)│
       └─────────┬───────────┘           └─────────────────┘
                 │ (URL, variants,
                 │  last_price...)
                 ▼
       ┌─────────────────────┐   Reads   ┌──────────────────────────┐
       │ Orchestrator(Python)│ ◀──────── │variant_extraction_config │
       └─────────┬───────────┘           └──────────────────────────┘
                 │
                 ▼
       ┌─────────────────────┐
       │  2. Static Parse    │
       │ (HTTP GET/Parse)    │
       └─────────┬───────────┘
                 │ price?
      ┌──────────┴──────────┐
      │ YES                 │ NO
      ▼                     ▼
[Cand. Price]     ┌─────────────────────┐
                  │ 3. Slice Check Fast │
                  │(Haiku Extract+Val)  │
                  └─────────┬───────────┘
                            │ valid & conf?
                 ┌──────────┴──────────┐
                 │ YES                 │ NO
                 ▼                     ▼
           [Cand. Price]     ┌─────────────────────┐
                             │4. Slice Check Balanc│
                             │(Sonnet Extract+Val) │
                             └─────────┬───────────┘
                                       │ valid & conf?
                            ┌──────────┴──────────┐
                            │ YES                 │ NO
                            ▼                     ▼
                      [Cand. Price]     ┌───────────────────────────┐
                                        │ 4b. Check Config Flag     │
                                        │ (requires_js_interaction?)│
                                        └─────────┬─────────────────┘
                                                  │
                                       ┌──────────┴──────────┐
                                       │ TRUE                │ FALSE / NULL
                                       ▼                     │
                             ┌─────────────────────┐         │
                             │5. JS Interaction Chk│         │
                             │ (API or Playwright) │         │
                             └─────────┬───────────┘         │
                                       │ price?              │
                            ┌──────────┴──────────┐          │
                            │ YES                 │ NO       │
                            ▼                     ▼          │
                      [Cand. Price]     ┌─────────────────────┐◄┘
                                        │ 6. Full HTML Check  │
                                        │(GPT4o Extract+Val)  │
                                        └─────────┬───────────┘
                                                  │ price?
                                       ┌──────────┴──────────┐
                                       │ YES                 │ NO (null price)
                                       ▼                     ▼
                                 [Cand. Price]         [Cand. Price]
                                       │                     │
                                       └─────────┬───────────┘
                                                 │
                                                 ▼
                                       ┌─────────────────────┐
                                       │ 7. Final Sanity Chk │
                                       │ (+ Rule / LLM Valid?)│
                                       └─────────┬───────────┘
                                                 │ Set Manual Review?
                                      ┌──────────┴──────────┐
                                      │ YES                 │ NO
                                      ▼                     ▼
                          [Flag Manual Review]    ┌─────────────────────┐
                                                  │ 8. Database Write   │
                                                  │ (history, latest)   │
                                                  └─────────────────────┘
```

## 2. Tech Stack & Dependencies

| Layer | Technology / Library | Purpose |
|-------|---------------------|---------|
| Orchestrator | Python 3.11+ | Core control logic |
| HTTP client | httpx (or requests) | Snapshot fetch |
| HTML parsing | beautifulsoup4, htmlmin | CSS/regex extraction, minification |
| LLM clients | anthropic (Claude 3 Haiku/Sonnet), openai (GPT-4o) | Price-extraction & validation |
| Headless browser | Playwright (Python) | JS-driven price discovery (HAR) |
| Scheduler | cron or APScheduler | Twice-weekly runs |
| Database | Supabase (PostgREST + Postgres) | machines_latest, price_history, variant_extraction_config |
| Environment | python-dotenv | API keys, Supabase credentials |
| Testing | pytest, custom dry-run harness | Unit + integration + smoke tests |

## 3. Pipeline & Data Flow

### Notes

**Initial Runs:** When the system runs for the first time, the variant_extraction_config table will likely be empty. The pipeline will still function: Static Parse, Slice Check Fast, Slice Check Balanced, and Full HTML Check will operate normally using general parsing and LLM capabilities with global default thresholds. Step 5 (JS Interaction Check) will not find specific API endpoints or JS click sequences in the config; it will likely default to a basic Playwright HAR scan (if implemented) or rely on the Full HTML Check fallback. The system becomes more effective for complex sites as variant_extraction_config is populated with specific rules and potentially custom thresholds over time.

**Error Handling:** Implement robust error handling throughout the pipeline. For transient operational errors (e.g., network timeouts, temporary API unavailability), use retry logic with exponential backoff and defined limits. Log retry attempts. If an operation fails after all retries, generate an appropriate failure_reason (indicating the step and error type, e.g., FAIL_SLICE_FAST_TIMEOUT), set the manual review flag, and proceed to DB write.

### Scheduler (Step 1)

- Runs every machine_id × variant (wattage/size) twice/week.
- Fetch context prices: Query machines (static_price) and machines_latest (last_price). Use last_price for validation context. (Add retry logic for DB queries if necessary).
- Queries machines for metadata (URL, variants). (Add retry logic for DB queries if necessary).
- Passes enriched list (machine_id, variant_attribute, url, static_price, last_price) to orchestrator.

### Static Parse (Step 2)

- HTTP GET → raw HTML. (Implement retry logic with backoff for HTTP errors/timeouts using the HTTP client).
- Look for structured price (JSON-LD, meta) or regex in first 30 KB. (Optionally use css_price_selector from variant_extraction_config if present).
- If found with confidence ≥ global default threshold → candidate_price → goto Step 7 (Final Sanity Check).
- Else (or operational failure after retries) → Escalate to Slice Check Fast.

### Slice Check Fast (Step 3)

- Identify currency patterns, extract snippets. Include last_price context.
- Prompt Haiku (or equivalent fast/cheap LLM) for JSON: { "price": ..., "currency": ..., "extracted_confidence": ..., "change_valid": ..., "validation_confidence": ... }. (Implement retry logic with backoff around the LLM API call).
- If extraction successful → candidate_price, llm_change_valid, llm_validation_confidence → goto Step 7 (Final Sanity Check).
- Else (extraction failed or LLM error after retries) → Escalate to Slice Check Balanced.

### Slice Check Balanced (Step 4)

- Triggered if Slice Check Fast fails. Reuse snippets, last_price; prompt Sonnet (or equivalent balanced LLM). (Implement retry logic with backoff around the LLM API call).
- If extraction successful → candidate_price, llm_change_valid, llm_validation_confidence → goto Step 7 (Final Sanity Check).
- Else (extraction failed or LLM error after retries) → Perform Branching Logic (4b).

### Branching Logic (Step 4b)

- Query variant_extraction_config for the current target (machine_id, variant_attribute, domain).
- Check the value of the requires_js_interaction flag (defaulting to FALSE or NULL if no row/value exists).
- If requires_js_interaction is TRUE: → goto Step 5 (JS Interaction Check).
- If requires_js_interaction is FALSE or NULL: → goto Step 6 (Full HTML Check).

### JS Interaction Check (Step 5)

(This step only runs if requires_js_interaction was TRUE)

- Check variant_extraction_config for the current machine/variant/domain:
  - (5a) API Endpoint Found: If api_endpoint_template exists, attempt HTTP GET API URL, parse JSON for { "price": ... }. (Implement retry logic).
    - If successful → candidate_price → goto Step 7 (Final Sanity Check).
    - If fails after retries: Clear api_endpoint_template and api_endpoint_discovered_at in variant_extraction_config. Proceed to 5b/5c to attempt discovery.
  - (5b) Playwright Interaction: If js_click_sequence exists, launch Playwright headless, execute actions, record HAR, scan for price. (Implement retry logic).
    - If successful → candidate_price. If HAR analysis discovers API endpoint, write it back to config. → goto Step 7 (Final Sanity Check).
    - If fails after retries → Proceed to 5c or escalate to Full HTML Check.
  - (5c) Default HAR Scan: If neither specific config (5a attempted/failed, 5b not present/failed) exists, optionally perform a default Playwright load + HAR scan. (Implement retry logic).
    - If successful → candidate_price. If HAR analysis discovers API endpoint, write it back to config. → goto Step 7 (Final Sanity Check).
    - If fails after retries → Escalate to Full HTML Check.
- If JS Interaction Check fails entirely to find a price → Escalate to Full HTML Check.

### Full HTML Check (Step 6)

- Triggered if Slice Check Balanced fails (and JS not required) OR if JS Interaction Check fails.
- Send full HTML and last_price to GPT-4o (or equivalent powerful fallback LLM) with the folded prompt structure. (Implement retry logic). (Note: Cost/performance impact).
- If extraction successful → candidate_price, llm_change_valid, llm_validation_confidence → goto Step 7 (Final Sanity Check).
- Else (extraction failed or LLM error after retries) → candidate_price = null → goto Step 7 (Final Sanity Check).

### Final Validation & Sanity Check (Step 7)

- Input: candidate_price (from preceding step, could be null), last_price, llm_change_valid (if applicable), llm_validation_confidence (if applicable).
- Determine Thresholds: Read min_extraction_confidence, min_validation_confidence, sanity_check_threshold from variant_extraction_config. Use global defaults if null.
- Initialize set_manual_review_flag = false.
- Initialize failure_reason = null.
- Check 1 (Extraction Failure): If candidate_price is null, set set_manual_review_flag = true, failure_reason = "FAIL_EXTRACTION_ALL".
- Check 2 (LLM Result): If price came from an LLM step (Slice Check Fast, Slice Check Balanced, or Full HTML Check) AND (llm_change_valid was false OR llm_validation_confidence < relevant_validation_threshold): set set_manual_review_flag = true, failure_reason = "FAIL_LLM_VALIDATION". (Store specific step failure if needed).
- Check 3 (Rule-Based Sanity Check): If candidate_price is not null AND last_price is available AND abs(candidate_price - last_price) / last_price > relevant_sanity_threshold: set set_manual_review_flag = true, failure_reason = "FAIL_SANITY_CHECK:X%Change".
- (Add checks for operational failures if retries failed in earlier steps, setting appropriate failure_reason, e.g., FAIL_JS_INTERACT_TIMEOUT)
- Output: Proceed to Step 8 (Database Write), passing the candidate_price, the final set_manual_review_flag status, and the failure_reason.

### Database Write (Step 8)

- Input: candidate_price, currency, tier_name (e.g., 'SLICE_FAST', 'JS_INTERACT'), extracted_confidence, validation_confidence, set_manual_review_flag, failure_reason.
- INSERT a new row into price_history including the failure_reason if applicable. (Implement retry logic).
- UPDATE machines_latest SET: ... (Implement retry logic).
  - last_checked = NOW()
  - tier = tier_name identifier for the step that produced the price
  - confidence = validation_confidence (from LLM step, if applicable)
  - manual_review_flag = set_manual_review_flag
  - machines_latest_price = candidate_price (Decision Point: Only update this if set_manual_review_flag is false? Recommended: Yes)
  - currency = currency (Update only if price is updated)
- If manual_review_flag is true, the record is marked for manual review.

## 4. Database Schema

### machines (Existing Table)

| Column | Type | Notes |
|--------|------|-------|
| machine_id | TEXT | Unique identifier/SKU for the machine |
| wattage | TEXT | Wattage option (e.g., "60W") |
| size | TEXT | Physical size descriptor |
| url | TEXT | URL of the product page |
| price | NUMERIC | Static catalog price (optional baseline) |
| ...other machine attributes... | | |

**Purpose:** Your existing machine catalog.

### machines_latest

| Column | Type | Notes |
|--------|------|-------|
| machine_id | TEXT | Part of Composite PK, Foreign key to machines |
| variant_attribute | TEXT | Part of Composite PK (e.g., '60W' or 'Size M') |
| machines_latest_price | NUMERIC | Latest confirmed price |
| currency | TEXT | Currency of the price (e.g. USD) |
| last_checked | TIMESTAMP | Timestamp when this price was fetched |
| tier | TEXT | Identifier for the extraction step that yielded this price (e.g., 'STATIC', 'SLICE_FAST', 'JS_PATH') |
| confidence | REAL | Confidence score from LLM/Validator |
| manual_review_flag | BOOLEAN | Flag indicating if the last check requires manual review |

**Purpose:** Provides a fast lookup table for current prices. Updated every run.

### price_history

| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL | Auto-increment row ID (PK) |
| machine_id | TEXT | Foreign key linking back to machines |
| variant_attribute | TEXT | Variant attribute (e.g., '60W' or 'Size M') |
| price | NUMERIC | Price value fetched (can be NULL if extraction failed) |
| currency | TEXT | Currency of the price (e.g. USD) |
| checked_at | TIMESTAMP | Timestamp when this entry was recorded |
| tier | TEXT | Identifier for the extraction step used (e.g., 'STATIC', 'SLICE_FAST', 'JS_PATH', 'FULL_HTML', 'FAIL') |
| extracted_confidence | REAL | LLM extraction confidence score |
| validation_confidence | REAL | LLM/Validator validation confidence score |
| failure_reason | TEXT | Optional: Code/message indicating failure step & reason if manual_review_flag was set |
| raw_html | TEXT | Raw HTML snapshot (Optional, consider storage implications) |

**Purpose:** Maintains a complete audit trail of every price fetch, including failure reasons for manual review.

### variant_extraction_config

| Column | Type | Notes |
|--------|------|-------|
| machine_id | TEXT | Part of Composite PK, Foreign key to machines |
| variant_attribute | TEXT | Part of Composite PK (e.g., '60W' or 'Size M') |
| domain | TEXT | e.g. aeonlaser.us |
| requires_js_interaction | BOOLEAN | Optional: Set TRUE if JS clicks/actions are needed. Default FALSE/NULL. |
| api_endpoint_template | TEXT | Optional: e.g. https://…/api/config_price?model={sku}&power={variant} |
| api_endpoint_discovered_at | TIMESTAMP | Optional: Timestamp when the endpoint was last discovered/validated |
| css_price_selector | TEXT | Optional: Fallback CSS selector (e.g. .price-container) |
| js_click_sequence | JSONB | Optional: Array of Playwright actions (e.g. ["click:text=Get Pricing"]) |
| min_extraction_confidence | REAL | Optional: Override global threshold (e.g., 0.95) |
| min_validation_confidence | REAL | Optional: Override global threshold (e.g., 0.90) |
| sanity_check_threshold | REAL | Optional: Override global price change % threshold (e.g., 0.3 for 30%) |

**Purpose:** Stores configuration specific to extracting prices for each machine variant on its respective domain, including extraction rules, JS interaction requirements, discovered API endpoints, and confidence/sanity check threshold overrides. Uses global defaults if optional values are NULL.

## 5. Testing Strategy

### A. Dry-Run Harness

- Add --dry-run flag: log every step's candidate payload (machine_id, variant_attribute, tier (name), price, confidence, failure_reason) without DB writes.
- Produce a JSON or CSV report for analysis.

### B. Unit Tests

- Parser tests: Provide sample HTML pages → assert extract_price_via_regex(html) returns correct numeric value.
- Slicer tests: Feed canned HTML → assert slice_neighborhood(html) returns correct window around the target $.
- Validator tests: Simulate old/new prices → assert Step 7 logic (LLM checks, rule-based sanity check) correctly identifies "valid" vs. "anomaly", sets the manual review flag, and generates appropriate failure_reason.
- (Add tests for Step 7 sanity check rule logic & threshold config)
- (Add tests for retry logic handling and failure reason generation, including step context)

### C. Integration (Smoke) Tests

- Sample set (~10 SKUs): Cover each extraction branch (Static Parse, Slice Fast, Slice Balanced, Branch->Full HTML, Branch->JS Interact API, Branch->JS Interact PW, Branch->JS Interact HAR).
- Run in dry-run → manually verify logs (including failure_reason) and refine configs.
- (Test with and without specific variant_extraction_config entries, including API endpoint caching/clearing and the requires_js_interaction flag)
- (Test error conditions to verify retry logic and failure reasons)

### D. Canary Live Run

- Flip off dry-run for the same sample set.
- Confirm writes to Supabase: new price_history rows created (with failure_reason populated on failures), machines_latest updated correctly.
- Track anomaly flags (manual_review_flag = true occurrences) and review associated failure_reason values.
- Monitor retry logs for frequency and patterns.

### E. Full Roll-Out

- Run all SKUs once.
- Monitor logs, anomaly flags (failure_reason), retry rates, and DB size.
- After 2–3 clean runs, schedule production twice-weekly.

## 6. Implementation Plan & Phases

| Phase | Tasks | Duration |
|-------|-------|----------|
| A | Kick-off & Setup: Provision Supabase schema (incl. variant_extraction_config), Bootstrap Python project | 1 day |
| B | Core Pipeline: Implement Static Parse (Step 2) + Slice Check Fast (Step 3), Add dry-run mode, Implement basic retry logic | 2 days |
| C | DB Integration: Wire up Supabase client, Implement Final Validation & Sanity Check logic (Step 7, incl. failure reason), Write DB reads/writes (Step 8) | 1 day |
| D | Smoke Tests: Create unit tests & smoke harness, Run sample set & fix parser/config edge-cases | 1 day |
| E | Advanced Fallbacks: Slice Check Balanced (Step 4), Branching Logic (Step 4b), JS Interaction Check (Step 5, incl. caching & retry logic), Full HTML Check (Step 6), Refine retry strategies | 2 days |
| F | Full-Scale Canary: Dry-run full SKU list, Populate some variant_extraction_config (incl. requires_js_interaction flag), Live run on subset, Monitor & refine | 1 day |
| G | Production Roll-out: Enable twice-weekly cron, Final docs | 1 day |
| **Total:** | | **~9 business days** |

## 7. Appendix: Sample Prompts & Config

### A. Haiku Price-Extraction Prompt

```
You are a price-extraction agent. Extract the numeric price (in USD) from the snippet below. Return JSON: {"price": number, "currency": "USD"}. Do not include any other fields.

HTML Snippet:
---
<span class="total">$6,995</span>
---
```

### B. Haiku Validator Prompt (Illustrates Folded Validation Input)

```
Previous price: $6995
New candidate price: $9995
Snippet around the new price:
---
<span class="total">Total after options: $9,995</span>
---
Question: Is $9995 a plausible correct price, or is this a parsing error? Answer JSON: {"valid": true}.
```

### C. Variant Extraction Config Example

```sql
INSERT INTO variant_extraction_config (
  machine_id, variant_attribute, domain,
  requires_js_interaction, -- Set TRUE for sites needing Playwright clicks
  api_endpoint_template,
  api_endpoint_discovered_at,
  css_price_selector,
  js_click_sequence,
  min_extraction_confidence,
  min_validation_confidence,
  sanity_check_threshold
) VALUES (
  'MIRA-S', '60W', 'aeonlaser.us',
  TRUE, -- This site needs JS interaction
  'https://aeonlaser.us/api/config_price?model=mira-s&power=60W', -- Could be discovered
  '2025-04-18T10:00:00Z', -- Example timestamp
  '.price-container .total',
  '["click:text=AEON 60W RF Tube"]', -- Example click sequence
  0.95,
  0.90,
  0.30
);
```
