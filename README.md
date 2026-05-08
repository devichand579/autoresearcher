# AutoResearcher

An AI-powered research agent that continuously fetches and synthesizes the latest papers, news, and developments across your research areas of interest.

## Features

- **Multi-source fetching** — ArXiv, HuggingFace Papers, Semantic Scholar, and the web (via Firecrawl)
- **AI summarization** — Each article is summarized by Claude (or GPT-4) with key contributions and relevance scoring
- **Synthesis reports** — Claude synthesizes trends, connections, and insights across all recent articles
- **Long-horizon memory** — ChromaDB stores embeddings to provide historical context when generating new syntheses
- **Scheduled research** — Daily/weekly automatic fetching per topic
- **Clean UI** — Dark-mode dashboard with filtering, search, and synthesis views

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/devichand579/autoresearcher
cd autoresearcher
cp .env.example .env
# Edit .env and add your API keys
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

### 3. Without Docker (local dev)

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add your keys
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

## Configuration

| Variable | Description | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API key for summarization & synthesis | Yes (or OpenAI) |
| `OPENAI_API_KEY` | OpenAI API key (alternative to Anthropic) | No |
| `FIRECRAWL_API_KEY` | Firecrawl key for web search | No (free sources work without it) |
| `ENABLE_SCHEDULER` | Enable auto-fetching scheduler | No (default: true) |
| `DAILY_FETCH_HOUR` | UTC hour for daily auto-fetch | No (default: 8) |

## Architecture

```
autoresearcher/
├── backend/
│   └── app/
│       ├── agents/
│       │   ├── fetcher.py      # ArXiv + HF + Semantic Scholar + Firecrawl
│       │   ├── synthesizer.py  # Claude-powered synthesis
│       │   ├── memory.py       # ChromaDB vector memory
│       │   └── researcher.py   # Orchestrator
│       └── routers/            # FastAPI REST API
└── frontend/                   # Next.js 14 + Tailwind UI
```

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, SQLite, ChromaDB, APScheduler
- **AI:** Anthropic Claude (claude-sonnet-4-6) or OpenAI GPT-4
- **Data Sources:** ArXiv, HuggingFace Papers, Semantic Scholar, Firecrawl
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, TanStack Query
