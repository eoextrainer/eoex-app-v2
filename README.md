# EOEX Application Suite

Full-scale multi-tenant SPA with FastAPI backend and a vanilla HTML/CSS/JS frontend.

## Quick Start (Docker)

1. Copy env:
   - `.env.example` → `.env`
2. Start stack:
   - `docker-compose up --build`
3. Open:
   - App: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Local Dev (Non-Docker)

Backend (serves the SPA):
- `cp .env.example .env` (update `DATABASE_URL` if needed)
- `cd src`
- `python -m venv .venv && source .venv/bin/activate`
- `pip install -r ../requirements.txt`
- `uvicorn main:app --reload --port 8000`

Default login:
- `admin@eoex.com` / `admin123`

## Release & rollback

Savepoint tagging (stable releases):

- `git tag -a v1.0.0 -m "EOEX stable"`
- `git push origin v1.0.0`

Makefile shortcut:

- `make savepoint VERSION=v1.0.0`

Rollback to a stable savepoint:

- `git checkout v1.0.0`
- `git checkout -b hotfix/rollback-v1.0.0`

Makefile shortcut:

- `make rollback VERSION=v1.0.0`
