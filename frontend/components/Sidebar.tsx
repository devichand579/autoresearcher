"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Telescope,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/topics", label: "Topics", icon: BookOpen },
  { href: "/articles", label: "Articles", icon: FileText },
  { href: "/synthesis", label: "Synthesis", icon: Sparkles },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300",
        "bg-card/80 backdrop-blur-md border-r border-border/60",
        open ? "w-60" : "w-16"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-border/40", !open && "justify-center px-0")}>
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
          <Telescope className="w-4 h-4 text-primary" />
        </div>
        {open && (
          <div>
            <span className="font-semibold text-sm text-foreground">AutoResearcher</span>
            <p className="text-xs text-muted-foreground">AI Research Agent</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group",
                active
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                !open && "justify-center px-0"
              )}
              title={!open ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {open && <span className="font-medium">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150",
            !open && "justify-center px-0"
          )}
          title={!open ? "Settings" : undefined}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {open && <span>Settings</span>}
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150",
            !open && "justify-center px-0"
          )}
        >
          {open ? (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
