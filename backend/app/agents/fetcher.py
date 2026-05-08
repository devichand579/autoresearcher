"""Fetches research content from ArXiv, HuggingFace, and the web via Firecrawl."""
import asyncio
import httpx
import arxiv
from datetime import datetime, timezone, timedelta
from typing import Any
from ..config import get_settings

settings = get_settings()


class RawArticle:
    def __init__(
        self,
        title: str,
        authors: list[str],
        abstract: str,
        url: str,
        source: str,
        source_id: str | None = None,
        published_date: datetime | None = None,
    ):
        self.title = title
        self.authors = authors
        self.abstract = abstract
        self.url = url
        self.source = source
        self.source_id = source_id
        self.published_date = published_date


# ── ArXiv ──────────────────────────────────────────────────────────────────────

async def fetch_arxiv(query: str, keywords: list[str], max_results: int = 10) -> list[RawArticle]:
    full_query = query
    if keywords:
        kw_query = " OR ".join(f'"{k}"' for k in keywords[:5])
        full_query = f"({query}) AND ({kw_query})" if query else kw_query

    def _search():
        client = arxiv.Client()
        search = arxiv.Search(
            query=full_query,
            max_results=max_results,
            sort_by=arxiv.SortCriterion.SubmittedDate,
            sort_order=arxiv.SortOrder.Descending,
        )
        results = []
        for paper in client.results(search):
            results.append(RawArticle(
                title=paper.title,
                authors=[a.name for a in paper.authors],
                abstract=paper.summary,
                url=paper.entry_id,
                source="arxiv",
                source_id=paper.entry_id.split("/")[-1],
                published_date=paper.published.replace(tzinfo=timezone.utc) if paper.published else None,
            ))
        return results

    return await asyncio.to_thread(_search)


# ── HuggingFace Papers ─────────────────────────────────────────────────────────

async def fetch_huggingface(query: str, max_results: int = 10) -> list[RawArticle]:
    url = "https://huggingface.co/api/papers"
    params = {"search": query, "limit": max_results}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    articles = []
    for paper in data[:max_results]:
        pub_date = None
        if paper.get("publishedAt"):
            try:
                pub_date = datetime.fromisoformat(paper["publishedAt"].replace("Z", "+00:00"))
            except Exception:
                pass
        articles.append(RawArticle(
            title=paper.get("title", ""),
            authors=[a.get("name", "") for a in paper.get("authors", [])],
            abstract=paper.get("summary", paper.get("abstract", "")),
            url=f"https://huggingface.co/papers/{paper.get('id', '')}",
            source="huggingface",
            source_id=paper.get("id"),
            published_date=pub_date,
        ))
    return articles


# ── Semantic Scholar ───────────────────────────────────────────────────────────

async def fetch_semantic_scholar(query: str, max_results: int = 10) -> list[RawArticle]:
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {
        "query": query,
        "limit": max_results,
        "fields": "title,authors,abstract,externalIds,publicationDate,openAccessPdf,url",
        "sort": "publicationDate:desc",
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    articles = []
    for paper in data.get("data", [])[:max_results]:
        if not paper.get("title"):
            continue
        pub_date = None
        if paper.get("publicationDate"):
            try:
                pub_date = datetime.fromisoformat(paper["publicationDate"]).replace(tzinfo=timezone.utc)
            except Exception:
                pass
        paper_url = paper.get("url", "")
        if paper.get("openAccessPdf", {}).get("url"):
            paper_url = paper["openAccessPdf"]["url"]
        elif paper.get("externalIds", {}).get("ArXiv"):
            paper_url = f"https://arxiv.org/abs/{paper['externalIds']['ArXiv']}"
        articles.append(RawArticle(
            title=paper["title"],
            authors=[a.get("name", "") for a in paper.get("authors", [])],
            abstract=paper.get("abstract", ""),
            url=paper_url or f"https://www.semanticscholar.org/paper/{paper.get('paperId', '')}",
            source="semantic_scholar",
            source_id=paper.get("paperId"),
            published_date=pub_date,
        ))
    return articles


# ── Firecrawl Web Search ───────────────────────────────────────────────────────

async def fetch_web_firecrawl(query: str, max_results: int = 8) -> list[RawArticle]:
    if not settings.firecrawl_api_key:
        return []
    try:
        from firecrawl import FirecrawlApp
    except ImportError:
        return []

    def _search():
        app = FirecrawlApp(api_key=settings.firecrawl_api_key)
        results = app.search(query, limit=max_results)
        articles = []
        for item in (results.get("data") or results if isinstance(results, list) else []):
            if isinstance(item, dict):
                articles.append(RawArticle(
                    title=item.get("title", item.get("url", "Untitled")),
                    authors=[],
                    abstract=item.get("description", item.get("snippet", "")),
                    url=item.get("url", ""),
                    source="web",
                    published_date=None,
                ))
        return articles

    try:
        return await asyncio.to_thread(_search)
    except Exception:
        return []


# ── News via Firecrawl ─────────────────────────────────────────────────────────

async def fetch_news_firecrawl(query: str, max_results: int = 6) -> list[RawArticle]:
    news_query = f"{query} research news 2024 2025"
    return await fetch_web_firecrawl(news_query, max_results)


# ── Orchestrated Fetch ─────────────────────────────────────────────────────────

async def fetch_all_sources(
    topic_name: str,
    keywords: list[str],
    sources: list[str],
    max_per_source: int = 10,
) -> dict[str, list[RawArticle]]:
    query = topic_name
    if keywords:
        query = f"{topic_name} {' '.join(keywords[:3])}"

    tasks: dict[str, Any] = {}
    if "arxiv" in sources:
        tasks["arxiv"] = fetch_arxiv(query, keywords, max_per_source)
    if "huggingface" in sources:
        tasks["huggingface"] = fetch_huggingface(query, max_per_source)
    if "semantic_scholar" in sources:
        tasks["semantic_scholar"] = fetch_semantic_scholar(query, max_per_source)
    if "web" in sources and settings.firecrawl_api_key:
        tasks["web"] = fetch_web_firecrawl(query, max_per_source)
        tasks["news"] = fetch_news_firecrawl(query, 6)

    results = await asyncio.gather(*tasks.values(), return_exceptions=True)
    output: dict[str, list[RawArticle]] = {}
    for key, result in zip(tasks.keys(), results):
        output[key] = result if isinstance(result, list) else []
    return output
