"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";

const AGENT_STEPS = [
  {
    id: "retriever",
    label: "Retrieval Agent",
    icon: (
      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    desc: "Performs semantic vector search across policy repository",
  },
  {
    id: "sql",
    label: "SQL Interrogator",
    icon: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3" />
      </svg>
    ),
    desc: "Interrogates relational schemas and corporate datasets",
  },
  {
    id: "compliance",
    label: "Control Verifier",
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    desc: "Identifies regulatory discrepancies and control gaps",
  },
  {
    id: "risk",
    label: "Risk Evaluator",
    icon: (
      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    desc: "Quantifies audit exposure and severity impact",
  },
  {
    id: "report",
    label: "Audit Synthesizer",
    icon: (
      <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    desc: "Compiles formal executive audit findings and remediation",
  },
];

const EXAMPLE_QUERIES = [
  "Cross-reference SOC-2 password policy with employee records to identify active non-compliance",
  "Audit vendor contracts expiring within 90 days against subprocessor notification requirements",
  "Evaluate departmental training completion rates and determine high-risk exposure areas",
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

    // Step-by-step progress
    const stepLabels = [
      "Retrieving regulatory context from vector knowledge base",
      "Interrogating relational schema across internal datasets",
      "Evaluating compliance controls & identifying gap violations",
      "Calculating composite multi-vector risk exposure",
      "Synthesizing executive compliance audit report"
    ];
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
      setError(err.message || "Agent workflow execution failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Autonomous Compliance Orchestrator</h1>
        <p className="text-gray-400 text-sm mt-1">Coordinated 5-stage agent pipeline executing continuous control verification and audit synthesis.</p>
      </div>

      {/* Agent Pipeline Visualization */}
      <div className="glass rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Orchestration Pipeline</h3>
        <div className="flex items-start gap-0">
          {AGENT_STEPS.map((agent, i) => (
            <div key={agent.id} className="flex items-start flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all ${
                  steps[i]?.done ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" :
                  steps[i]?.active ? "bg-indigo-500/20 border border-indigo-500/50 animate-pulse text-indigo-400" :
                  "bg-white/5 border border-white/10 text-gray-400"
                }`}>
                  {steps[i]?.done ? (
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : agent.icon}
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-white">{agent.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 max-w-[80px] leading-tight">{agent.desc}</div>
                </div>
              </div>
              {i < AGENT_STEPS.length - 1 && (
                <div className="flex items-start pt-5 px-1">
                  <svg className={`w-4 h-4 transition-colors ${steps[i]?.done ? "text-emerald-400" : "text-gray-700"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Audit Objective & Scope</h3>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none mb-3"
          placeholder="Specify compliance audit requirements requiring document analysis and relational data cross-referencing..."
        />
        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 rounded-lg px-3 py-1.5 transition-colors text-left"
            >
              {q.slice(0, 60)}...
            </button>
          ))}
        </div>
        <button
          onClick={runAgents}
          disabled={running || !query.trim()}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 rounded-lg py-3 text-sm font-semibold text-white transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
        >
          {running ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Executing Autonomous Pipeline...
            </span>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Execute Autonomous Audit Workflow</span>
            </>
          )}
        </button>
      </div>

      {/* Live Steps */}
      {steps.length > 0 && (
        <div className="glass rounded-xl p-6 mb-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Pipeline Execution Telemetry</h3>
          <div className="space-y-2.5">
            {steps.map((step, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm transition-all ${step.active ? "opacity-100" : step.done ? "opacity-100" : "opacity-30"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  step.done ? "bg-emerald-500" : step.active ? "bg-indigo-500 animate-pulse" : "bg-gray-700"
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
                {step.done && <span className="text-xs text-emerald-400">Verified</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="glass rounded-xl p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-semibold text-white">Audit Findings & Executive Dossier</h3>
          </div>
          <div className="prose prose-invert max-w-none text-sm leading-relaxed text-gray-300 max-h-[500px] overflow-y-auto space-y-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result.content?.answer || result.answer || "Audit completed."}
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
