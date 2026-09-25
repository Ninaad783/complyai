"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";

interface Report {
  id: string;
  title: string;
  report_type: string;
  status: string;
  risk_score?: number;
  violations_count: number;
  created_at: string;
}

function RiskBadge({ score }: { score?: number }) {
  if (!score) return null;
  const level = score >= 75 ? { label: "High", color: "text-red-400 bg-red-500/15 border-red-500/30" }
    : score >= 50 ? { label: "Medium", color: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30" }
    : { label: "Low", color: "text-green-400 bg-green-500/15 border-green-500/30" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${level.color}`}>
      {level.label} Risk · {score}
    </span>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", query: "", report_type: "compliance" });
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.reports.list()
      .then(setReports)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generateReport = async () => {
    if (!form.title || !form.query) return;
    setGenerating(true);
    setError("");
    try {
      const result = await api.reports.generate(form);
      setReports((prev) => [result, ...prev]);
      setSelectedReport(result);
      setShowForm(false);
      setForm({ title: "", query: "", report_type: "compliance" });
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const viewReport = async (id: string) => {
    const r = await api.reports.get(id);
    setSelectedReport(r);
  };

  const downloadReport = (report: any) => {
    const text = `# ${report.title}\n\nGenerated: ${new Date(report.created_at).toLocaleString()}\nRisk Score: ${report.risk_score || "N/A"}\n\n---\n\n${report.content?.answer || ""}`;
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Reports</h1>
          <p className="text-gray-400 mt-1">AI-generated compliance analysis and risk reports</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Generate Report
        </button>
      </div>

      {/* Generate Form */}
      {showForm && (
        <div className="glass rounded-xl p-6 mb-6 animate-fade-in">
          <h3 className="font-semibold text-white mb-4">New Compliance Report</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Report Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                placeholder="Q4 Security Compliance Report"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Analysis Query</label>
              <textarea
                value={form.query}
                onChange={(e) => setForm({ ...form, query: e.target.value })}
                rows={3}
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm resize-none"
                placeholder="Compare our security policy with employee training records and identify violations..."
              />
            </div>
            <div className="flex gap-3">
              <select
                value={form.report_type}
                onChange={(e) => setForm({ ...form, report_type: e.target.value })}
                className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-2.5 text-white focus:outline-none text-sm"
              >
                <option value="compliance">Compliance</option>
                <option value="risk">Risk Assessment</option>
                <option value="summary">Summary</option>
              </select>
              <button
                onClick={generateReport}
                disabled={generating || !form.title || !form.query}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg py-2.5 text-sm font-medium text-white transition-colors"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating with AI agents...
                  </span>
                ) : "Generate Report"}
              </button>
            </div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Reports List */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-24 skeleton" />)
          ) : reports.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-gray-400 text-sm">No reports yet</p>
            </div>
          ) : (
            reports.map((r) => (
              <button
                key={r.id}
                onClick={() => viewReport(r.id)}
                className={`w-full text-left glass rounded-xl p-4 hover:bg-white/3 transition-all ${selectedReport?.id === r.id ? "border-indigo-500/40" : ""}`}
              >
                <div className="text-sm font-medium text-white mb-1 truncate">{r.title}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <RiskBadge score={r.risk_score} />
                  <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Report Viewer */}
        <div className="lg:col-span-3">
          {selectedReport ? (
            <div className="glass rounded-xl p-6 animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">{selectedReport.title}</h3>
                  <RiskBadge score={selectedReport.risk_score} />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadReport(selectedReport)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 hover:text-white transition-colors"
                  >
                    <span>📥</span> Export .md
                  </button>
                  <span className="text-xs px-2 py-1 bg-green-500/15 text-green-400 rounded-full font-medium">Ready</span>
                </div>
              </div>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed text-gray-300 max-h-[500px] overflow-y-auto space-y-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedReport.content?.answer || "Report content not available"}
                </ReactMarkdown>
              </div>
              {selectedReport.content?.sources?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#1e1e2e]">
                  <p className="text-xs text-gray-500 mb-2">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.content.sources.map((s: any, i: number) => (
                      <span key={i} className="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded-lg">
                        {s.document || s.type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-xl p-12 text-center">
              <div className="text-4xl mb-3">👆</div>
              <p className="text-gray-400 text-sm">Select a report to view its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
