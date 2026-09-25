const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Demo Mode ────────────────────────────────────────────────────────────────
// When the backend is not running, the app works fully in demo mode using
// localStorage for auth and mock data for all API calls.

async function isBackendOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("complyai_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }

  return res.json();
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

function makeDemoToken(user: any): string {
  return "demo_" + btoa(JSON.stringify(user));
}

const DEMO_DOCS = [
  { id: "d1", name: "Security Policy 2025", original_filename: "security_policy.pdf", file_type: "pdf", file_size: 1240000, status: "ready", page_count: 24, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "d2", name: "Employee Training Records", original_filename: "employee_data.csv", file_type: "csv", file_size: 84000, status: "ready", page_count: null, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "d3", name: "Vendor Contracts Q4", original_filename: "contracts_q4.pdf", file_type: "pdf", file_size: 3100000, status: "ready", page_count: 47, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "d4", name: "Financial Data Q3", original_filename: "financial_q3.xlsx", file_type: "xlsx", file_size: 560000, status: "ready", page_count: null, created_at: new Date().toISOString() },
];

const DEMO_SESSIONS = [
  { id: "s1", title: "Security policy compliance check", updated_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "s2", title: "Employee training gap analysis", updated_at: new Date(Date.now() - 7200000).toISOString() },
];

const DEMO_MESSAGES: Record<string, any[]> = {
  s1: [
    { id: "m1", role: "user", content: "Which employees haven't completed mandatory security training?", sources: [], intent: "agent", created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: "m2", role: "assistant", content: "Based on my analysis of **security_policy.pdf** and **employee_data.csv**:\n\n**Policy Requirement (Section 4.2):** All employees must complete annual Cybersecurity Awareness Training by Q4.\n\n**Non-Compliant Employees (23 out of 150):**\n- Engineering Dept: 8 employees overdue\n- Sales Dept: 11 employees overdue\n- HR Dept: 4 employees overdue\n\n**Risk Level: HIGH** — This directly violates Section 4.2 of the Security Policy and may expose the organization to regulatory penalties.\n\n**Recommended Action:** Send immediate training reminders and escalate to department heads.", sources: [{ document: "security_policy.pdf", page: 12 }, { document: "employee_data.csv" }], intent: "agent", created_at: new Date(Date.now() - 3590000).toISOString() },
  ],
  s2: [
    { id: "m3", role: "user", content: "Summarize our Q4 vendor contracts", sources: [], intent: "rag", created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: "m4", role: "assistant", content: "## Q4 Vendor Contracts Summary\n\nBased on **contracts_q4.pdf** (47 pages):\n\n**Active Contracts: 12**\n- 3 expiring within 90 days ⚠️\n- 2 flagged for renegotiation\n\n**Total Contract Value: $4.2M**\n\n**Key Risk:** Vendor NDA clause in Contract #7 does not align with our current data retention policy (Section 3.1). Recommend legal review.", sources: [{ document: "contracts_q4.pdf", page: 3 }], intent: "rag", created_at: new Date(Date.now() - 7190000).toISOString() },
  ],
};

const DEMO_REPORTS = [
  { id: "r1", title: "Q4 Security Compliance Report", report_type: "compliance", status: "ready", risk_score: 72, violations_count: 3, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "r2", title: "Vendor Risk Assessment", report_type: "risk", status: "ready", risk_score: 45, violations_count: 1, created_at: new Date().toISOString() },
];

const DEMO_REPORT_CONTENT: Record<string, string> = {
  r1: `## Executive Summary\n\nThis compliance report analyzes company-wide adherence to the 2025 Security Policy.\n\n**Overall Compliance Rate: 84%**\n**Risk Score: 72/100 (High)**\n\n---\n\n## Key Findings\n\n1. **Training Non-Compliance** — 23 employees (15.3%) have not completed mandatory Cybersecurity Awareness Training\n2. **Access Control Gap** — 4 contractor accounts have elevated permissions beyond their role scope\n3. **Data Retention** — 2 vendor contracts contain clauses conflicting with the updated Data Retention Policy\n\n## Recommended Actions\n\n- Immediate: Send training reminders to 23 identified employees\n- Within 30 days: Conduct access control audit\n- Within 60 days: Renegotiate conflicting vendor contract clauses`,
  r2: `## Vendor Risk Assessment\n\n**Risk Level: MEDIUM (Score: 45)**\n\n12 active vendor contracts reviewed. 3 contracts expire in the next 90 days and require renewal or termination decisions.\n\nContract #7 contains a data processing clause that may conflict with GDPR Article 28 requirements. Legal review recommended before renewal.`,
};

// ─── Demo API Handlers ────────────────────────────────────────────────────────

function getDemoUser() {
  const stored = localStorage.getItem("complyai_user");
  return stored ? JSON.parse(stored) : null;
}

function demoRegister(data: { email: string; full_name: string; password: string }) {
  const user = { id: "demo-user-1", email: data.email, full_name: data.full_name, role: "analyst" };
  return { access_token: makeDemoToken(user), user };
}

function demoLogin(email: string, password: string) {
  const user = { id: "demo-user-1", email, full_name: email.split("@")[0], role: "analyst" };
  return { access_token: makeDemoToken(user), user };
}

let demoSessions = [...DEMO_SESSIONS];
let demoDocs = [...DEMO_DOCS];
let demoMessages = { ...DEMO_MESSAGES };
let demoReports = [...DEMO_REPORTS];
let sessionMsgCounter = 100;

function demoAskAI(message: string, sessionId?: string): any {
  const sid = sessionId || `s${Date.now()}`;
  const intent = message.toLowerCase().includes("employee") || message.toLowerCase().includes("training") || message.toLowerCase().includes("sql")
    ? "agent"
    : message.toLowerCase().includes("select") || message.toLowerCase().includes("data") || message.toLowerCase().includes("financial")
    ? "sql"
    : "rag";

  const answers: Record<string, string> = {
    agent: `## Multi-Agent Analysis Complete\n\nAfter running the full compliance pipeline across your documents:\n\n**Document Analysis (RAG):** Found relevant policy clauses in security_policy.pdf\n\n**Data Query (SQL):** Cross-referenced with employee_data.csv — identified 23 employees with incomplete training\n\n**Compliance Assessment:** 3 violations detected across departments\n\n**Risk Score: HIGH (72/100)**\n\nRecommendation: Immediate corrective action required for training compliance.`,
    sql: `## Structured Data Query Result\n\nBased on your employee and financial data:\n\n| Metric | Value |\n|--------|-------|\n| Total Employees | 150 |\n| Training Complete | 127 (84.7%) |\n| Overdue | 23 (15.3%) |\n| High Risk Dept | Sales (11 overdue) |\n\nQuery executed successfully against employee_data.csv`,
    rag: `## Document Analysis\n\nBased on your uploaded documents:\n\n${message.toLowerCase().includes("security") ? "**Security Policy Section 4.2** requires all employees to complete annual Cybersecurity Awareness Training. The policy mandates completion by Q4 each year, with penalties for non-compliance including restricted system access." : "I found relevant information across your compliance documents. The key provisions indicate that all vendor relationships must be reviewed annually and that data retention periods are governed by the applicable regulatory framework."}\n\n**Sources:** ${demoDocs.slice(0, 2).map(d => d.original_filename).join(", ")}`,
  };

  if (!sessionId) {
    const newSession = { id: sid, title: message.slice(0, 50), updated_at: new Date().toISOString() };
    demoSessions = [newSession, ...demoSessions];
    demoMessages[sid] = [];
  }

  const msgId = `msg_${sessionMsgCounter++}`;
  const replyId = `msg_${sessionMsgCounter++}`;

  if (!demoMessages[sid]) demoMessages[sid] = [];
  demoMessages[sid].push({ id: msgId, role: "user", content: message, sources: [], intent, created_at: new Date().toISOString() });
  demoMessages[sid].push({ id: replyId, role: "assistant", content: answers[intent], sources: demoDocs.slice(0, 2).map(d => ({ document: d.name, filename: d.original_filename, page: 1 })), intent, created_at: new Date().toISOString() });

  return { session_id: sid, message_id: replyId, answer: answers[intent], sources: demoDocs.slice(0, 2).map(d => ({ document: d.name })), intent };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

let _backendOnline: boolean | null = null;
async function checkBackend(): Promise<boolean> {
  if (_backendOnline === null) {
    _backendOnline = await isBackendOnline();
  }
  return _backendOnline;
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      if (await checkBackend()) {
        const form = new URLSearchParams();
        form.append("username", email);
        form.append("password", password);
        return request<{ access_token: string; user: any }>("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
      }
      return demoLogin(email, password);
    },
    register: async (data: { email: string; full_name: string; password: string; role?: string }) => {
      if (await checkBackend()) {
        return request<{ access_token: string; user: any }>("/api/v1/auth/register", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
      return demoRegister(data);
    },
    me: async () => {
      if (await checkBackend()) return request<any>("/api/v1/auth/me");
      return getDemoUser();
    },
  },

  documents: {
    list: async () => {
      if (await checkBackend()) return request<any[]>("/api/v1/documents/");
      return demoDocs;
    },
    get: async (id: string) => {
      if (await checkBackend()) return request<any>(`/api/v1/documents/${id}`);
      return demoDocs.find((d) => d.id === id) || null;
    },
    delete: async (id: string) => {
      if (await checkBackend()) return request<any>(`/api/v1/documents/${id}`, { method: "DELETE" });
      demoDocs = demoDocs.filter((d) => d.id !== id);
      return { message: "Deleted" };
    },
    upload: async (file: File) => {
      if (await checkBackend()) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_URL}/api/v1/documents/upload`, {
          method: "POST",
          headers: getAuthHeader(),
          body: form,
        });
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const newDoc = {
        id: `d${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, ""),
        original_filename: file.name,
        file_type: ext,
        file_size: file.size,
        status: "ready",
        page_count: ext === "pdf" ? Math.floor(Math.random() * 30) + 5 : null,
        created_at: new Date().toISOString(),
      };
      demoDocs = [newDoc, ...demoDocs];
      return newDoc;
    },
  },

  chat: {
    sessions: async () => {
      if (await checkBackend()) return request<any[]>("/api/v1/chat/sessions");
      return demoSessions;
    },
    createSession: async (title?: string) => {
      if (await checkBackend()) {
        return request<any>("/api/v1/chat/sessions", {
          method: "POST",
          body: JSON.stringify({ title: title || "New Chat" }),
        });
      }
      const s = { id: `s${Date.now()}`, title: title || "New Chat", updated_at: new Date().toISOString() };
      demoSessions = [s, ...demoSessions];
      return s;
    },
    messages: async (sessionId: string) => {
      if (await checkBackend()) return request<any[]>(`/api/v1/chat/sessions/${sessionId}/messages`);
      return demoMessages[sessionId] || [];
    },
    ask: async (message: string, sessionId?: string, documentIds?: string[]) => {
      if (await checkBackend()) {
        return request<any>("/api/v1/chat/ask", {
          method: "POST",
          body: JSON.stringify({ message, session_id: sessionId, document_ids: documentIds || [] }),
        });
      }
      // Simulate a small delay like a real AI
      await new Promise((r) => setTimeout(r, 1500));
      return demoAskAI(message, sessionId);
    },
  },

  analytics: {
    overview: async () => {
      if (await checkBackend()) return request<any>("/api/v1/analytics/overview");
      return {
        documents: { total: demoDocs.length, ready: demoDocs.filter(d => d.status === "ready").length, processing: 0 },
        chat_sessions: demoSessions.length,
        messages: Object.values(demoMessages).flat().length,
        reports: demoReports.length,
        risk_score: 72,
        compliance_rate: 84,
        violations: 3,
      };
    },
    activity: async () => {
      if (await checkBackend()) return request<any[]>("/api/v1/analytics/activity");
      return [];
    },
  },

  reports: {
    list: async () => {
      if (await checkBackend()) return request<any[]>("/api/v1/reports/");
      return demoReports;
    },
    get: async (id: string) => {
      if (await checkBackend()) return request<any>(`/api/v1/reports/${id}`);
      const r = demoReports.find((r) => r.id === id);
      return r ? { ...r, content: { answer: DEMO_REPORT_CONTENT[id] || "Report content", sources: [] } } : null;
    },
    generate: async (data: { title: string; query: string; document_ids?: string[]; report_type?: string }) => {
      if (await checkBackend()) {
        return request<any>("/api/v1/reports/generate", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
      await new Promise((r) => setTimeout(r, 2000));
      const newReport = {
        id: `r${Date.now()}`,
        title: data.title,
        report_type: data.report_type || "compliance",
        status: "ready",
        risk_score: Math.floor(Math.random() * 40) + 40,
        violations_count: Math.floor(Math.random() * 5),
        created_at: new Date().toISOString(),
        content: {
          answer: `## ${data.title}\n\n**Query:** ${data.query}\n\n---\n\n## Executive Summary\n\nBased on analysis of ${demoDocs.length} uploaded documents, the AI compliance pipeline has identified the following:\n\n**Compliance Rate: ${Math.floor(Math.random() * 20) + 75}%**\n\n## Key Findings\n\n1. Document analysis via RAG identified 2 policy clauses requiring attention\n2. Structured data cross-reference found discrepancies in 3 employee records\n3. Risk assessment indicates MEDIUM severity for vendor contract renewals\n\n## Recommendations\n\n- Schedule immediate compliance training for identified departments\n- Review and update vendor NDAs before Q1\n- Implement quarterly compliance audits`,
          sources: demoDocs.slice(0, 2).map(d => ({ document: d.name })),
        },
      };
      demoReports = [newReport, ...demoReports];
      return newReport;
    },
  },
};
