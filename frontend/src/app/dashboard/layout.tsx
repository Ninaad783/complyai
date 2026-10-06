"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import { getApiUrl } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const url = getApiUrl();
    // Check health against configured production/local API URL with 8s timeout
    fetch(`${url}/api/health`, { signal: AbortSignal.timeout(8000) })
      .then((r) => setIsOffline(!r.ok))
      .catch(() => setIsOffline(true));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 animate-pulse" />
          <p className="text-gray-500 text-sm">Loading ComplyAI...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white">
      {/* Offline Warning Banner (if backend unreachable) */}
      {isOffline && (
        <div className="flex items-center justify-center gap-2 bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-xs text-rose-400 shrink-0">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="truncate">
            <strong>Connection Warning:</strong> Backend at {getApiUrl()} is unreachable.
          </span>
        </div>
      )}

      {/* Mobile Top Navbar (Visible only on < md screens) */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0d0d15] border-b border-[#1e1e2e] shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-1.5 -ml-1 text-gray-300 hover:text-white rounded-lg hover:bg-white/5 active:bg-white/10"
            aria-label="Open navigation menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm tracking-wide">ComplyAI</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
            {user?.full_name?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout (Sidebar + Content) */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        <main className="flex-1 overflow-y-auto w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
