"use client";

import { ExternalLink, Star, Check, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Article } from "@/lib/types";
import { cn, timeAgo, SOURCE_LABELS, SOURCE_COLORS, formatDate } from "@/lib/utils";
import { articlesApi } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  article: Article;
  topicColor?: string;
}

export default function ArticleCard({ article, topicColor = "#6366f1" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isRead, setIsRead] = useState(article.is_read);
  const qc = useQueryClient();

  const handleMarkRead = async () => {
    const next = !isRead;
    setIsRead(next);
    await articlesApi.markRead(article.id, next);
    qc.invalidateQueries({ queryKey: ["articles"] });
  };

  const handleDelete = async () => {
    await articlesApi.delete(article.id);
    qc.invalidateQueries({ queryKey: ["articles"] });
    toast.success("Article removed");
  };

  return (
    <div
      className={cn(
        "glass-card p-4 transition-all duration-200 hover:border-primary/20",
        isRead && "opacity-60"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={cn("badge", SOURCE_COLORS[article.source] || "bg-secondary text-muted-foreground border-border")}
            >
              {SOURCE_LABELS[article.source] || article.source}
            </span>
            {article.tags?.slice(0, 3).map((tag) => (
              <span key={tag} className="badge bg-secondary/60 text-muted-foreground border-border/40 text-xs">
                {tag}
              </span>
            ))}
            <span className="text-xs text-muted-foreground ml-auto">
              {article.published_date ? formatDate(article.published_date) : timeAgo(article.fetched_at)}
            </span>
          </div>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 flex items-start gap-1.5"
          >
            {article.title}
            <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-50" />
          </a>

          {article.authors?.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {article.authors.slice(0, 3).join(", ")}
              {article.authors.length > 3 && ` +${article.authors.length - 3} more`}
            </p>
          )}
        </div>

        {/* Relevance score */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border"
          style={{
            borderColor: topicColor + "40",
            color: topicColor,
            background: topicColor + "15",
          }}
        >
          {Math.round(article.relevance_score * 10)}
        </div>
      </div>

      {/* AI Summary */}
      {article.ai_summary && (
        <p className="text-sm text-foreground/75 mt-3 leading-relaxed line-clamp-2">
          {article.ai_summary}
        </p>
      )}

      {/* Expanded: key contributions + abstract */}
      {expanded && (
        <div className="mt-3 space-y-3 animate-fade-in">
          {article.key_contributions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Key Contributions
              </p>
              <ul className="space-y-1">
                {article.key_contributions.map((c, i) => (
                  <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {article.abstract && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Abstract
              </p>
              <p className="text-xs text-foreground/70 leading-relaxed">{article.abstract.slice(0, 600)}...</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
        <button
          onClick={() => setExpanded((p) => !p)}
          className="btn-ghost text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Less" : "More"}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={handleMarkRead}
            className={cn(
              "btn-ghost text-xs",
              isRead ? "text-primary" : "text-muted-foreground"
            )}
            title={isRead ? "Mark unread" : "Mark read"}
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="btn-ghost text-xs text-muted-foreground hover:text-red-400"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
