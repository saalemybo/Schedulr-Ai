# Schedulr-Ai
Scheduling + booking links + Google Calendar sync, with AI insights.

Web
Next.js + TypeScript (public booking page + admin)
Tailwind + a calendar component (FullCalendar or React Big Calendar)

API
FastAPI (Python) (pairs well with later ML)
Postgres + SQLAlchemy + Alembic

Jobs + email
Redis + Celery (reminders, calendar sync retries)
Email provider: SendGrid (later) / Resend (simple)

Auth + OAuth
Auth: NextAuth (works well with Google)
Google OAuth scopes for Calendar

Infra
Docker + Docker Compose (local)

GitHub Actions (CI)
Deploy later: Vercel (web) + Render/Fly/AWS (api)
