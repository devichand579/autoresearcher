"""Claude-powered synthesis and summarization agent."""
import json
from datetime import datetime
from ..config import get_settings

settings = get_settings()


def _get_ai_client():
    if settings.ai_provider == "openai" and settings.openai_api_key:
        import openai
        return "openai", openai.OpenAI(api_key=settings.openai_api_key)
    elif settings.anthropic_api_key:
        import anthropic
        return "anthropic", anthropic.Anthropic(api_key=settings.anthropic_api_key)
    raise ValueError("No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env")


def _call_ai(messages: list[dict], system: str, max_tokens: int = 2048) -> str:
    provider, client = _get_ai_client()
    if provider == "anthropic":
        response = client.messages.create(
            model=settings.ai_model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        return response.content[0].text
    else:
        from openai import OpenAI
        all_messages = [{"role": "system", "content": system}] + messages
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=max_tokens,
            messages=all_messages,
        )
        return response.choices[0].message.content


def summarize_article(title: str, abstract: str, source: str) -> dict:
    """Generate a structured AI summary of a single article."""
    system = (
        "You are an expert research assistant. Summarize research papers and articles "
        "clearly and concisely for researchers who want to stay up to date. "
        "Return JSON only, no markdown."
    )
    prompt = f"""Summarize this research article:

Title: {title}
Source: {source}
Abstract/Content:
{abstract[:3000]}

Return a JSON object with exactly these fields:
{{
  "summary": "2-3 sentence plain-language summary of what this paper does and why it matters",
  "key_contributions": ["contribution 1", "contribution 2", "contribution 3"],
  "tags": ["tag1", "tag2", "tag3"],
  "relevance_score": 0.85
}}
relevance_score should be 0.0-1.0 based on how significant/impactful this work seems."""

    try:
        raw = _call_ai([{"role": "user", "content": prompt}], system, max_tokens=600)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        return {
            "summary": str(data.get("summary", "")),
            "key_contributions": [str(x) for x in data.get("key_contributions", [])],
            "tags": [str(x) for x in data.get("tags", [])],
            "relevance_score": float(data.get("relevance_score", 0.5)),
        }
    except Exception:
        return {
            "summary": abstract[:300] + "..." if len(abstract) > 300 else abstract,
            "key_contributions": [],
            "tags": [],
            "relevance_score": 0.5,
        }


def synthesize_topic(
    topic_name: str,
    articles: list[dict],
    historical_context: list[dict] | None = None,
    synthesis_type: str = "on_demand",
) -> dict:
    """Generate a comprehensive synthesis report for a topic."""
    system = """You are an expert research analyst specializing in synthesizing the latest
developments across research papers and news. Your job is to identify trends, connections,
and key developments, while maintaining awareness of the broader research trajectory over time.
Write for a technical researcher audience."""

    period = {"daily": "today", "weekly": "this week", "on_demand": "recently"}.get(synthesis_type, "recently")

    articles_text = ""
    for i, a in enumerate(articles[:20], 1):
        date_str = ""
        if a.get("published_date"):
            try:
                date_str = f" ({a['published_date'][:10]})"
            except Exception:
                pass
        articles_text += f"""
[{i}] **{a['title']}**{date_str}
Source: {a.get('source', 'unknown')}
Authors: {', '.join(a.get('authors', [])[:3]) or 'N/A'}
Summary: {a.get('ai_summary') or a.get('abstract', '')[:300]}
Key contributions: {'; '.join(a.get('key_contributions', []))}
"""

    historical_text = ""
    if historical_context:
        historical_text = "\n\n## Historical Context (relevant past work):\n"
        for h in historical_context[:5]:
            historical_text += f"- {h.get('document', '')[:200]}\n"

    prompt = f"""Generate a comprehensive research synthesis report for the topic: **{topic_name}**

## New Articles Found {period.title()} ({len(articles)} papers/articles):
{articles_text}
{historical_text}

Write a detailed synthesis report with the following sections:
1. **Executive Summary** (2-3 sentences: what's the most important thing happening in this area?)
2. **Key Developments** (3-5 bullet points of the most significant findings)
3. **Emerging Trends** (patterns you're seeing across multiple papers)
4. **Connections & Insights** (how do these papers relate to each other? any convergence of ideas?)
5. **What to Watch** (1-3 things to pay attention to in the coming weeks)

Be specific, cite paper titles when relevant, and focus on what matters most for researchers in this area."""

    try:
        content = _call_ai([{"role": "user", "content": prompt}], system, max_tokens=2500)
        title = f"{topic_name}: Research Synthesis — {datetime.now().strftime('%B %d, %Y')}"
        return {"title": title, "content": content}
    except Exception as e:
        return {
            "title": f"{topic_name}: Research Update",
            "content": f"Synthesis generation failed: {e}",
        }


def synthesize_cross_topic(topics_data: list[dict]) -> dict:
    """Generate a cross-topic synthesis to identify connections across research areas."""
    system = """You are a broad research analyst who identifies connections and convergences
across different research areas. Help researchers understand how different fields are influencing each other."""

    topics_text = ""
    for td in topics_data:
        topics_text += f"\n### {td['topic_name']} ({td['article_count']} articles)\n"
        for a in td.get("top_articles", [])[:3]:
            topics_text += f"- {a.get('title', '')}: {a.get('ai_summary', '')[:150]}\n"

    prompt = f"""Analyze these research areas and identify cross-domain connections:

{topics_text}

Write a cross-topic synthesis with:
1. **Cross-Domain Connections** (where are different fields converging or influencing each other?)
2. **Shared Themes** (common themes appearing across multiple research areas)
3. **Collaborative Opportunities** (potential for cross-disciplinary work)
4. **Big Picture Trends** (what does this tell us about the direction of research broadly?)"""

    try:
        content = _call_ai([{"role": "user", "content": prompt}], system, max_tokens=2000)
        return {
            "title": f"Cross-Domain Research Synthesis — {datetime.now().strftime('%B %d, %Y')}",
            "content": content,
        }
    except Exception as e:
        return {
            "title": "Cross-Domain Synthesis",
            "content": f"Synthesis failed: {e}",
        }
