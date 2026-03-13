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

/** NominatimジオコーディングAPIで住所検索。 */
export async function searchAddress(
  query: string,
): Promise<Array<{ lat: number; lng: number; display_name: string }>> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    countrycodes: 'jp',
    limit: '5',
  })
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { 'Accept-Language': 'ja' } },
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.map((item: { lat: string; lon: string; display_name: string }) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    display_name: item.display_name,
  }))
}
