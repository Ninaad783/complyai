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
  ready: { label: "Indexed & Ready", color: "text-emerald-400", dot: "bg-emerald-400" },
  processing: { label: "Indexing content...", color: "text-amber-400", dot: "bg-amber-400 animate-pulse" },
  failed: { label: "Indexing failed", color: "text-rose-400", dot: "bg-rose-400" },
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
  const [viewerDoc, setViewerDoc] = useState<{ id: string; name: string; chunks: any[]; loading: boolean } | null>(null);
  const [viewerSearch, setViewerSearch] = useState("");

  const openViewer = async (doc: Document, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setViewerDoc({ id: doc.id, name: doc.name, chunks: [], loading: true });
    try {
      const data = await api.documents.getContent(doc.id);
      setViewerDoc({ id: doc.id, name: doc.name, chunks: data.chunks || [], loading: false });
    } catch (err: any) {
      setViewerDoc({ id: doc.id, name: doc.name, chunks: [], loading: false });
    }
  };

  const handleDownload = (docId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = api.documents.getDownloadUrl(docId);
    window.open(url, "_blank");
  };

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
      setSeedNotice(res.message || "Sample compliance documents loaded successfully.");
      fetchDocs();
    } catch (err: any) {
      setError(err.message || "Failed to load sample policies");
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
    if (!confirm("Delete this document from your policy library?")) return;
    await api.documents.delete(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Documents &amp; Policies</h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Upload and manage company security policies, vendor contracts, and compliance guidelines.</p>
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
            <span>{seeding ? "Loading Policies..." : "Load Sample Policies"}</span>
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
            <p className="text-gray-300 text-sm font-medium">Processing and indexing document...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-gray-200 font-medium text-sm">Drop your policies or agreements here, or browse files</p>
            <p className="text-gray-500 text-xs mt-1">Supports PDF, DOCX, XLSX, CSV, and TXT up to 50MB</p>
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
          Uploaded Documents ({documents.length})
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
            <p className="text-gray-300 font-medium">No documents uploaded yet</p>
            <p className="text-gray-500 text-xs mt-1 mb-5">Upload your company policies or load sample documents to start searching and running compliance audits.</p>
            <button
              onClick={handleSeedPack}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white transition-all shadow-md shadow-emerald-600/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Load Sample Policies (SOC 2, DPA, Ethics, HIPAA)</span>
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                    <span className={`text-xs ${st.color} hidden sm:inline mr-1`}>{st.label}</span>
                    <button
                      onClick={(e) => openViewer(doc, e)}
                      title="Read extracted text chunks"
                      className="text-gray-400 hover:text-indigo-300 transition-colors p-1.5 rounded-lg hover:bg-white/5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDownload(doc.id, e)}
                      title="Download document file"
                      className="text-gray-400 hover:text-emerald-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
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
              <p className="text-xs text-gray-500 mt-1 truncate">File: {selectedDoc.original_filename}</p>
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
              <span className="text-gray-500 block">Pages</span>
              <span className="text-white font-medium">{selectedDoc.page_count ?? "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Status</span>
              <span className="text-emerald-400 font-medium">Ready for search</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
            <button
              onClick={() => openViewer(selectedDoc)}
              className="bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Extracted Content
            </button>
            <button
              onClick={() => handleDownload(selectedDoc.id)}
              className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download File
            </button>
            <button
              onClick={() => router.push("/dashboard/chat")}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Ask Questions
            </button>
          </div>
        </div>
      )}

      {/* Extracted Chunks Viewer Modal */}
      {viewerDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass max-w-3xl w-full max-h-[85vh] rounded-2xl flex flex-col border border-indigo-500/30 overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Content Inspector
                  </span>
                  <h3 className="font-semibold text-white text-sm sm:text-base truncate">{viewerDoc.name}</h3>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {viewerDoc.chunks.length} semantic chunks indexed for AI retrieval
                </p>
              </div>
              <button
                onClick={() => setViewerDoc(null)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Filter Search */}
            <div className="p-3 border-b border-white/10 bg-black/20">
              <input
                type="text"
                value={viewerSearch}
                onChange={(e) => setViewerSearch(e.target.value)}
                placeholder="Search extracted text within this document..."
                className="w-full bg-[#12121b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Chunks List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {viewerDoc.loading ? (
                <div className="space-y-3 py-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 skeleton rounded-lg" />
                  ))}
                </div>
              ) : viewerDoc.chunks.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                  No text chunks available for this document yet. It may still be indexing.
                </div>
              ) : (
                viewerDoc.chunks
                  .filter((c) => !viewerSearch || c.content.toLowerCase().includes(viewerSearch.toLowerCase()))
                  .map((chunk, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg bg-black/30 border border-white/5 space-y-1.5 hover:border-white/15 transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span className="font-semibold text-indigo-300">Chunk #{chunk.index + 1}</span>
                        {chunk.page && (
                          <span className="bg-white/5 px-2 py-0.5 rounded text-gray-400">Page {chunk.page}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-200 leading-relaxed font-mono whitespace-pre-wrap">
                        {chunk.content}
                      </p>
                    </div>
                  ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-white/10 bg-black/40 flex justify-end gap-2">
              <button
                onClick={() => handleDownload(viewerDoc.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Download Original File
              </button>
              <button
                onClick={() => setViewerDoc(null)}
                className="bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
