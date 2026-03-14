package domain

import "math"

const earthRadiusM = 6_371_000.0 // 地球の平均半径（メートル）

// DistanceM は2点間のHaversine距離をメートル単位で返す．
// GPS座標から交差点までの距離や経路逸脱の判定に使用する．
func DistanceM(lat1, lng1, lat2, lng2 float64) float64 {
	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)
	rLat1 := toRad(lat1)
	rLat2 := toRad(lat2)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(rLat1)*math.Cos(rLat2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusM * c
}

func toRad(deg float64) float64 {
	return deg * math.Pi / 180
}
