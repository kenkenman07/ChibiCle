package domain

// OsrmRoutingError はOSRM APIへのリクエストが失敗した際のエラー型．
// ハンドラー層で errors.As により型判定し，HTTP 502 として返却する．
type OsrmRoutingError struct {
	Message string // ユーザー向けのエラーメッセージ（日本語）
}

func (e *OsrmRoutingError) Error() string {
	return e.Message
}
