SHELL := /bin/bash

# Development - Local
run-backend:
	cd backend && source .venv/bin/activate && uvicorn main:app --reload

run-frontend:
	cd frontend && npm run dev

setup:
	cd backend && python3 -m venv .venv
	cd backend && . .venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install

# Docker - Production
docker-build:
	docker-compose build --no-cache

docker-up:
	docker-compose up

docker-up-detached:
	docker-compose up -d

docker-down:
	docker-compose down

docker-restart:
	docker-compose restart

docker-logs:
	docker-compose logs -f

docker-clean:
	docker-compose down -v
	docker system prune -f

docker-shell:
	docker-compose exec app bash

# Quick Docker deployment
docker-deploy:
	@echo "🐳 Deploying TwelveLabs in Docker..."
	@if [ ! -f .env ]; then \
		echo "⚠️  .env file not found! Creating from env.example..."; \
		cp env.example .env; \
		echo "✏️  Please edit .env and add your API keys!"; \
		exit 1; \
	fi
	docker-compose up --build -d
	@echo "✅ Deployed! Check http://localhost"

.PHONY: run-backend run-frontend setup docker-build docker-up docker-up-detached docker-down docker-restart docker-logs docker-clean docker-shell docker-deploy
