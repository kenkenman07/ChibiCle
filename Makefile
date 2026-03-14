.PHONY: dev dev-frontend dev-backend

# フロントエンド(HTTPS) + バックエンド(HTTP)を同時起動
# Vite(basicSsl)がHTTPSを提供し、/api/*をバックエンドにプロキシ
dev:
	@trap 'kill 0' EXIT; \
	cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload & \
	cd frontend && npm run dev & \
	wait

# フロントエンドのみ
dev-frontend:
	cd frontend && npm run dev

# バックエンドのみ
dev-backend:
	cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
