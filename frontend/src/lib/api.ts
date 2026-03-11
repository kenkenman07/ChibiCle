/**
 * Centralized API client — decouples frontend from backend URL.
 *
 * In development with Vite proxy, VITE_API_BASE_URL can be left empty
 * (relative paths go through the proxy).
 * In production, set VITE_API_BASE_URL to the backend origin
 * (e.g. "https://api.example.com").
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? ''

/** Standard fetch wrapper that prepends the API base URL. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, init)
}

/** Build a WebSocket URL for the given path (e.g. "/ws/camera?trip_id=xxx"). */
export function apiWsUrl(path: string): string {
  if (API_BASE) {
    const url = new URL(API_BASE)
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProtocol}//${url.host}${path}`
  }
  // Relative — use current page origin (works with Vite proxy in dev)
  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${wsProtocol}//${location.host}${path}`
}
