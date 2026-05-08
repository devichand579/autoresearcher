# AutoResearcher

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**AutoResearcher** is a full-stack assistant for staying on top of a research area. You define topics; it pulls papers and web results from several sources, stores them with embeddings for context, summarizes each item with an LLM, and generates higher-level syntheses across what you have collected. A dark-mode dashboard lets you browse, search, and trigger runs on demand.

---

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Quick start (Docker)](#quick-start-docker)
- [Local development](#local-development)
- [Configuration](#configuration)
- [API](#api)
- [Project layout](#project-layout)
- [Tech stack](#tech-stack)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Multi-source ingestion** — ArXiv, Hugging Face Papers, Semantic Scholar, and optional web search via [Firecrawl](https://firecrawl.dev).
- **LLM summaries** — Each article gets a structured summary (default: **Anthropic Claude**; **OpenAI** supported as an alternative).
- **Synthesis reports** — Cross-article trends and connections from your corpus.
- **Semantic memory** — [ChromaDB](https://www.trychroma.com/) embeddings for historical context when generating syntheses and semantic search.
- **Scheduling** — Per-topic daily or weekly automated fetches (APScheduler), configurable UTC hour.
- **Web UI** — Next.js app with filtering, search, Markdown rendering, and run/synthesis workflows.

*(Optional: add a few screenshots here — dashboard, topic view, synthesis — so newcomers see the product at a glance.)*

---

## Requirements

- **Docker** and **Docker Compose** (recommended), *or*
- **Python 3.11+**, **Node.js 20+**, and **npm**.
- At least one LLM provider key: **Anthropic** or **OpenAI**.
- **Firecrawl** is optional but unlocks richer web/news coverage.

---

## Quick start (Docker)

1. **Clone and environment**

   ```bash
   git clone https://github.com/devichand579/autoresearcher.git
   cd autoresearcher
   cp .env.example .env
   ```

   Edit `.env` and set `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY`, and optionally `FIRECRAWL_API_KEY`.

2. **Run**

   ```bash
   docker compose up --build
   ```

3. **Open**

   | Service | URL |
   |--------|-----|
   | Frontend | [http://localhost:3000](http://localhost:3000) |
   | Backend | [http://localhost:8000](http://localhost:8000) |
   | OpenAPI docs | [http://localhost:8000/docs](http://localhost:8000/docs) |

Compose mounts named volumes for SQLite data and Chroma persistence so they survive container restarts. The backend watches `DATABASE_URL` and `CHROMA_PERSIST_DIRECTORY` from your `.env`; defaults are overridden in `docker-compose.yml` for paths inside the container.

---

## Local development

Useful when iterating on backend or frontend without rebuilding images.

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Run from **`backend`** with `.env` in that directory *or* set variables to match `.env.example` at the repo root (the Compose setup uses the root `.env`).

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

SQLite tables are created automatically on startup (`init_db`). Chroma persists under `CHROMA_PERSIST_DIRECTORY` (defaults to `./chroma_db`).

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
```

Point the Next.js dev server at your local API (default rewrite target is `http://localhost:8000`):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). API calls under `/api/*` are rewritten to the FastAPI backend per `frontend/next.config.ts`.

---

## Configuration

All variables below can be placed in `.env` at the **repository root** (used by Compose) or in `backend/.env` for bare `uvicorn`. See [.env.example](.env.example) for a commented template.

| Variable | Purpose | Required |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | Claude API access | Yes*, unless using OpenAI |
| `OPENAI_API_KEY` | OpenAI API access | Yes*, unless using Anthropic |
| `AI_PROVIDER` | `anthropic` or `openai` | No (default: `anthropic`) |
| `AI_MODEL` | Model id sent to the provider | No (default: `claude-sonnet-4-6`) |
| `FIRECRAWL_API_KEY` | Firecrawl for web fetch | No |
| `DATABASE_URL` | SQLAlchemy URL (SQLite default) | No |
| `CHROMA_PERSIST_DIRECTORY` | Chroma persistence path | No |
| `ENABLE_SCHEDULER` | Enable background cron jobs | No (default: `true`) |
| `DAILY_FETCH_HOUR` | UTC hour for daily runs | No (default: `8`) |
| `CORS_ORIGINS` | Allowed browser origins (JSON list) | No (defaults include localhost dev ports) |

\*You need credentials for whichever provider matches `AI_PROVIDER`.

**Production tip:** Restrict `CORS_ORIGINS` to your real frontend origin(s); never commit `.env` or real keys.

---

## API

REST API under `/api`, documented interactively at **`/docs`** (Swagger UI). Routers:

| Prefix | Responsibility |
|--------|----------------|
| `/api/topics` | CRUD research topics |
| `/api/articles` | List/filter articles, read state, semantic search |
| `/api/research` | Trigger runs and inspect run history |
| `/api/synthesis` | List, generate, and fetch syntheses |

Health check: **`GET /api/health`**.

---

## Project layout

```text
autoresearcher/
├── backend/
│   ├── app/
│   │   ├── agents/          # fetcher, synthesizer, memory (Chroma), researcher orchestration
│   │   ├── routers/         # FastAPI route modules
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── main.py          # App entry, CORS, scheduler wiring
│   │   └── config.py        # Settings from environment
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # Next.js (App Router), Tailwind, TanStack Query
├── docker-compose.yml
├── .env.example
├── LICENSE
└── README.md
```

---

## Tech stack

- **Backend:** Python 3.11, FastAPI, SQLAlchemy, SQLite, Alembic (dependency; schema via `create_all`), ChromaDB, APScheduler, httpx, provider SDKs (Anthropic / OpenAI).
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, TanStack Query.
- **AI:** Claude (default) or OpenAI-compatible path via configuration.
- **Sources:** ArXiv, Hugging Face Papers, Semantic Scholar, optional Firecrawl.

---

## Troubleshooting

| Issue | Ideas |
|-------|--------|
| **Chroma telemetry / PostHog errors in logs** | The backend pins compatible `posthog` and disables anonymized Chroma telemetry in code; rebuild the backend image after `git pull`. |
| **CORS errors in the browser** | Add your frontend URL to `CORS_ORIGINS` (JSON array string). Dev defaults include `localhost:3000` and `localhost:3001`. |
| **Scheduler not firing** | Set `ENABLE_SCHEDULER=true`; note times are **UTC**. Weekly jobs are scheduled Mondays at `DAILY_FETCH_HOUR` with a `:30` offset (see `backend/app/main.py`). |
| **Frontend can’t reach API in Docker** | Compose builds the frontend with `NEXT_PUBLIC_API_URL` targeting the backend service; Next rewrites `/api/*` server-side — use the Compose network as defined in `docker-compose.yml`. |

---

## Contributing

Issues and pull requests are welcome. Small, focused PRs are easier to review:

1. Fork the repo and create a branch for your change.
2. Follow existing code style (match surrounding patterns; avoid unrelated refactors).
3. Describe behavior changes in the PR text; note any new env vars or migration steps.

---

## License

This project is released under the [MIT License](LICENSE).
