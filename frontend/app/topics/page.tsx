"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { topicsApi } from "@/lib/api";
import { Topic } from "@/lib/types";
import { Plus, Edit2, Trash2, Play, BookOpen, Clock, RefreshCw } from "lucide-react";
import { timeAgo, SOURCE_LABELS } from "@/lib/utils";
import TopicForm from "@/components/TopicForm";
import RunResearchButton from "@/components/RunResearchButton";
import { toast } from "sonner";

export default function TopicsPage() {
  const qc = useQueryClient();
  const { data: topics, isLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: topicsApi.list,
  });
  const [showForm, setShowForm] = useState(false);
  const [editTopic, setEditTopic] = useState<Topic | null>(null);

  const handleDelete = async (topic: Topic) => {
    if (!confirm(`Delete "${topic.name}" and all its articles?`)) return;
    await topicsApi.delete(topic.id);
    qc.invalidateQueries({ queryKey: ["topics"] });
    toast.success("Topic deleted");
  };

  const handleToggleActive = async (topic: Topic) => {
    await topicsApi.update(topic.id, { is_active: !topic.is_active });
    qc.invalidateQueries({ queryKey: ["topics"] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Research Topics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage the topics your agent researches and synthesizes.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Topic
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && topics?.length === 0 && (
        <div className="glass-card p-12 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-4 text-primary/40" />
          <h3 className="text-base font-semibold mb-2">No topics yet</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Add research areas you want to track. The agent will automatically find the latest papers and news.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" />
            Create your first topic
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {topics?.map((topic: Topic) => (
          <div
            key={topic.id}
            className="glass-card p-5 flex flex-col gap-3 hover:border-primary/20 transition-all duration-200"
            style={{ borderLeft: `3px solid ${topic.color}` }}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">{topic.name}</h3>
                  <span
                    className={`badge text-xs ${topic.is_active ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-muted text-muted-foreground border-border"}`}
                    onClick={() => handleToggleActive(topic)}
                    style={{ cursor: "pointer" }}
                    title="Click to toggle active"
                  >
                    {topic.is_active ? "Active" : "Paused"}
                  </span>
                </div>
                {topic.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{topic.description}</p>
                )}
              </div>
            </div>

            {/* Keywords */}
            {topic.keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {topic.keywords.slice(0, 4).map((kw) => (
                  <span key={kw} className="badge bg-secondary/60 text-muted-foreground border-border/40 text-xs">
                    {kw}
                  </span>
                ))}
                {topic.keywords.length > 4 && (
                  <span className="badge bg-secondary/60 text-muted-foreground border-border/40 text-xs">
                    +{topic.keywords.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* Sources + schedule */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{topic.sources?.map((s) => SOURCE_LABELS[s] || s).join(", ")}</span>
              <span className="ml-auto">
                <Clock className="w-3 h-3 inline mr-1" />
                {topic.fetch_schedule}
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2">
              <span>{topic.article_count} articles</span>
              <span>{topic.last_fetched_at ? `Last: ${timeAgo(topic.last_fetched_at)}` : "Never fetched"}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <RunResearchButton topicId={topic.id} topicName={topic.name} />
              <button
                onClick={() => { setEditTopic(topic); setShowForm(true); }}
                className="btn-ghost px-2"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(topic)}
                className="btn-ghost px-2 hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(showForm || editTopic) && (
        <TopicForm
          topic={editTopic || undefined}
          onClose={() => { setShowForm(false); setEditTopic(null); }}
        />
      )}
    </div>
  );
}
