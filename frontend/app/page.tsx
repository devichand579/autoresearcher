"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi, articlesApi, synthesisApi } from "@/lib/api";
import { timeAgo, formatDate } from "@/lib/utils";
import {
  BookOpen, FileText, Sparkles, TrendingUp, Clock,
  CheckCircle, XCircle, Loader2, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { Article, Synthesis, ResearchRun } from "@/lib/types";
import ArticleCard from "@/components/ArticleCard";
import SynthesisCard from "@/components/SynthesisCard";

function StatCard({
  label, value, icon: Icon, color = "#6366f1",
}: {
  label: string; value: number | string; icon: React.ElementType; color?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "18", border: `1px solid ${color}30` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function RunBadge({ run }: { run: ResearchRun }) {
  const icon =
    run.status === "running" ? <Loader2 className="w-3 h-3 animate-spin text-blue-400" /> :
    run.status === "completed" ? <CheckCircle className="w-3 h-3 text-green-400" /> :
    <XCircle className="w-3 h-3 text-red-400" />;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">Topic #{run.topic_id}</p>
        <p className="text-xs text-muted-foreground">
          {run.new_articles} new · {timeAgo(run.started_at)}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.stats,
    refetchInterval: 30000,
  });

  const { data: recentArticles } = useQuery({
    queryKey: ["articles", "recent"],
    queryFn: () => articlesApi.list({ limit: 6 }),
  });

  const { data: recentSyntheses } = useQuery({
    queryKey: ["syntheses", "recent"],
    queryFn: () => synthesisApi.list(),
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Research Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your AI-powered research agent — synthesizing the latest developments across your topics.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Topics" value={stats?.total_topics ?? "—"} icon={BookOpen} color="#6366f1" />
        <StatCard label="Total Articles" value={stats?.total_articles ?? "—"} icon={FileText} color="#06b6d4" />
        <StatCard label="This Week" value={stats?.articles_this_week ?? "—"} icon={TrendingUp} color="#22c55e" />
        <StatCard label="Syntheses" value={stats?.total_syntheses ?? "—"} icon={Sparkles} color="#f97316" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent articles */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Latest Articles
            </h2>
            <Link href="/articles" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentArticles?.length === 0 && (
            <div className="glass-card p-8 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No articles yet. Create a topic and run research to get started.</p>
              <Link href="/topics" className="btn-primary mx-auto mt-4 w-fit">
                Add a Topic
              </Link>
            </div>
          )}
          <div className="space-y-3">
            {recentArticles?.slice(0, 4).map((a: Article) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </div>

        {/* Sidebar: recent runs + latest synthesis */}
        <div className="space-y-4">
          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              Recent Runs
            </h2>
            {stats?.recent_runs?.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No runs yet</p>
            ) : (
              <div>
                {stats?.recent_runs?.map((r: ResearchRun) => (
                  <RunBadge key={r.id} run={r} />
                ))}
              </div>
            )}
          </div>

          {recentSyntheses && recentSyntheses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Latest Synthesis
                </h2>
                <Link href="/synthesis" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <SynthesisCard synthesis={recentSyntheses[0]} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
