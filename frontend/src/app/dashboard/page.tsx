"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Link from "next/link";

interface Stats {
  documents: { total: number; ready: number; processing: number };
  chat_sessions: number;
  messages: number;
  reports: number;
  risk_score: number;
  compliance_rate: number;
  violations: number;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  timestamp: string;
  icon: string;
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

function RiskMeter({ score }: { score: number }) {
  const color = score >= 75 ? "#ef4444" : score >= 50 ? "#f59e0b" : "#22c55e";
  const label = score >= 75 ? "High Risk" : score >= 50 ? "Medium Risk" : "Low Risk";
  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Risk Score</h3>
        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: `${color}20`, color }}>{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e1e2e" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke={color} strokeWidth="3"
              strokeDasharray={`${score} 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{score}</span>
          </div>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Overall compliance risk based on real-time document analysis and agent audits</p>
        </div>
      </div>
    </div>
  );
}

const quickActions = [
  { href: "/dashboard/chat", label: "Ask AI", desc: "RAG & Text-to-SQL search", emoji: "💬", color: "from-indigo-600 to-indigo-500" },
  { href: "/dashboard/documents", label: "Upload Doc", desc: "PDF, DOCX, CSV, Excel", emoji: "📤", color: "from-cyan-600 to-cyan-500" },
  { href: "/dashboard/reports", label: "New Report", desc: "Audit & Risk reports", emoji: "📊", color: "from-violet-600 to-violet-500" },
  { href: "/dashboard/agents", label: "Run Agent", desc: "5-agent compliance pipeline", emoji: "🤖", color: "from-orange-600 to-orange-500" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.analytics.overview().then(setStats).catch(() => {}),
      api.analytics.activity().then(setActivities).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {greeting}, {user?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-400 mt-1">Here's your enterprise compliance intelligence overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="glass rounded-xl p-5 h-28 skeleton" />
          ))
        ) : (
          <>
            <StatCard
              label="Documents"
              value={stats?.documents.total ?? 0}
              sub={`${stats?.documents.ready ?? 0} indexed & ready`}
              color="bg-indigo-500/15"
              icon={<svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
            <StatCard
              label="Compliance Rate"
              value={`${stats?.compliance_rate ?? 0}%`}
              sub="Across policy checks"
              color="bg-green-500/15"
              icon={<svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              label="Violations Detected"
              value={stats?.violations ?? 0}
              sub="Action items flagged"
              color="bg-red-500/15"
              icon={<svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            />
            <StatCard
              label="Reports Generated"
              value={stats?.reports ?? 0}
              sub={`${stats?.messages ?? 0} AI queries processed`}
              color="bg-cyan-500/15"
              icon={<svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
          </>
        )}
      </div>

      {/* Quick Actions + Risk Meter */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 p-4 rounded-lg bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center text-lg shrink-0`}>
                  {a.emoji}
                </div>
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">{a.label}</div>
                  <div className="text-xs text-gray-500">{a.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="glass rounded-xl h-40 skeleton" />
        ) : (
          <RiskMeter score={stats?.risk_score ?? 0} />
        )}
      </div>

      {/* Activity Feed + Pipeline */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center justify-between">
            <span>Recent Activity</span>
            <span className="text-xs font-normal text-gray-500">Live feed</span>
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 skeleton rounded-lg" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">
              No recent activity yet. Upload a document or ask a question to see activity here.
            </div>
          ) : (
            <div className="space-y-2.5">
              {activities.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/2 border border-white/5 text-xs">
                  <span className="text-base">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-200 truncate">{item.title}</p>
                    <p className="text-[11px] text-gray-500">{item.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-gray-600 shrink-0">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Flow Diagram */}
        <div className="glass rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-white mb-4">Multi-Agent Intelligence Flow</h3>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {["User Query", "Security Guard", "Intent Router", "RAG / SQL", "Risk Agent", "Report Agent"].map(
                (step, i, arr) => (
                  <div key={step} className="flex items-center gap-2 mb-2">
                    <div className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs text-indigo-300 font-medium whitespace-nowrap">
                      {step}
                    </div>
                    {i < arr.length - 1 && (
                      <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
          <div className="border-t border-white/5 pt-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Every request passes through the Security Guard to prevent prompt injections, is classified by intent, and routed to vector similarity RAG or structured Text-to-SQL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
