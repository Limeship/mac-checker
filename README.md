# Lime Tracker

Tracks office presence by detecting devices on the local network via UniFi, and syncing desk reservations from Robin. Data is stored in SurrealDB.

## Structure

- `backend/` — Bun + Hono API server. Polls UniFi every 15 min, syncs devices/people from Coda daily, syncs Robin reservations daily.
- `frontend/` — React + Vite + Tailwind UI. Calendar, stats, and people pages.
