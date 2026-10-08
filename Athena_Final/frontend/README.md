# ATHENA — Executive Intelligence (Frontend)

Dark, executive, champagne-gold-on-ink. Brand derived from the foil emblem;
opening sequence plays the supplied brand video (`public/intro.mp4`, auto-detected)
with a motion-built fallback in the same visual grammar.

## Run

    npm install
    npm run dev          # http://localhost:5173

Copy `.env.example` → `.env` and point it at the backend.

## Environment variables

| Variable              | Default                 | Purpose                        |
|-----------------------|-------------------------|--------------------------------|
| `VITE_API_BASE_URL`   | `https://athena-1-0.onrender.com` | Athena backend base URL        |
| `VITE_CURRENCY`       | `₹`                     | Currency symbol for monetary values |

## API contract (expected by the frontend)

Auth (POST, JSON):
- `POST /auth/login`    `{ username, password }` → `{ token, user: { username } }`
- `POST /auth/register` `{ username, password }` → `{ token, user: { username } }`

Analyses (Bearer token):
- `GET  /analyses`        → array (or `{ analyses: [...] }`) of summaries:
  `{ id, created_at, status, sku?, product?, kpis?: { roas, predicted_revenue }, recommendation?: { headline | action } }`
- `POST /analyses`        → either the full result or `{ id, status: "processing" }` (then polled)
- `GET  /analyses/:id`    → full result (see `src/lib/contract.js` for the exact shape)
- `GET  /references` (optional) → array of provenance entries; falls back to the declared contract

## Integration notes

- **All field-name expectations live in `src/lib/contract.js`.** If the backend
  names things differently, change them there — no component edits required.
- **Nothing is fabricated.** Missing fields render `—`; missing chart series
  render empty states; empty history renders an empty state. Polling runs while
  the backend reports `status: "processing"`.
- Swap the inline emblem in `src/components/AthenaMark.jsx` for the supplied
  logo asset if preferred.
- Append `?intro=0` to the URL to skip the opening sequence; users with
  `prefers-reduced-motion` skip automatically.

## Demo flow

Intro → login (`?intro=0` to skip) → Command (three modes) →
Run Analysis (fill scenario → processing → KPIs, recommendation, charts) →
History (open a record) → Data References (audit trail).