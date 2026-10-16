# VYOM - how to run

1. Install Node.js 20+ (https://nodejs.org).
2. Open a terminal in this folder (the one containing package.json).
3. `node_modules` is already included. If anything is missing, run: `npm install`
4. Start: `npm run dev`
5. Open http://localhost:3001

Keys are read from `.env` (Supabase URL/anon key, Gemini key). Change them there or in the app's Settings page.

Production build (optional): `npm run build` then `set NODE_ENV=production && npm start` (Windows) or `NODE_ENV=production npm start` (Mac/Linux).

## What was fixed
- Hazard Analysis: Overall Risk Score, Risk Tier, Final Annual Premium and Expected Loss no longer show "Unavailable".
  Earthquake is estimated from the IS 1893 seismic zone (src/utils/propertyRiskCompletion.ts); all estimates are labelled "Estimated".
- Tunable numbers (weights, tier cut-offs, multipliers) are in the CONFIG block of that file.
- Minor bug fixes (base-rate display, null-safe fields, type error). No design changes.
