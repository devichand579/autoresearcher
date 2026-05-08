"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { researchApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  topicId: number;
  topicName: string;
}

export default function RunResearchButton({ topicId, topicName }: Props) {
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const handleRun = async () => {
    setLoading(true);
    try {
      await researchApi.startRun(topicId);
      toast.success(`Research started for "${topicName}"`, {
        description: "Results will appear once fetching completes.",
      });
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const runs = await researchApi.listRuns(topicId);
          const latest = runs[0];
          if (latest && latest.status !== "running") {
            clearInterval(poll);
            setLoading(false);
            qc.invalidateQueries({ queryKey: ["articles"] });
            qc.invalidateQueries({ queryKey: ["runs"] });
            qc.invalidateQueries({ queryKey: ["topics"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["syntheses"] });
            if (latest.status === "completed") {
              toast.success(`Research complete! Found ${latest.new_articles} new articles`);
            } else {
              toast.error("Research run failed", { description: latest.error_message || "Unknown error" });
            }
          }
        } catch {
          // ignore poll errors
        }
      }, 3000);
      // Safety timeout
      setTimeout(() => { clearInterval(poll); setLoading(false); }, 120000);
    } catch (err: unknown) {
      setLoading(false);
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (msg?.includes("already in progress")) {
        toast.info("Research is already running for this topic");
      } else {
        toast.error("Failed to start research");
      }
    }
  };

  return (
    <button onClick={handleRun} disabled={loading} className="btn-primary">
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Researching…
        </>
      ) : (
        <>
          <Play className="w-4 h-4" />
          Run Research
        </>
      )}
    </button>
  );
}
