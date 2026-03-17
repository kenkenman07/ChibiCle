# Repository Guidelines

## Project Structure & Module Organization
This repository is a Go backend service for BlueTicketDriving. The entrypoint is [`cmd/server/main.go`](/Users/bananamo/BlueTicketDriving/backend-go/cmd/server/main.go). Core application code lives under `internal/`:

- `internal/domain`: domain models, shared types, and port interfaces
- `internal/usecase`: business logic such as route planning and GPS analysis
- `internal/adapter`: infrastructure adapters, HTTP handlers, gateways, and in-memory repositories
- `internal/config`: environment-driven application settings

Keep new packages aligned with this layering. External integrations belong in `internal/adapter`; business rules should stay in `internal/usecase` or `internal/domain`.

## Build, Test, and Development Commands
- `go run ./cmd/server`: start the API locally on port `8000` by default
- `go build ./...`: compile all packages and catch type errors
- `go test ./...`: run the full test suite
- `docker build -t btd-backend .`: build the container image defined by [`Dockerfile`](/Users/bananamo/BlueTicketDriving/backend-go/Dockerfile)

Configuration is loaded from environment variables with the `BTD_` prefix. Example: `BTD_CORS_ALLOW_ALL=false go run ./cmd/server`.

## Coding Style & Naming Conventions
Follow standard Go formatting: tabs for indentation, `gofmt` formatting, and idiomatic package structure. Use:

- `CamelCase` for exported names
- `camelCase` for unexported helpers
- short, lowercase package names such as `config` or `handler`

Prefer constructor-style functions like `NewTripHandler`. Keep HTTP concerns in handler files and avoid leaking transport details into domain or use case packages.

## Testing Guidelines
There are currently no committed `*_test.go` files, but new logic should ship with table-driven Go tests where practical. Place tests beside the package they cover and name them with Go’s default pattern, for example `route_planning_test.go`. Run `go test ./...` before opening a PR.

## Commit & Pull Request Guidelines
Recent history uses short, task-focused commit messages, often in Japanese, for example `Destinationの修正`. Keep commits narrow and descriptive. For pull requests, include:

- a brief summary of behavior changes
- linked issue or task ID when available
- API examples or screenshots when request/response behavior changes
- confirmation that `go test ./...` and `go build ./...` passed

## Security & Configuration Tips
Do not hardcode API endpoints or ports; use `internal/config` and `BTD_` environment variables instead. Preserve the current graceful-shutdown and HTTP client timeout behavior when extending server startup.
