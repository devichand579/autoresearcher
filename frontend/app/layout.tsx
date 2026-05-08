"use client";

import "./globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <html lang="en" className="dark h-full">
      <head>
        <title>AutoResearcher</title>
        <meta name="description" content="AI-powered research agent that synthesizes the latest developments" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="h-full min-h-0 bg-background flex overflow-hidden">
        <QueryClientProvider client={queryClient}>
          <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((p) => !p)} />
          <main
            className="flex-1 min-h-0 overflow-y-auto transition-all duration-300"
            style={{ marginLeft: sidebarOpen ? "240px" : "64px" }}
          >
            <div className="min-h-full p-6 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "hsl(224 71% 6%)",
                border: "1px solid hsl(215 28% 17%)",
                color: "hsl(213 31% 91%)",
              },
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  );
}
