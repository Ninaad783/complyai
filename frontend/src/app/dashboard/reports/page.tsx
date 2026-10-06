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
  const level = score >= 75 ? { label: "High Risk", color: "text-rose-400 bg-rose-500/15 border-rose-500/30" }
    : score >= 50 ? { label: "Medium Risk", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" }
    : { label: "Low Risk", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${level.color}`}>
      {level.label} · {score}/100
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

  const exportPDF = (report: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${report.title} - ComplyAI Audit Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #1e293b; margin: 40px; line-height: 1.6; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start; }
            .brand { font-size: 22px; font-weight: 700; color: #4f46e5; }
            .brand-sub { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; font-weight: 600; }
            .report-title { font-size: 24px; font-weight: 700; margin: 20px 0 10px; color: #0f172a; }
            .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
            .meta-item { font-size: 12px; }
            .meta-label { color: #64748b; font-weight: 500; display: block; font-size: 11px; text-transform: uppercase; margin-bottom: 3px; }
            .meta-val { font-weight: 600; color: #0f172a; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
            .badge-low { background: #dcfce7; color: #15803d; }
            .badge-med { background: #fef3c7; color: #b45309; }
            .badge-high { background: #ffe4e6; color: #be123c; }
            .content { font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-wrap; font-family: inherit; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 25px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
            .sign-off { margin-top: 30px; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; }
            .sign-box { width: 45%; }
            .sign-line { border-bottom: 1px solid #94a3b8; height: 35px; margin-bottom: 8px; }
            @media print {
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">🛡️ ComplyAI</div>
              <div class="brand-sub">Enterprise Security & Compliance Intelligence</div>
            </div>
            <div style="text-align: right;">
              <span class="badge ${report.risk_score >= 75 ? 'badge-high' : report.risk_score >= 50 ? 'badge-med' : 'badge-low'}">
                Risk Score: ${report.risk_score ?? 'N/A'}/100
              </span>
              <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Status: Certified Assessment</div>
            </div>
          </div>

          <h1 class="report-title">${report.title}</h1>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Assessment Date</span>
              <span class="meta-val">${new Date(report.created_at).toLocaleDateString()}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Audit Scope</span>
              <span class="meta-val">${report.report_type?.toUpperCase() || 'COMPLIANCE AUDIT'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Risk Rating</span>
              <span class="meta-val">${report.risk_score >= 75 ? 'High Risk' : report.risk_score >= 50 ? 'Moderate Risk' : 'Low Risk'}</span>
            </div>
          </div>

          <div class="content">
            ${(report.content?.answer || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </div>

          <div class="sign-off">
            <div class="sign-box">
              <div class="meta-label">Certified By (Lead Auditor)</div>
              <div class="sign-line"></div>
              <div style="font-size: 11px; color: #64748b;">Signature / Date</div>
            </div>
            <div class="sign-box">
              <div class="meta-label">Compliance Officer Sign-Off</div>
              <div class="sign-line"></div>
              <div style="font-size: 11px; color: #64748b;">Signature / Date</div>
            </div>
          </div>

          <div class="footer">
            <div>Generated by ComplyAI Intelligence Engine · Confidential</div>
            <div>Page 1 of 1</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Audit Reports</h1>
          <p className="text-gray-400 mt-1 text-xs sm:text-sm">Generate, review, and export formal compliance assessments and gap analysis reports.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs sm:text-sm font-medium text-white transition-colors shadow-lg shadow-indigo-600/20 w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Audit Report
        </button>
      </div>

      {/* Generate Form */}
      {showForm && (
        <div className="glass rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 animate-fade-in border border-indigo-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Audit Report
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-200 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5 uppercase tracking-wider">Report Name</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                placeholder="e.g., SOC 2 Access Control & Password Audit"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5 uppercase tracking-wider">What should this report evaluate?</label>
              <textarea
                value={form.query}
                onChange={(e) => setForm({ ...form, query: e.target.value })}
                rows={3}
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm resize-none"
                placeholder="e.g., Check password standards, MFA enforcement, and employee training completion across our policies and database records..."
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={form.report_type}
                onChange={(e) => setForm({ ...form, report_type: e.target.value })}
                className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-2.5 text-white focus:outline-none text-sm"
              >
                <option value="compliance">Control &amp; Compliance Audit</option>
                <option value="risk">Risk &amp; Gap Assessment</option>
                <option value="summary">Executive Summary</option>
              </select>
              <button
                onClick={generateReport}
                disabled={generating || !form.title || !form.query}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg py-2.5 text-sm font-medium text-white transition-colors shadow-lg shadow-indigo-600/20"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating report...
                  </span>
                ) : "Generate Report"}
              </button>
            </div>
            {error && <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">{error}</div>}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Reports List */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-24 skeleton" />)
          ) : reports.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center border border-dashed border-[#1e1e2e]">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-300 mb-1">No reports generated yet</p>
              <p className="text-gray-500 text-xs">Click &quot;New Audit Report&quot; above to run a compliance check.</p>
            </div>
          ) : (
            reports.map((r) => (
              <button
                key={r.id}
                onClick={() => viewReport(r.id)}
                className={`w-full text-left glass rounded-xl p-4 hover:bg-white/5 transition-all ${selectedReport?.id === r.id ? "border-indigo-500/60 ring-1 ring-indigo-500/30" : ""}`}
              >
                <div className="text-sm font-medium text-white mb-1.5 truncate">{r.title}</div>
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
            <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in border border-[#1e1e2e]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 pb-4 border-b border-[#1e1e2e]">
                <div>
                  <h3 className="font-semibold text-white text-base mb-1">{selectedReport.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <RiskBadge score={selectedReport.risk_score} />
                    <span className="text-xs text-gray-500">
                      Evaluated: {new Date(selectedReport.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => exportPDF(selectedReport)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg text-xs text-indigo-300 hover:text-white transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export PDF
                  </button>
                  <button
                    onClick={() => downloadReport(selectedReport)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 hover:text-white transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Markdown
                  </button>
                  <span className="text-xs px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Completed Audit
                  </span>
                </div>
              </div>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed text-gray-300 max-h-[500px] overflow-y-auto space-y-2 pr-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedReport.content?.answer || "Report content not available"}
                </ReactMarkdown>
              </div>
              {selectedReport.content?.sources?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#1e1e2e]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Referenced Policies &amp; Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.content.sources.map((s: any, i: number) => (
                      <span key={i} className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {s.document || s.type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-xl p-16 text-center border border-dashed border-[#1e1e2e]">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-300 mb-1">Select an Audit Report</p>
              <p className="text-gray-500 text-xs max-w-sm mx-auto">Choose a report on the left to view detailed findings, risk score breakdown, and referenced policy sources.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
