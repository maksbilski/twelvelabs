SHELL := /bin/bash

run-backend:
	cd backend && source .venv/bin/activate && uvicorn main:app --reload

run-frontend:
	cd frontend && npm run dev

setup:
	cd backend && python3 -m venv .venv
	cd backend && . .venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install
