const API_BASE = import.meta.env.VITE_API_BASE;
import type { GpsPoint } from "../hooks/useGps";

// リクエスト・クエリ型
// DestinationPosition, OriginPosition, GpsRequest, GeoQueryParam
export type DestinationPosition = {
  destination_lat: number;
  destination_lng: number;
};

export type OriginPosition = {
  origin_lat: number;
  origin_lng: number;
};

export type GpsRequest = {
  trip_id: string;
  points: GpsPoint[];
};

export type GeoQueryParam = {
  location_name: string;
  limit: number;
};

export type DistanceM = {
  distance_m: number;
};

// レスポンス型
// レスポンス型では型定義名の語尾にInfoを入れた
type Intersection = {
  index: number;
  lat: number;
  lng: number;
  num_roads: number;
  stopped: boolean;
  min_speed_kmh: number | null;
};
type Route = {
  geometry: [number, number][];
  intersections: Intersection[];
  distance_m: number;
  duration_s: number;
};

// POST /api/trips  or GET /api/trips
export type TripInfo = {
  id: string;
  started_at: string;
  ended_at: string | null;
  distance_m: number;
  destination_lat: number;
  destination_lng: number;
  route: Route | null;
};

// GET /api/trips/{tripID}
// 型不明

//POST /api/route
export type RouteInfo = {
  id: string;
  route: Route;
};

type IntersectionUpdates = {
  index: number;
  stopped: boolean;
  min_speed_kmh: number;
};

// GET /api/trips/{tripID}/intersections
// 型不明

//POST /api/gps
export type GpsInfo = {
  saved: number;
  intersection_updates: IntersectionUpdates[];
  rerouted: boolean;
};

//GET /api/geocode
export type SearchResultInfo = {
  lat: number;
  lng: number;
  display_name: string;
};

const apiClient = async <T>(
  endPoint: string,
  options?: RequestInit
): Promise<T> => {
  const res = await fetch(`${API_BASE}${endPoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error("API request failed");
  }

  return res.json();
};

// 機能　- 使用フェーズ

// トリップ作成 - 目的地設定時
export const sendTrips = async (
  requestData: DestinationPosition
): Promise<TripInfo> => {
  return await apiClient<TripInfo>("/trips", {
    method: "POST",
    body: JSON.stringify(requestData),
  });
};

// トリップ一覧取得 - 履歴画面
export const getAllTrips = async (): Promise<TripInfo[]> => {
  return await apiClient<TripInfo[]>("trips", {
    method: "POST",
  });
};

// トリップ詳細取得 - リルート後のルート再取得
export const reRoute = async (tripId: string) => {
  return await apiClient(`/trips/${tripId}`, {
    method: "GET",
  });
};

// ルート計画 - 目的地設定時
export const fetchRoute = async (
  tripId: string,
  requestData: OriginPosition
): Promise<RouteInfo> => {
  return await apiClient<RouteInfo>(`/trips/${tripId}/route`, {
    method: "POST",
    body: JSON.stringify(requestData),
  });
};

// トリップ終了 - 走行終了時
export const finishTrip = async (
  tripId: string,
  requestData: DistanceM
): Promise<TripInfo> => {
  return await apiClient<TripInfo>(`/trips/${tripId}/end`, {
    method: "PATCH",
    body: JSON.stringify(requestData),
  });
};

// 交差点結果サマリー - 結果画面
export const getIntersectionSummary = async (tripId: string) => {
  return apiClient(`/trips/${tripId}/intersections`, {
    method: "GET",
  });
};

// GPSバッチ送信　- 走行中(5秒間隔)
export const sendCurrentLocation = async (
  requestData: GpsRequest
): Promise<GpsInfo> => {
  return await apiClient<GpsInfo>(`/gps`, {
    method: "POST",
    body: JSON.stringify(requestData),
  });
};

// 地名検索 - 出発地・目的地検索
export const searchPlace = async (
  query: GeoQueryParam
): Promise<SearchResultInfo[]> => {
  return await apiClient<SearchResultInfo[]>(
    `/geocode?q=${query.location_name}&limit=${query.limit}`,
    {
      method: "GET",
    }
  );
};
