"use client";

import { useState } from "react";
import { Settings, Key, Server, Info } from "lucide-react";

export default function SettingsPage() {
  const [copied, setCopied] = useState(false);

  const envExample = `# AI Provider (choose one)
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# AI_MODEL=claude-sonnet-4-6  # default

# Firecrawl (for web search)
FIRECRAWL_API_KEY=fc-...

# Optional
ENABLE_SCHEDULER=true
DAILY_FETCH_HOUR=8`;

  const handleCopy = () => {
    navigator.clipboard.writeText(envExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure your AutoResearcher agent.
        </p>
      </div>

      {/* API Keys */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          API Keys
        </h2>
        <div className="space-y-3 text-sm text-foreground/80">
          <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              API keys are configured via environment variables in the backend <code className="font-mono text-xs bg-secondary/80 px-1 py-0.5 rounded">.env</code> file for security.
              They are never stored in the database or exposed to the browser.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Backend .env Configuration
          </p>
          <div className="relative">
            <pre className="bg-secondary/40 rounded-lg p-4 text-xs font-mono text-foreground/80 overflow-auto">
              {envExample}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 btn-ghost text-xs border border-border/60"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Sources */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Server className="w-4 h-4 text-primary" />
          Data Sources
        </h2>
        <div className="space-y-3">
          {[
            { name: "ArXiv", desc: "Preprint papers in CS, Math, Physics, etc.", free: true },
            { name: "HuggingFace Papers", desc: "Latest ML/AI papers from the HF community", free: true },
            { name: "Semantic Scholar", desc: "Academic papers with citation data", free: true },
            { name: "Web (Firecrawl)", desc: "News, blogs, and web content (requires FIRECRAWL_API_KEY)", free: false },
          ].map((s) => (
            <div key={s.name} className="flex items-start justify-between gap-3 py-2 border-b border-border/30 last:border-0">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <span className={`badge text-xs ${s.free ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
                {s.free ? "Free" : "API Key"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduler */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-3">Scheduler</h2>
        <p className="text-sm text-muted-foreground">
          The background scheduler automatically fetches new research based on each topic's schedule (daily/weekly).
          Set <code className="font-mono text-xs bg-secondary/80 px-1 py-0.5 rounded">ENABLE_SCHEDULER=true</code> and
          <code className="font-mono text-xs bg-secondary/80 px-1 py-0.5 rounded ml-1">DAILY_FETCH_HOUR=8</code> (UTC hour) in your .env.
        </p>
      </div>
    </div>
  );
}
