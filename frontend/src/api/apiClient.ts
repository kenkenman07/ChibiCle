const API_BASE = import.meta.env.VITE_API_BASE
import type { GpsPoint } from "../hooks/useGps";

export type DestinationPosition = {
    destination_lat: number,
    destination_lng: number,
}

export type OriginPosition = {
    origin_lat: number,
    origin_lng: number,
}

export type GpsRequest = {
  trip_id: string;
  points: GpsPoint[];
};

export type GeoQueryParam = {
    location_name: string
    limit: number
}

const apiClient = async (endPoint: string, options?: RequestInit) => {
    const res = await fetch(`${API_BASE}${endPoint}`, {
        headers: {
            "Content-Type": "application/json",
        },
        ...options,
    })

    if (!res.ok) {
        throw new Error("API request failed");
    }
    
    return res.json()
}

// 機能　- 使用フェーズ

// トリップ作成 - 目的地設定時
export const createTrips = async (
    requestData: DestinationPosition
) => {
  return apiClient("/trips", {
    method: "POST",
    body: JSON.stringify(requestData),
})
}

// トリップ一覧取得 - 履歴画面
export const getAllTrips = async () => {
    return apiClient("trips", {
        method: "POST",
    })
}

// トリップ詳細取得 - リルート後のルート再取得
export const reRoute = async (tripId: string) => {
    return apiClient(`/trips/${tripId}`, {
        method: "GET",
    })
}

// ルート計画 - 目的地設定時
export const fetchRoute = async (tripId: string, requestData: OriginPosition) => {
    return apiClient(`/trips/${tripId}/route`, {
        method: "POST",
        body: JSON.stringify(requestData),
    })
}

// トリップ終了 - 走行終了時
export const finishTrip = async (tripId: string) => {
  return apiClient(`/trips/${tripId}/end`, {
    method: "PATCH",
  })
}

// 交差点結果サマリー - 結果画面
export const getIntersectionSummary = async (tripId: string) => {
    return apiClient(`/trips/${tripId}/intersections`, {
        method: "GET"
    })
}

// GPSバッチ送信　- 走行中(5秒間隔)
export const sendCurrentLocation = async (requestData: GpsRequest) => {
    return apiClient(`/gps`, {
        method: "POST",
        body: JSON.stringify(requestData)
    })
}

// 地名検索 - 出発地・目的地検索
export const searchPlace = async (query: GeoQueryParam) => {
    return apiClient(
        `/geocode?q=${query.location_name}&limit=${query.limit}`, 
        {
            method: "GET"
        }
    )
}