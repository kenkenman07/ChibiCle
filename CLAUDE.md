# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Blue Ticket Driving** (青切符ドライブ) — a PWA that detects bicycle traffic violations (signal ignoring, failure to stop) using GPS and camera data, then reports results to parents. Built for the April 2026 Japanese bicycle penalty law changes.

Language: Japanese specification/design docs, English code.

## Repository Structure

- `frontend/` — React 19 + Vite + TypeScript PWA
- `backend/` — Python FastAPI + YOLOv8n + OpenCV
- `仕様書.md` — Requirements specification
- `設計書.md` — Technical design document

## Frontend Commands

Run from `frontend/`:

```bash
npm run dev       # Vite dev server (HTTPS + proxy to backend)
npm run build     # tsc -b && vite build
npm run lint      # eslint .
```

## Backend Commands

Run from `backend/`:

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt  # first time
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload  # dev server
```

YOLOv8n model auto-downloads on first startup (~6MB).

## Dev Setup

Run both servers:
1. `cd backend && .venv/bin/uvicorn app.main:app --port 8000 --reload`
2. `cd frontend && npm run dev`

Vite proxies `/api/*` → `http://localhost:8000` and `/ws/*` → `ws://localhost:8000` (configured in `vite.config.ts`). This avoids CORS and mixed-content issues. The frontend uses HTTPS via `@vitejs/plugin-basic-ssl` (required for GPS/camera on mobile LAN access).

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS 3, React Router v7, Zustand (client state), Dexie.js (IndexedDB offline buffer), lucide-react (icons)
- **Backend**: FastAPI, YOLOv8n (ultralytics), OpenCV, geopy, httpx, Pydantic v2
- **Storage**: IndexedDB (local-first) + in-memory dict on backend (Supabase integration deferred)
- **Communication**: WebSocket for camera frames (2fps JPEG), HTTP POST for GPS batch (every 5s)

## Architecture

```
PWA (React SPA)
  ├─ Wake Lock API (screen on during rides)
  ├─ GPS watchPosition → Dexie.js → POST /api/gps (5s batch)
  ├─ Camera Canvas+toBlob (480p, 2fps) → WS /ws/camera → FastAPI
  └─ Local IndexedDB (trips, gps_points, violations)

FastAPI Server (single app, router separation)
  ├─ WS /ws/camera — YOLOv8n detects traffic lights, OpenCV HSV checks red, speed > 5km/h = violation
  ├─ POST /api/gps — Overpass API for stop signs, speed < 3km/h check within 10m = violation
  ├─ /api/trips — CRUD (in-memory store for MVP)
  └─ Model loaded once at startup via lifespan context manager
```

## Key Files

- `frontend/src/hooks/useGpsTracker.ts` — GPS tracking + Dexie write + batch sync to backend
- `frontend/src/hooks/useCameraStream.ts` — Camera capture + WebSocket frame sending + violation event handling
- `frontend/src/hooks/useWakeLock.ts` — Screen Wake Lock lifecycle
- `frontend/src/stores/rideStore.ts` — Zustand store for active ride state
- `frontend/src/lib/db.ts` — Dexie IndexedDB schema (trips, gpsPoints, violations)
- `backend/app/services/camera_analysis.py` — YOLOv8n + OpenCV red signal detection
- `backend/app/services/gps_analysis.py` — Stop sign violation detection
- `backend/app/services/overpass.py` — OSM Overpass API client with grid-based cache (24h TTL)
- `backend/app/routers/camera.py` — WebSocket endpoint with heartbeat + backpressure queue
- `backend/app/config.py` — All tunable thresholds (env prefix: BTD_)

## Key Constraints

- Background GPS is impossible in browser — Wake Lock API keeps screen ON during rides
- iOS Safari: Service Worker freezes when backgrounded, no Background Sync
- Camera requires `playsInline` attribute on iOS Safari
- GPS/Camera require HTTPS (localhost is exempt)
- Backend runs YOLO inference in thread pool via `asyncio.to_thread` to avoid blocking the event loop
