.PHONY: help install install-frontend install-backend dev dev-frontend dev-backend run test test-frontend test-backend test-integration build clean

help:
	@echo "Interview Canvas Application"
	@echo ""
	@echo "Available commands:"
	@echo "  make install           - Install all dependencies"
	@echo "  make install-frontend   - Install frontend dependencies"
	@echo "  make install-backend    - Install backend dependencies"
	@echo "  make dev               - Start both frontend and backend"
	@echo "  make dev-frontend      - Start frontend only (port 5173)"
	@echo "  make dev-backend       - Start backend only (port 8000)"
	@echo "  make run               - Start backend with PostgreSQL (uses DATABASE_URL or SDIP_DATABASE_URL)"
	@echo "  make test              - Run all tests"
	@echo "  make test-frontend     - Run frontend tests"
	@echo "  make test-backend      - Run backend unit tests"
	@echo "  make test-integration  - Run backend integration tests (requires docker-compose)"
	@echo "  make build             - Build frontend for production"
	@echo "  make clean             - Clean build artifacts"

install:
	@echo "Installing all dependencies..."
	@$(MAKE) install-frontend
	@$(MAKE) install-backend

install-frontend:
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install

install-backend:
	@echo "Installing backend dependencies..."
	@cd backend && uv sync

dev:
	@echo "Starting frontend and backend..."
	@$(MAKE) dev-frontend &
	@$(MAKE) dev-backend

dev-frontend:
	@echo "Starting frontend on http://localhost:5173..."
	@cd frontend && npm run dev

dev-backend:
	@echo "Starting backend on http://localhost:8000..."
	@cd backend && uv run uvicorn main:app --reload

run:
	@echo "Starting backend with PostgreSQL..."
	@cd backend && uv run uvicorn main:app --reload

test:
	@echo "Running all tests..."
	@$(MAKE) test-frontend
	@$(MAKE) test-backend

test-frontend:
	@echo "Running frontend tests..."
	@cd frontend && npm test

test-backend:
	@echo "Running backend tests..."
	@cd backend && uv run pytest

test-integration:
	@echo "Running backend integration tests (requires docker-compose)..."
	@cd backend && uv run pytest test_integration.py

build:
	@echo "Building frontend..."
	@cd frontend && npm run build

clean:
	@echo "Cleaning build artifacts..."
	@cd frontend && rm -rf dist node_modules/.vite
	@cd backend && rm -rf .venv __pycache__
