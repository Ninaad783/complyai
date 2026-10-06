"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Document {
  id: string;
  name: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: "processing" | "ready" | "failed";
  page_count?: number;
  created_at: string;
}

const typeColors: Record<string, string> = {
  pdf: "bg-red-500/15 text-red-400 border border-red-500/20",
  docx: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  xlsx: "bg-green-500/15 text-green-400 border border-green-500/20",
  csv: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  txt: "bg-gray-500/15 text-gray-300 border border-gray-500/20",
};

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  ready: { label: "Indexed & Verified", color: "text-emerald-400", dot: "bg-emerald-400" },
  processing: { label: "Vectorizing Content...", color: "text-amber-400", dot: "bg-amber-400 animate-pulse" },
  failed: { label: "Indexing Failed", color: "text-rose-400", dot: "bg-rose-400" },
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState("");

  const fetchDocs = () => {
    setLoading(true);
    api.documents.list()
      .then(setDocuments)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
    const interval = setInterval(() => {
      api.documents.list().then(setDocuments).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSeedPack = async () => {
    setSeeding(true);
    setSeedNotice("");
    try {
      const res = await api.documents.seedSamplePack();
      setSeedNotice(res.message || "Standard compliance suite loaded successfully.");
      fetchDocs();
    } catch (err: any) {
      setError(err.message || "Failed to load compliance suite");
    } finally {
      setSeeding(false);
    }
  };

  const uploadFile = useCallback(async (file: File) => {
    setError("");
    setUploading(true);
    try {
      await api.documents.upload(file);
      fetchDocs();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Remove this document from active policy repository?")) return;
    await api.documents.delete(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Policy &amp; Regulatory Repository</h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Manage governance frameworks, vendor agreements, and SOC-2 / ISO control documentation.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <button
            onClick={handleSeedPack}
            disabled={seeding}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 rounded-lg text-xs sm:text-sm font-medium text-white transition-all shadow-lg shadow-emerald-600/20"
          >
            {seeding ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            <span>{seeding ? "Importing Suite..." : "Import Compliance Suite"}</span>
          </button>
          <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs sm:text-sm font-medium text-white cursor-pointer transition-colors shadow-lg shadow-indigo-600/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
            <input type="file" className="hidden" accept=".pdf,.docx,.xlsx,.csv,.txt" onChange={handleFileInput} />
          </label>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`glass rounded-xl p-5 sm:p-8 border-2 border-dashed transition-all text-center ${
          dragOver ? "border-indigo-500 bg-indigo-500/10" : "border-[#1e1e2e] hover:border-indigo-500/30"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-gray-300 text-sm font-medium">Extracting document structure and generating semantic vector embeddings...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-gray-200 font-medium text-sm">Drop compliance policies or agreements here, or browse files</p>
            <p className="text-gray-500 text-xs mt-1">Supports PDF, DOCX, XLSX, CSV, TXT · Maximum 50MB per file</p>
          </div>
        )}
      </div>

      {seedNotice && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{seedNotice}</span>
          </div>
          <button onClick={() => setSeedNotice("")} className="text-gray-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Document List */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Repository Assets ({documents.length})
        </h2>

        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="glass rounded-xl h-20 skeleton" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-300 font-medium">No governance documents in repository</p>
            <p className="text-gray-500 text-xs mt-1 mb-5">Import standard regulatory suites or upload custom company policies to enable semantic retrieval and compliance audits.</p>
            <button
              onClick={handleSeedPack}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white transition-all shadow-md shadow-emerald-600/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Import Enterprise Compliance Suite (SOC-2, DPA, Ethics, HIPAA)</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const st = statusConfig[doc.status] || statusConfig.processing;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/4 cursor-pointer transition-all border ${
                    selectedDoc?.id === doc.id ? "border-indigo-500/50 bg-indigo-500/5" : "border-white/5"
                  }`}
                >
                  <div className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase shrink-0 ${typeColors[doc.file_type] || "bg-gray-500/15 text-gray-400"}`}>
                    {doc.file_type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{doc.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <span>{doc.original_filename}</span>
                      <span>·</span>
                      <span>{formatSize(doc.file_size)}</span>
                      {doc.page_count && (
                        <>
                          <span>·</span>
                          <span>{doc.page_count} pages</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                    <span className={`text-xs ${st.color} hidden sm:inline`}>{st.label}</span>
                  </div>
                  <button
                    onClick={(e) => deleteDoc(doc.id, e)}
                    title="Delete document"
                    className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Document Details Drawer */}
      {selectedDoc && (
        <div className="glass rounded-xl p-4 sm:p-6 border border-indigo-500/30 animate-fade-in space-y-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${typeColors[selectedDoc.file_type] || ""}`}>
                  {selectedDoc.file_type}
                </span>
                <h3 className="font-semibold text-white text-sm sm:text-base truncate">{selectedDoc.name}</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">Original filename: {selectedDoc.original_filename}</p>
            </div>
            <button
              onClick={() => setSelectedDoc(null)}
              className="text-gray-400 hover:text-white text-xs px-2.5 py-1 rounded bg-white/5 shrink-0"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-black/20 p-3 rounded-lg border border-white/5">
            <div>
              <span className="text-gray-500 block">File Size</span>
              <span className="text-white font-medium">{formatSize(selectedDoc.file_size)}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Pages Extracted</span>
              <span className="text-white font-medium">{selectedDoc.page_count ?? "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Status</span>
              <span className="text-emerald-400 font-medium">Semantic Index Active</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
            <button
              onClick={() => router.push("/dashboard/chat")}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Query Document in Policy Assistant
            </button>
            <button
              onClick={() => router.push("/dashboard/reports")}
              className="bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium py-2.5 px-4 rounded-lg transition-colors text-center"
            >
              Generate Audit Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
