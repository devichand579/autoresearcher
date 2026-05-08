"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Synthesis } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Sparkles, ChevronDown, ChevronUp, Trash2, FileText } from "lucide-react";
import { synthesisApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  synthesis: Synthesis;
  topicName?: string;
}

export default function SynthesisCard({ synthesis, topicName }: Props) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const handleDelete = async () => {
    await synthesisApi.delete(synthesis.id);
    qc.invalidateQueries({ queryKey: ["syntheses"] });
    toast.success("Synthesis deleted");
  };

  return (
    <div className="glass-card p-5 transition-all duration-200 hover:border-primary/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <div className="w-6 h-6 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            {topicName && (
              <span className="badge bg-primary/10 text-primary border-primary/20">{topicName}</span>
            )}
            <span className="badge bg-secondary/60 text-muted-foreground border-border/40 capitalize">
              {synthesis.synthesis_type.replace("_", " ")}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">{timeAgo(synthesis.created_at)}</span>
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-snug">{synthesis.title}</h3>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {synthesis.articles_count} articles
        </span>
        {synthesis.model_used && (
          <span className="font-mono text-muted-foreground/60">{synthesis.model_used}</span>
        )}
      </div>

      {/* Content preview / full */}
      <div className={`markdown-content text-sm overflow-hidden transition-all duration-300 ${expanded ? "" : "max-h-32"}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{synthesis.content}</ReactMarkdown>
      </div>

      {/* Gradient overlay when collapsed */}
      {!expanded && (
        <div className="h-8 -mt-8 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
        <button
          onClick={() => setExpanded((p) => !p)}
          className="btn-ghost text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Collapse" : "Read full synthesis"}
        </button>
        <button
          onClick={handleDelete}
          className="btn-ghost text-xs text-muted-foreground hover:text-red-400"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
