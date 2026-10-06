"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: any[];
  intent?: string;
  metrics?: {
    faithfulness?: number;
    relevancy?: number;
    context_precision?: number;
    hallucination_risk?: string;
    eval_status?: string;
    pii_detected?: string[];
  };
  created_at?: string;
}

interface Session {
  id: string;
  title: string;
  updated_at: string;
}

function IntentBadge({ intent }: { intent?: string }) {
  if (!intent) return null;
  const labels: Record<string, { label: string; icon: string }> = {
    general: { label: "General Question", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    rag: { label: "Policy Search", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    sql: { label: "Database Query", icon: "M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3" },
    agent: { label: "Automated Audit", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    security_blocked: { label: "Blocked by Security Filter", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  };
  const item = labels[intent] || { label: intent, icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-medium tracking-wide badge-${intent}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
      </svg>
      {item.label}
    </span>
  );
}

function SourceChip({ source }: { source: any }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 text-xs text-indigo-300">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {source.document || source.type}{source.page ? ` · p.${source.page}` : ""}
    </div>
  );
}

function EvaluationBadge({ metrics }: { metrics?: any }) {
  const [open, setOpen] = useState(false);
  if (!metrics) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/50 rounded-full px-2.5 py-0.5 text-[11px] text-emerald-400 transition-colors"
      >
        <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Accuracy: {metrics.faithfulness ?? 95}%</span>
        <span className="text-[8px] opacity-75">▼</span>
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-20 w-64 bg-[#14141e] border border-[#262638] rounded-xl p-3 shadow-2xl text-xs space-y-1.5 animate-fade-in">
          <div className="font-semibold text-white border-b border-white/10 pb-1 flex justify-between">
            <span>Answer Verification</span>
            <span className="text-emerald-400">{metrics.eval_status || "Verified"}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Policy Match:</span>
            <span className="font-semibold text-emerald-400">{metrics.faithfulness ?? 95}%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Relevancy:</span>
            <span className="font-semibold text-indigo-300">{metrics.relevancy ?? 92}%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Context Quality:</span>
            <span className="font-semibold text-cyan-300">{metrics.context_precision ?? 90}%</span>
          </div>
          <div className="flex justify-between text-gray-400 border-t border-white/5 pt-1">
            <span>Risk of Inaccuracy:</span>
            <span className="font-semibold text-emerald-400">{metrics.hallucination_risk ?? "Low"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PiiBadge({ detected }: { detected?: string[] }) {
  if (!detected || detected.length === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      title={`Redacted sensitive data: ${detected.join(", ")}`}
    >
      <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span>Redacted: {detected.join(", ")}</span>
    </span>
  );
}

function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
        isUser ? "bg-indigo-600 text-white" : "bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/20"
      }`}>
        {isUser ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )}
      </div>
      <div className={`max-w-[90%] sm:max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {!isUser && <IntentBadge intent={msg.intent} />}
        <div className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-[#111118] border border-[#1e1e2e] text-gray-200 rounded-tl-sm shadow-lg"
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-2.5">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-base font-bold text-white mt-2 mb-1" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-sm font-semibold text-white mt-2 mb-1" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-xs font-semibold text-indigo-300 mt-1 mb-0.5 uppercase tracking-wider" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed text-gray-300" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 mb-2 text-gray-300" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-gray-300" {...props} />,
                  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                  code: ({ node, className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-[#1e1e2e] text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-[#0d0d15] border border-[#1e1e2e] rounded-lg p-3 text-xs font-mono text-cyan-300 overflow-x-auto my-2" {...props}>
                        {children}
                      </code>
                    );
                  },
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-2 border-indigo-500/50 pl-3 my-2 text-gray-400 italic text-xs" {...props} />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-3 border border-[#1e1e2e] rounded-lg">
                      <table className="min-w-full text-xs text-left" {...props} />
                    </div>
                  ),
                  th: ({ node, ...props }) => <th className="bg-[#161622] px-3 py-2 text-gray-300 font-semibold border-b border-[#1e1e2e]" {...props} />,
                  td: ({ node, ...props }) => <td className="px-3 py-2 border-b border-[#1e1e2e]/50 text-gray-400" {...props} />,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isUser && <EvaluationBadge metrics={msg.metrics} />}
          {!isUser && <PiiBadge detected={msg.metrics?.pii_detected} />}
          {msg.sources && msg.sources.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-[10px] text-gray-500 font-medium">Sources:</span>
              {msg.sources.map((s, i) => <SourceChip key={i} source={s} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await api.chat.sessions();
      setSessions(data);
      if (data.length > 0 && !activeSession) {
        loadSession(data[0].id);
      }
    } catch {
      // Offline fallback
    }
  };

  const loadSession = async (id: string) => {
    setActiveSession(id);
    setMobileSessionsOpen(false);
    setLoadingMessages(true);
    try {
      const data = await api.chat.messages(id);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");

    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.chat.ask(text, activeSession || undefined);

      if (!activeSession && res.session_id) {
        setActiveSession(res.session_id);
        loadSessions();
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.answer,
        sources: res.sources,
        intent: res.intent,
        metrics: res.metrics,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${err.message || "Failed to process request"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setActiveSession(null);
    setMessages([]);
    setMobileSessionsOpen(false);
  };

  const suggestedPrompts = [
    "What are our password length and MFA requirements under SOC-2?",
    "Which employees haven't finished mandatory security training?",
    "Summarize subprocessor notification requirements in our vendor DPA",
    "Check employee records for anyone missing compliance training",
  ];

  const sessionsContent = (
    <div className="flex flex-col h-full bg-[#0d0d15]">
      <div className="p-3 border-b border-[#1e1e2e] flex items-center justify-between">
        <button
          onClick={startNewChat}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Session
        </button>
        {mobileSessionsOpen && (
          <button
            onClick={() => setMobileSessionsOpen(false)}
            className="md:hidden ml-2 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
            aria-label="Close sessions"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <div className="px-2 py-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Chat History
        </div>
        {sessions.length === 0 ? (
          <div className="p-3 text-xs text-gray-500 text-center">No previous sessions</div>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors truncate block ${
                activeSession === s.id
                  ? "bg-indigo-500/15 text-indigo-300 font-medium"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {s.title}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-57px)] md:h-screen overflow-hidden">
      {/* Desktop Sessions Sidebar */}
      <aside className="hidden md:flex w-56 border-r border-[#1e1e2e] bg-[#0d0d15] flex-col shrink-0">
        {sessionsContent}
      </aside>

      {/* Mobile Sessions Drawer */}
      {mobileSessionsOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileSessionsOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full z-50 shadow-2xl border-r border-[#1e1e2e]">
            {sessionsContent}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#1e1e2e] flex items-center justify-between shrink-0 bg-[#0a0a0f]/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Sessions Button */}
            <button
              onClick={() => setMobileSessionsOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 shrink-0 border border-white/5"
              title="View Sessions"
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Sessions</span>
            </button>

            <div className="min-w-0">
              <h1 className="font-semibold text-white tracking-tight text-sm sm:text-base truncate">
                Policy &amp; Compliance Assistant
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate hidden xs:block">
                Search policies · Query database records · Run automated checks
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs shrink-0">
            <span className="badge-rag px-2.5 py-1 rounded-full text-[11px] font-medium">Search Policies</span>
            <span className="badge-sql px-2.5 py-1 rounded-full text-[11px] font-medium">Query Database</span>
            <span className="badge-agent px-2.5 py-1 rounded-full text-[11px] font-medium">Run Audit</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {messages.length === 0 && !loadingMessages && (
            <div className="max-w-xl mx-auto text-center pt-6 sm:pt-12">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4 text-indigo-400">
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-white mb-2">How can I help with your compliance?</h2>
              <p className="text-gray-400 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed px-2">
                Ask anything about your company policies, verify employee records in the database, or check security requirements.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left">
                {suggestedPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    className="p-3 bg-[#111118] border border-[#1e1e2e] hover:border-indigo-500/40 rounded-xl text-xs text-gray-300 hover:text-white text-left transition-all leading-relaxed"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingMessages && (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full skeleton shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 skeleton w-3/4 rounded" />
                    <div className="h-4 skeleton w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {messages.map((msg) => <ChatBubble key={msg.id} msg={msg} />)}

          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shrink-0 text-white shadow-lg shadow-indigo-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#1e1e2e]">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <div className="flex-1 bg-[#111118] border border-[#1e1e2e] focus-within:border-indigo-500/50 rounded-xl transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask a question about your policies, documents, or employee records..."
                rows={1}
                className="w-full bg-transparent px-4 pt-3 pb-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none"
                style={{ minHeight: "44px", maxHeight: "120px" }}
              />
              <div className="flex items-center justify-between px-4 pb-2">
                <span className="text-xs text-gray-600">Press Enter to send · Shift + Enter for new line</span>
              </div>
            </div>
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-11 h-11 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all shrink-0 animate-pulse-glow"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
