# Schedulr AI

Scheduling + booking links for small businesses, with Google Calendar synchronization and future AI-powered insights.

## What it does (v0)
- Public booking link per business: `/b/{slug}`
- Conflict-safe booking API
- Google Calendar sync (phase 1: push events on booking)
- Email confirmation / reminders (phase 1: email only)

## Stack
- Web: Next.js + TypeScript
- API: FastAPI + SQLAlchemy + Alembic
- DB: Postgres
- Queue (later): Redis + Celery
- Dev: Docker Compose, GitHub Actions CI

## Local dev
```bash
cp apps/api/.env.example apps/api/.env
make dev
