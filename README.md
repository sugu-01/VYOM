# VYOM — Catastrophe Risk Intelligence Platform

VYOM is a web platform for assessing catastrophe risk (cyclone, flood, storm surge, extreme rainfall) across **Tamil Nadu, India**. It combines a geospatial risk map, an auditable per-asset loss calculation, a scenario simulator, a property risk and pricing assessment, and an AI copilot grounded in a domain knowledge base.

> **Status: research prototype.** Hazard scores, exposure totals, historical losses and vulnerability curves are curated illustrative data, not outputs of a calibrated stochastic model. Outputs support expert review and are **not** automatic underwriting decisions.

---

## Why VYOM

Generic catastrophe models such as FEMA Hazus are calibrated on US construction and perils. VYOM uses Tamil Nadu–specific building typologies and perils (Bay of Bengal cyclones, Cauvery delta flooding, Chennai urban flooding, Nilgiris landslides). Every number it shows can be traced to a formula, so each step can be inspected and challenged.

## Features

| Module | What it does |
|---|---|
| **Overview** | Portfolio TIV, zone-level hazard summary |
| **Risk Map** | Interactive map of 9 Tamil Nadu micro-zones and exposed assets |
| **Hazard Analysis** | Property-level flood, earthquake and landslide scores, overall tier, premium and expected loss |
| **Exposure & Assets** | Asset register: add manually, import CSV/GeoJSON, export |
| **Loss History** | Registry of major events, 2004–2024 (Michaung, Gaja, Vardah, 2015 floods, Thane, …) |
| **Risk Modelling** | Vulnerability curves and return-period (OEP/AEP) table |
| **Scenario Simulator** | What-if on rainfall anomaly, storm surge, wind change and plinth elevation |
| **Loss Anatomy** *(signature)* | 7-step auditable trace from hazard intensity to EAL, with formulas, assumptions and limitations |
| **Explainability** | Explains how scores are produced |
| **Data Trust Center** | Dataset provenance cards and a trust score |
| **Risk Passport** | One-page asset risk summary |
| **AI Copilot** | Retrieval-grounded Q&A (Gemini) with a deterministic offline fallback |
| **Settings** | Supabase connection, SQL schema script |

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, MapLibre GL, Motion, Lucide
- **Server:** Node.js + Express (`server.ts`, run with `tsx`), serves the app and the `/api/copilot/chat` endpoint
- **AI:** Google Gemini via `@google/genai` (server-side only), with in-memory keyword retrieval over a knowledge corpus
- **Backend-as-a-service:** Supabase (auth, `assets` table, risk-pricing RPC functions). Optional: the app falls back to browser localStorage

## Getting started

**Prerequisites:** Node.js 20+

```bash
npm install
cp .env.example .env     # then fill in your keys
npm run dev
```

Open <http://localhost:3001>.

### Environment variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Enables the Gemini copilot (server-side). Without it the copilot uses a deterministic fallback. |
| `VITE_SUPABASE_URL` | Supabase project URL (can also be set in the in-app Settings page) |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key. Never use the `service_role` key here |
| `PORT` | Optional, default `3001` |

Never commit `.env` files. Rotate any key that has been shared.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Express + Vite middleware) |
| `npm run build` | Production build into `dist/` |
| `NODE_ENV=production npm start` | Serve the production build |
| `npm run lint` | Type-check with `tsc --noEmit` |

### Supabase setup (optional)

1. Create a Supabase project.
2. In **Settings → SQL schema** inside the app, copy the migration script and run it in the Supabase SQL editor. It creates the `assets` and `audit_traces` tables with row-level security.
3. The property assessment page also calls the RPC functions `calculate_property_risk_and_pricing` and `assess_location_risk`. Define these in your project; their SQL is not part of this repository.

## How the model works

```
Hazard intensity ──► Vulnerability curve ──► Damage ratio ──► Gross loss ──► Net loss ──► EAL / PML
 (depth / wind)       (by construction)       (0–1)          TIV × DR       limit &        annualised
                                                                             deductible
```

| Step | Formula |
|---|---|
| Net flood depth | `H = max(0, H_flood − H_plinth)` |
| Damage ratio | Piecewise-linear interpolation on the curve for the construction class, bounded to [0, 1] |
| Gross loss | `TIV × damage ratio` |
| Net insured loss | `min(limit, max(0, gross − deductible))` |
| EAL | `gross × 0.04` (fixed 1-in-25-year annual probability) |
| PML (1-in-100) | `gross × 1.45` |
| Technical rate | `EAL / TIV × 10,000` bps |
| Scenario depth | `1.2 × (1 + rainfall%/100) + 0.4 × surge − plinth` |
| Overall property score | `0.4 × flood + 0.3 × earthquake + 0.3 × landslide` |
| Earthquake score | `Z / 0.36 × 100`, with Z from the IS 1893 zone (II = 0.10, III = 0.16) |
| Premium | `replacement value × 0.0015 × tier multiplier` (Low 0.9, Moderate 1.0, High 1.35, Extreme 1.8) |

**Vulnerability curves:** `TN-RCC-2024`, `TN-Masonry`, `TN-Industrial-PEB`, `TN-Agri-Paddy`, defined in `src/data/tamilNaduGeodata.ts`.

**Tunable parameters:** weights, tier cut-offs and multipliers are in the `CONFIG` block of `src/utils/propertyRiskCompletion.ts`.

**Tests:** `runAutomatedVerificationTests()` in `src/utils/catRiskEngine.ts` checks damage-ratio bounds, curve monotonicity, deductible and limit logic, and a hand-checkable example (₹50,00,000 × 20% = ₹10,00,000).

## Data and provenance

| Data | Origin |
|---|---|
| Zone hazard scores, exposure totals, historical events | Curated, hardcoded in `src/data/tamilNaduGeodata.ts` |
| Vulnerability curve points | Hand-entered; curves cite IIT Madras, Anna University, CSIR-SERC and TNAU as references |
| Dataset cards (IMD, NRSC Bhuvan, TNDMA) | Metadata only; no source data is ingested |
| Insured value | User input (form, CSV/GeoJSON, Supabase) or demo seed data; there is no valuation model |
| Replacement value (property page) | User input, or `area × tier rate` (₹2,000 / 1,600 / 1,300 per sq ft for Tier 1 / 2 / 3) |
| Copilot knowledge base | 8 hand-written chunks in `src/data/vectorKnowledgeBase.ts` |

Items marked "Estimated" in the UI are filled by fallback rules rather than measured data.

## Known limitations

- Vulnerability curves are not validated against claims data.
- Annual probability (0.04), PML multiplier (1.45) and uncertainty bands are fixed constants, not derived from an event set.
- Return-period rainfall and wind use hand-fitted log curves, not a fitted extreme-value distribution.
- No spatial correlation or portfolio aggregation model is implemented.
- Hazard layers are static; there are no live IMD/INCOIS feeds.
- Copilot retrieval is keyword-based over a small in-memory corpus, not an embedding vector store.
- Seismic zoning uses a coarse bounding-box lookup.

## Roadmap

- Validate and calibrate curves against historical claims (Michaung 2023, Vardah 2016, 2015 floods)
- Stochastic event catalogue with proper EAL/PML integration
- Polygon-level exposure and hazard overlap
- Live hazard feeds and real dataset ingestion
- Embedding-based retrieval for the copilot

## Project structure

```
server.ts                      Express server + copilot API
src/
  App.tsx, main.tsx            App shell and routing
  components/                  Navbar, Sidebar, Login, Copilot modal, opening animation
  components/views/            One file per module (Overview, Risk Map, Loss Anatomy, …)
  data/                        Zone data, curves, events, trust registry, knowledge base
  services/supabaseClient.ts   Supabase auth, assets, RPC calls
  types/risk.ts                Shared types
  utils/catRiskEngine.ts       Loss Anatomy, scenario and return-period calculations
  utils/propertyRiskCompletion.ts  Fallback scoring and pricing for property assessment
```

## Disclaimer

VYOM is an educational and research prototype. It is not a licensed catastrophe model and must not be used as the sole basis for underwriting, pricing or reserving decisions.
