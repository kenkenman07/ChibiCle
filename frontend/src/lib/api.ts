/**
 * APIクライアント — フロントエンドとバックエンドURLを分離。
 *
 * Viteプロキシ使用時はVITE_API_BASE_URLを空にできる
 * （相対パスがプロキシを経由する）。
 * 本番環境ではバックエンドのオリジンを設定
 * （例: "https://api.example.com"）。
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? ''

/** APIベースURLを付与するfetchラッパー。 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, init)
}

/** Backend経由でPhoton APIによる住所検索を行う。 */
export async function searchAddress(
  query: string,
): Promise<Array<{ lat: number; lng: number; display_name: string }>> {
  const params = new URLSearchParams({ q: query, limit: '5' })
  const res = await apiFetch(`/api/geocode?${params}`)
  if (!res.ok) return []
  return res.json()
}
