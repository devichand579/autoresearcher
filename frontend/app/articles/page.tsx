"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { articlesApi, topicsApi } from "@/lib/api";
import { Article, Topic } from "@/lib/types";
import { Search, Filter, RefreshCw, FileText } from "lucide-react";
import ArticleCard from "@/components/ArticleCard";
import { SOURCE_LABELS } from "@/lib/utils";

const SOURCES = ["arxiv", "huggingface", "semantic_scholar", "web", "news"];

export default function ArticlesPage() {
  const [search, setSearch] = useState("");
  const [topicId, setTopicId] = useState<number | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [limit, setLimit] = useState(30);

  const { data: topics } = useQuery({ queryKey: ["topics"], queryFn: topicsApi.list });

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles", search, topicId, source, unreadOnly, limit],
    queryFn: () =>
      articlesApi.list({
        search: search || undefined,
        topic_id: topicId,
        source: source || undefined,
        is_read: unreadOnly ? false : undefined,
        limit,
      }),
    refetchInterval: 15000,
  });

  const topicMap = Object.fromEntries((topics || []).map((t: Topic) => [t.id, t]));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Articles</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Browse and search all fetched papers and articles.
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="input pl-9"
              placeholder="Search titles and summaries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setUnreadOnly((p) => !p)}
            className={`btn-ghost text-xs border ${unreadOnly ? "border-primary/40 text-primary" : "border-border/60"}`}
          >
            Unread only
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <select
            className="input w-auto text-xs"
            value={topicId ?? ""}
            onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All Topics</option>
            {topics?.map((t: Topic) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            className="input w-auto text-xs"
            value={source ?? ""}
            onChange={(e) => setSource(e.target.value || undefined)}
          >
            <option value="">All Sources</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s] || s}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground ml-auto">
            {articles?.length ?? 0} results
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && articles?.length === 0 && (
        <div className="glass-card p-12 text-center">
          <FileText className="w-10 h-10 mx-auto mb-4 text-primary/40" />
          <p className="text-sm text-muted-foreground">No articles found. Adjust filters or run research on a topic.</p>
        </div>
      )}

      <div className="space-y-3">
        {articles?.map((a: Article) => (
          <ArticleCard
            key={a.id}
            article={a}
            topicColor={topicMap[a.topic_id]?.color}
          />
        ))}
      </div>

      {(articles?.length ?? 0) >= limit && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setLimit((p) => p + 30)}
            className="btn-ghost border border-border/60"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
