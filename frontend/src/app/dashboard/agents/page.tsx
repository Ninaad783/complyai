"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";

const AGENT_STEPS = [
  { id: "retriever", label: "Retriever Agent", icon: "📄", desc: "Searches document knowledge base via RAG" },
  { id: "sql", label: "SQL Agent", icon: "🗄️", desc: "Queries structured data tables" },
  { id: "compliance", label: "Compliance Agent", icon: "⚖️", desc: "Identifies policy violations" },
  { id: "risk", label: "Risk Agent", icon: "⚠️", desc: "Assesses risk levels and severity" },
  { id: "report", label: "Report Agent", icon: "📊", desc: "Synthesizes findings into a report" },
];

const EXAMPLE_QUERIES = [
  "Compare our security policy with employee training records and identify who is non-compliant",
  "Analyze all contracts expiring in the next 90 days and flag any that violate our vendor policy",
  "Which departments have the highest compliance risk based on HR records and policy documents?",
];

interface AgentStep {
  label: string;
  done: boolean;
  active: boolean;
}

export default function AgentsPage() {
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState("");

  const runAgents = async () => {
    if (!query.trim() || running) return;
    setRunning(true);
    setResult(null);
    setError("");

    // Simulate step-by-step progress
    const stepLabels = ["📄 Retrieving document context", "🗄️ Querying structured data", "⚖️ Analyzing compliance", "⚠️ Assessing risk", "📊 Generating report"];
    const stepArr: AgentStep[] = stepLabels.map((label) => ({ label, done: false, active: false }));
    setSteps([...stepArr]);

    for (let i = 0; i < stepArr.length; i++) {
      stepArr[i].active = true;
      setSteps([...stepArr]);
      await new Promise((r) => setTimeout(r, 600));
    }

    try {
      const res = await api.reports.generate({ title: query.slice(0, 60), query, report_type: "compliance" });
      stepArr.forEach((s) => { s.done = true; s.active = false; });
      setSteps([...stepArr]);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Agent workflow failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">AI Agent Workflow</h1>
        <p className="text-gray-400 mt-1">Multi-agent pipeline for complex compliance analysis</p>
      </div>

      {/* Agent Pipeline Visualization */}
      <div className="glass rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Agent Pipeline</h3>
        <div className="flex items-start gap-0">
          {AGENT_STEPS.map((agent, i) => (
            <div key={agent.id} className="flex items-start flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-2 transition-all ${
                  steps[i]?.done ? "bg-green-500/20 border border-green-500/40" :
                  steps[i]?.active ? "bg-indigo-500/20 border border-indigo-500/50 animate-pulse" :
                  "bg-white/5 border border-white/10"
                }`}>
                  {steps[i]?.done ? "✅" : agent.icon}
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-white">{agent.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 max-w-[80px] leading-tight">{agent.desc}</div>
                </div>
              </div>
              {i < AGENT_STEPS.length - 1 && (
                <div className="flex items-start pt-5 px-1">
                  <svg className={`w-4 h-4 transition-colors ${steps[i]?.done ? "text-green-400" : "text-gray-700"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <div className="glass rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Complex Query</h3>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none mb-3"
          placeholder="Ask a complex question that requires document + data analysis..."
        />
        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 rounded-lg px-3 py-1.5 transition-colors text-left"
            >
              {q.slice(0, 50)}...
            </button>
          ))}
        </div>
        <button
          onClick={runAgents}
          disabled={running || !query.trim()}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 rounded-lg py-3 text-sm font-semibold text-white transition-all"
        >
          {running ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running Agent Workflow...
            </span>
          ) : "🤖 Run Multi-Agent Analysis"}
        </button>
      </div>

      {/* Live Steps */}
      {steps.length > 0 && (
        <div className="glass rounded-xl p-6 mb-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Execution Log</h3>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm transition-all ${step.active ? "opacity-100" : step.done ? "opacity-100" : "opacity-30"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  step.done ? "bg-green-500" : step.active ? "bg-indigo-500 animate-pulse" : "bg-gray-700"
                }`}>
                  {step.done ? (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="w-2 h-2 bg-white/60 rounded-full" />
                  )}
                </div>
                <span className={step.done ? "text-gray-300" : step.active ? "text-white" : "text-gray-600"}>
                  {step.label}
                </span>
                {step.active && <span className="text-xs text-indigo-400 animate-pulse">Running...</span>}
                {step.done && <span className="text-xs text-green-400">Done</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="glass rounded-xl p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-green-400">✅</span>
            <h3 className="font-semibold text-white">Analysis Complete</h3>
          </div>
          <div className="prose prose-invert max-w-none text-sm leading-relaxed text-gray-300 max-h-[500px] overflow-y-auto space-y-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result.content?.answer || result.answer || "Analysis complete"}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {error && (
        <div className="glass rounded-xl p-4 animate-fade-in bg-red-500/5 border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
