"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { synthesisApi, topicsApi } from "@/lib/api";
import { Synthesis, Topic } from "@/lib/types";
import { Sparkles, Plus, RefreshCw, Loader2 } from "lucide-react";
import SynthesisCard from "@/components/SynthesisCard";
import { toast } from "sonner";

export default function SynthesisPage() {
  const qc = useQueryClient();
  const [topicFilter, setTopicFilter] = useState<number | undefined>();
  const [generating, setGenerating] = useState(false);
  const [genTopicId, setGenTopicId] = useState<number | undefined>();
  const [daysBack, setDaysBack] = useState(7);

  const { data: topics } = useQuery({ queryKey: ["topics"], queryFn: topicsApi.list });
  const { data: syntheses, isLoading } = useQuery({
    queryKey: ["syntheses", topicFilter],
    queryFn: () => synthesisApi.list(topicFilter),
    refetchInterval: 30000,
  });

  const topicMap = Object.fromEntries((topics || []).map((t: Topic) => [t.id, t]));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await synthesisApi.generate(genTopicId, daysBack);
      toast.success("Synthesis generated!");
      qc.invalidateQueries({ queryKey: ["syntheses"] });
    } catch {
      toast.error("Failed to generate synthesis. Make sure your API key is configured.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Synthesis Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            AI-generated synthesis of research trends and developments, powered by Claude.
          </p>
        </div>
      </div>

      {/* Generate panel */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Generate New Synthesis
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="input w-auto text-sm"
            value={genTopicId ?? ""}
            onChange={(e) => setGenTopicId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All Topics</option>
            {topics?.map((t: Topic) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            className="input w-auto text-sm"
            value={daysBack}
            onChange={(e) => setDaysBack(Number(e.target.value))}
          >
            <option value={1}>Last 24h</option>
            <option value={3}>Last 3 days</option>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 2 weeks</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary">
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Generate Synthesis
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Claude will analyze recent articles and synthesize key trends, connections, and insights.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select
          className="input w-auto text-sm"
          value={topicFilter ?? ""}
          onChange={(e) => setTopicFilter(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All Topics</option>
          {topics?.map((t: Topic) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {syntheses?.length ?? 0} reports
        </span>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && syntheses?.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Sparkles className="w-10 h-10 mx-auto mb-4 text-primary/40" />
          <h3 className="text-base font-semibold mb-2">No syntheses yet</h3>
          <p className="text-sm text-muted-foreground">
            Run research on a topic first, then generate a synthesis to see AI-powered trend analysis.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {syntheses?.map((s: Synthesis) => (
          <SynthesisCard
            key={s.id}
            synthesis={s}
            topicName={s.topic_id ? topicMap[s.topic_id]?.name : "All Topics"}
          />
        ))}
      </div>
    </div>
  );
}
