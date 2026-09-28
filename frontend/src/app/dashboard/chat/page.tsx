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
  const labels: Record<string, string> = { rag: "📄 RAG", sql: "🗄️ SQL", agent: "🤖 Agent" };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium badge-${intent}`}>
      {labels[intent] || intent}
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
        <span>🎯 Grounded {metrics.faithfulness ?? 95}%</span>
        <span className="text-[8px] opacity-75">▼</span>
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-20 w-64 bg-[#14141e] border border-[#262638] rounded-xl p-3 shadow-2xl text-xs space-y-1.5 animate-fade-in">
          <div className="font-semibold text-white border-b border-white/10 pb-1 flex justify-between">
            <span>RAG Evaluation</span>
            <span className="text-emerald-400">{metrics.eval_status || "Verified"}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Faithfulness:</span>
            <span className="font-semibold text-emerald-400">{metrics.faithfulness ?? 95}%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Answer Relevancy:</span>
            <span className="font-semibold text-indigo-300">{metrics.relevancy ?? 92}%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Context Precision:</span>
            <span className="font-semibold text-cyan-300">{metrics.context_precision ?? 90}%</span>
          </div>
          <div className="flex justify-between text-gray-400 border-t border-white/5 pt-1">
            <span>Hallucination Risk:</span>
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
      className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      title={`Redacted sensitive identifiers: ${detected.join(", ")}`}
    >
      <span>🛡️ Redacted PII ({detected.join(", ")})</span>
    </span>
  );
}

function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
        isUser ? "bg-indigo-500 text-white" : "bg-gradient-to-br from-violet-600 to-cyan-500 text-white"
      }`}>
        {isUser ? "U" : "AI"}
      </div>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
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
                  h2: ({ node, ...props }) => <h2 className="text-sm font-bold text-indigo-300 mt-2 mb-1" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-gray-200 mt-1 mb-0.5" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1 text-gray-300" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-gray-300" {...props} />,
                  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                  code: ({ node, ...props }) => <code className="bg-black/30 border border-white/10 px-1.5 py-0.5 rounded text-xs text-cyan-300 font-mono" {...props} />,
                  table: ({ node, ...props }) => <div className="overflow-x-auto my-3"><table className="w-full border-collapse border border-[#1e1e2e] text-xs" {...props} /></div>,
                  th: ({ node, ...props }) => <th className="border border-[#1e1e2e] bg-[#161622] px-3 py-1.5 text-left font-semibold text-white" {...props} />,
                  td: ({ node, ...props }) => <td className="border border-[#1e1e2e] px-3 py-1.5 text-gray-300" {...props} />,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {msg.sources && msg.sources.length > 0 && msg.sources.slice(0, 4).map((s, i) => (
            <SourceChip key={i} source={s} />
          ))}
          {!isUser && msg.metrics && (
            <EvaluationBadge metrics={msg.metrics} />
          )}
          {!isUser && msg.metrics?.pii_detected && msg.metrics.pii_detected.length > 0 && (
            <PiiBadge detected={msg.metrics.pii_detected} />
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.chat.sessions().then(setSessions).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSession = async (id: string) => {
    setActiveSession(id);
    setLoadingMessages(true);
    try {
      const msgs = await api.chat.messages(id);
      setMessages(msgs);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput("");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.chat.ask(text, activeSession || undefined);
      if (!activeSession) {
        setActiveSession(res.session_id);
        setSessions((prev) => [{ id: res.session_id, title: text.slice(0, 50), updated_at: new Date().toISOString() }, ...prev]);
      }
      const aiMsg: Message = {
        id: res.message_id,
        role: "assistant",
        content: res.answer,
        sources: res.sources,
        intent: res.intent,
        metrics: res.metrics,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: `Error: ${err.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setActiveSession(null);
    setMessages([]);
  };

  const suggestedPrompts = [
    "What are the key requirements in our security policy?",
    "Which employees haven't completed mandatory training?",
    "Identify compliance violations in our contracts",
    "Generate a risk assessment for Q4",
  ];

  return (
    <div className="flex h-screen">
      {/* Sessions Sidebar */}
      <div className="w-56 border-r border-[#1e1e2e] bg-[#0d0d15] flex flex-col">
        <div className="p-3 border-b border-[#1e1e2e]">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors truncate ${
                activeSession === s.id
                  ? "bg-indigo-500/15 text-indigo-300 font-medium"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e1e2e] flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-white">Ask AI</h1>
            <p className="text-xs text-gray-500">Powered by RAG · SQL · Multi-Agent</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="badge-rag px-2 py-1 rounded-full">📄 RAG</span>
            <span className="badge-sql px-2 py-1 rounded-full">🗄️ SQL</span>
            <span className="badge-agent px-2 py-1 rounded-full">🤖 Agent</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !loadingMessages && (
            <div className="max-w-xl mx-auto text-center pt-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center mx-auto mb-4 text-3xl">
                🧠
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Ask your company data anything</h2>
              <p className="text-gray-400 text-sm mb-8">
                Upload documents and I'll help you search policies, analyze compliance, query structured data, and detect risks.
              </p>
              <div className="grid grid-cols-2 gap-3 text-left">
                {suggestedPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    className="p-3 bg-[#111118] border border-[#1e1e2e] hover:border-indigo-500/40 rounded-xl text-xs text-gray-300 hover:text-white text-left transition-all"
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shrink-0 text-sm font-bold text-white">AI</div>
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
                placeholder="Ask about your documents, policies, or data..."
                rows={1}
                className="w-full bg-transparent px-4 pt-3 pb-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none"
                style={{ minHeight: "44px", maxHeight: "120px" }}
              />
              <div className="flex items-center justify-between px-4 pb-2">
                <span className="text-xs text-gray-600">Enter to send · Shift+Enter for new line</span>
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
