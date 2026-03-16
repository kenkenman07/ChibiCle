// adapter パッケージはドメイン層のインターフェースに対する具体的な実装を提供する．
// 外部APIクライアント，リポジトリ，HTTPユーティリティなどを含む．
package adapter

import (
	"btd/internal/domain"
	"slices"
	"sync"
)

// InMemoryRepository は全リポジトリインターフェースのインメモリ実装．
// sync.RWMutex により並行安全を保証する．プロセス再起動でデータは消失する．
type InMemoryRepository struct {
	mu                  sync.RWMutex
	trips               map[string]*domain.Trip
	gps                 map[string][]domain.GpsPoint
	routes              map[string]*domain.Route
	intersectionResults map[string][]*domain.IntersectionResult
}

func NewInMemoryRepository() *InMemoryRepository {
	return &InMemoryRepository{
		trips:               make(map[string]*domain.Trip),
		gps:                 make(map[string][]domain.GpsPoint),
		routes:              make(map[string]*domain.Route),
		intersectionResults: make(map[string][]*domain.IntersectionResult),
	}
}

// --- TripRepository の実装 ---

func (r *InMemoryRepository) Get(tripID string) (*domain.Trip, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	t, ok := r.trips[tripID]
	if !ok {
		return nil, nil // 存在しない場合は nil を返す（エラーではない）
	}
	return t, nil
}

func (r *InMemoryRepository) Save(trip *domain.Trip) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.trips[trip.ID] = trip
	return nil
}

// ListAll は全トリップを開始日時の降順（新しい順）で返す．
func (r *InMemoryRepository) ListAll() ([]*domain.Trip, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]*domain.Trip, 0, len(r.trips))
	for _, t := range r.trips {
		out = append(out, t)
	}
	slices.SortFunc(out, func(a, b *domain.Trip) int {
		if a.StartedAt > b.StartedAt {
			return -1
		}
		if a.StartedAt < b.StartedAt {
			return 1
		}
		return 0
	})
	return out, nil
}

// --- GpsRepository の実装 ---

func (r *InMemoryRepository) GetPoints(tripID string) ([]domain.GpsPoint, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.gps[tripID], nil
}

// AppendPoints はGPSポイントをトリップに追記する．5秒間隔のバッチ受信で呼ばれる．
func (r *InMemoryRepository) AppendPoints(tripID string, points []domain.GpsPoint) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.gps[tripID] = append(r.gps[tripID], points...)
	return nil
}

// --- RouteRepository の実装 ---

// SaveRoute はルートを保存する．リルート時は上書きされる．
func (r *InMemoryRepository) SaveRoute(tripID string, route *domain.Route) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.routes[tripID] = route
	return nil
}

func (r *InMemoryRepository) GetRoute(tripID string) (*domain.Route, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.routes[tripID], nil
}

func (r *InMemoryRepository) SaveIntersectionResults(tripID string, results []*domain.IntersectionResult) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.intersectionResults[tripID] = results
	return nil
}

func (r *InMemoryRepository) GetIntersectionResults(tripID string) ([]*domain.IntersectionResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.intersectionResults[tripID], nil
}
