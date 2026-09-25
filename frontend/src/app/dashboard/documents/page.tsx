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
  ready: { label: "Indexed & Ready", color: "text-green-400", dot: "bg-green-400" },
  processing: { label: "Processing Embeddings...", color: "text-yellow-400", dot: "bg-yellow-400 animate-pulse" },
  failed: { label: "Processing Error", color: "text-red-400", dot: "bg-red-400" },
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
    if (!confirm("Delete this document from your knowledge base?")) return;
    await api.documents.delete(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Document Knowledge Base</h1>
          <p className="text-gray-400 mt-1">Upload and manage compliance policies, contracts, and data files</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium text-white cursor-pointer transition-colors shadow-lg shadow-indigo-600/20">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload Document
          <input type="file" className="hidden" accept=".pdf,.docx,.xlsx,.csv,.txt" onChange={handleFileInput} />
        </label>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`glass rounded-xl p-8 border-2 border-dashed transition-all text-center ${
          dragOver ? "border-indigo-500 bg-indigo-500/10" : "border-[#1e1e2e] hover:border-indigo-500/30"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-gray-300 text-sm font-medium">Extracting text & generating Gemini vector embeddings...</p>
          </div>
        ) : (
          <>
            <div className="text-4xl mb-3">📤</div>
            <p className="text-gray-200 font-medium">Drag & drop compliance documents here, or click upload</p>
            <p className="text-gray-500 text-xs mt-1">Supports PDF, DOCX, XLSX, CSV · Up to 50MB</p>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Document List */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Indexed Documents ({documents.length})
        </h2>

        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="glass rounded-xl h-20 skeleton" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">📂</div>
            <p className="text-gray-300 font-medium">No documents uploaded yet</p>
            <p className="text-gray-500 text-xs mt-1">Upload your policies or SOPs to enable AI document search and compliance checking.</p>
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
        <div className="glass rounded-xl p-6 border border-indigo-500/30 animate-fade-in space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${typeColors[selectedDoc.file_type] || ""}`}>
                  {selectedDoc.file_type}
                </span>
                <h3 className="font-semibold text-white text-base">{selectedDoc.name}</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">Original filename: {selectedDoc.original_filename}</p>
            </div>
            <button
              onClick={() => setSelectedDoc(null)}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-white/5"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs bg-black/20 p-3 rounded-lg border border-white/5">
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
              <span className="text-green-400 font-medium">Ready for RAG</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.push("/dashboard/chat")}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>💬</span> Ask AI about this document
            </button>
            <button
              onClick={() => router.push("/dashboard/reports")}
              className="bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              Generate Compliance Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
