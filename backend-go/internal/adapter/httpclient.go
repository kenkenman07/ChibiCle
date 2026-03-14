package adapter

import "net/http"

// RoundTripperWithUA は全外部HTTPリクエストにUser-Agentヘッダーを自動付与する
// http.RoundTripper のラッパー．
// OSRM や Photon など外部APIへのリクエストで利用規約に準拠するために使用する．
type RoundTripperWithUA struct {
	Base http.RoundTripper // 委譲先のTransport
	UA   string            // 付与する User-Agent 文字列
}

func (rt *RoundTripperWithUA) RoundTrip(req *http.Request) (*http.Response, error) {
	req.Header.Set("User-Agent", rt.UA)
	return rt.Base.RoundTrip(req)
}
