.PHONY: dev dev-frontend dev-backend build

# フロントエンドビルド + バックエンド起動（HTTPS、推奨）
# ブラウザから https://<サーバーIP>:8000 でアクセス
dev:
	cd frontend && npm run build
	cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
		--ssl-keyfile certs/key.pem --ssl-certfile certs/cert.pem

# フロントエンド + バックエンドを別々に起動（Viteプロキシ使用、ローカル開発用）
dev-local:
	@trap 'kill 0' EXIT; \
	cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload & \
	cd frontend && npm run dev & \
	wait

# フロントエンドビルドのみ
build:
	cd frontend && npm run build

# バックエンドのみ（HTTP）
dev-backend:
	cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
