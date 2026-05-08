"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { topicsApi } from "@/lib/api";
import { Topic } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

const ALL_SOURCES = [
  { id: "arxiv", label: "ArXiv" },
  { id: "huggingface", label: "HuggingFace" },
  { id: "semantic_scholar", label: "Semantic Scholar" },
  { id: "web", label: "Web (Firecrawl)" },
];

interface Props {
  topic?: Topic;
  onClose: () => void;
}

export default function TopicForm({ topic, onClose }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState(topic?.name || "");
  const [description, setDescription] = useState(topic?.description || "");
  const [keywords, setKeywords] = useState<string[]>(topic?.keywords || []);
  const [kw, setKw] = useState("");
  const [sources, setSources] = useState<string[]>(topic?.sources || ["arxiv", "huggingface"]);
  const [schedule, setSchedule] = useState(topic?.fetch_schedule || "daily");
  const [color, setColor] = useState(topic?.color || COLORS[0]);
  const [saving, setSaving] = useState(false);

  const addKeyword = () => {
    const trimmed = kw.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((p) => [...p, trimmed]);
      setKw("");
    }
  };

  const toggleSource = (id: string) => {
    setSources((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Topic name is required");
    setSaving(true);
    try {
      const payload = { name: name.trim(), description, keywords, sources, fetch_schedule: schedule, color };
      if (topic) {
        await topicsApi.update(topic.id, payload);
        toast.success("Topic updated");
      } else {
        await topicsApi.create(payload);
        toast.success("Topic created");
      }
      qc.invalidateQueries({ queryKey: ["topics"] });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Failed to save topic");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{topic ? "Edit Topic" : "New Research Topic"}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
              Topic Name *
            </label>
            <input
              className="input"
              placeholder="e.g. Large Language Models"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
              Description
            </label>
            <textarea
              className="input resize-none h-20"
              placeholder="What aspects are you most interested in?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
              Keywords
            </label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Add keyword..."
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
              />
              <button type="button" onClick={addKeyword} className="btn-primary px-3 py-2">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywords.map((k) => (
                  <span key={k} className="badge bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                    {k}
                    <button
                      type="button"
                      onClick={() => setKeywords((p) => p.filter((x) => x !== k))}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
              Sources
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSource(s.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-150 text-left ${
                    sources.includes(s.id)
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-secondary/30 text-muted-foreground border-border/40 hover:border-border"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                Schedule
              </label>
              <select
                className="input"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="manual">Manual only</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                Color
              </label>
              <div className="flex gap-2 mt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-full border-2 transition-all duration-150"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "white" : "transparent",
                      transform: color === c ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center border border-border/60">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? "Saving…" : topic ? "Save Changes" : "Create Topic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
