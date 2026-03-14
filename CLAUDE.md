# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Blue Ticket Driving** (青切符ドライブ) — a PWA targeting cyclists aged 5–15 to build the habit of stopping at every intersection. In response to Japan's April 2026 revised bicycle penalty law (青切符), this app encourages young riders to consciously stop at all intersections along their route. User sets a destination, an OSRM bicycle route is computed, and GPS tracks whether they stopped (speed < 3 km/h) at each intersection (3+ roads).

Language: Japanese specification/design docs (`仕様書.md`, `設計書.md`), code comments in Japanese, identifiers in English.

## Commands

### Frontend (run from `frontend/`)

```bash
npm run dev       # Vite dev server (HTTPS + proxy to backend)
npm run build     # tsc -b && vite build
npm run lint      # eslint .
```

### Backend (run from `backend/`)

```bash
uv venv .venv && uv pip install -r requirements.txt  # first time
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload  # dev server
```

### Dev Setup

```bash
make dev  # フロントエンド + バックエンドを同時起動（プロジェクトルートから実行）
```

個別に起動する場合:
1. `cd backend && .venv/bin/uvicorn app.main:app --port 8000 --reload`
2. `cd frontend && npm run dev`

Vite proxies `/api/*` → `http://localhost:8000` and `/ws` → `ws://localhost:8000` (configured in `vite.config.ts`). Frontend uses HTTPS via `@vitejs/plugin-basic-ssl` (required for GPS on mobile LAN access).

**No tests exist yet** — no pytest, vitest, or jest configuration in the project.

## Architecture

### Backend — Clean Architecture with Protocols

```
backend/app/
├── main.py              # FastAPI app, lifespan DI wiring, CORS, router registration
├── config.py            # Settings (pydantic-settings, env prefix BTD_)
├── schemas.py           # Pydantic request/response models
├── domain/
│   ├── models.py        # Pure dataclasses: GpsPoint, Trip, Intersection, Route, etc.
│   └── ports.py         # Protocol interfaces: TripRepository, GpsRepository, RoutingService
├── usecases/
│   ├── gps_analysis.py  # GPS batch processing, stop detection, off-route rerouting
│   └── route_planning.py # Route planning + intersection result initialization
└── adapters/
    ├── memory_repo.py   # In-memory repository (no DB yet; Supabase deferred)
    ├── osrm_gateway.py  # OSRM API client, intersection extraction (bearings >= 3)
    └── routers/
        ├── trips.py     # POST /api/trips, POST /api/trips/{id}/route, GET /api/trips/{id}/intersections
        └── gps.py       # POST /api/gps — batch GPS sync with intersection updates
```

Dependency injection: concrete implementations are wired in `main.py` lifespan and stored in `app.state`, then accessed in routers via `request.app.state`.

### Frontend — Local-First PWA

```
frontend/src/
├── App.tsx              # React Router: /login, / (Layout → Home/History/Settings), /riding, /result/:tripId
├── pages/               # RidingPage (destination setup → riding), ResultPage (stop/miss markers)
├── components/          # Layout, ViolationCard
├── hooks/
│   ├── useGpsTracker.ts # GPS watchPosition → Dexie buffer → POST /api/gps every 5s
│   └── useWakeLock.ts   # Screen Wake Lock lifecycle
├── stores/
│   └── rideStore.ts     # Zustand: ride state, route, intersection counts, GPS position
└── lib/
    ├── api.ts           # apiFetch() wrapper + Nominatim search
    ├── db.ts            # Dexie IndexedDB schema (trips, gpsPoints, intersectionResults, routes)
    └── geo.ts           # Haversine distance utility
```

PWA configured via `vite-plugin-pwa`: standalone portrait mode, runtime caching for OSM tiles (7-day, 500 max) and Leaflet assets (30-day, 20 max).

### Data Flow During a Ride

1. User searches destination (Nominatim) or taps map → `POST /api/trips` → `POST /api/trips/{id}/route`
2. Backend fetches OSRM bicycle route, extracts intersections (nodes with `bearings.length >= 3`)
3. GPS `watchPosition` fires → points buffered in IndexedDB → `POST /api/gps` every 5 seconds
4. Backend checks each GPS point: within 15m of intersection + speed < 3 km/h = stopped
5. If rider is >50m off route, backend auto-reroutes via OSRM
6. Intersection results returned → Zustand store → live UI update

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS 3, React Router v7, Zustand 5 (client state), Dexie 4 (IndexedDB), React Leaflet 5 (maps), lucide-react (icons), vite-plugin-pwa
- **Backend**: FastAPI, OSRM (public bicycle routing API), geopy (distance), httpx, Pydantic v2, pydantic-settings
- **Storage**: IndexedDB (local-first) + in-memory dict on backend

## Configuration

All backend thresholds are in `backend/app/config.py` via pydantic-settings (env prefix `BTD_`):

| Setting | Default | Purpose |
|---------|---------|---------|
| `intersection_radius_m` | 15.0 | Max distance to count as "at intersection" |
| `intersection_speed_threshold` | 3.0 | Speed (km/h) below which rider is "stopped" |
| `intersection_min_roads` | 3 | Min bearings to qualify as intersection (T-junction+) |
| `off_route_threshold_m` | 50.0 | Distance from route before auto-reroute |
| `osrm_base_url` | `https://router.project-osrm.org` | OSRM endpoint |
| `cors_origins` | `["https://localhost:5173", ...]` | Allowed CORS origins |

## Key Constraints

- Background GPS is impossible in browsers — Wake Lock API keeps screen ON during rides
- iOS Safari: Service Worker freezes when backgrounded, no Background Sync
- GPS requires HTTPS (localhost is exempt)
- OSRM public API: no key needed but rate-limited — self-host for production
