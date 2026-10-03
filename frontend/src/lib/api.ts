const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("complyai_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
        ...(options.headers || {}),
      },
    });
  } catch (err: any) {
    throw new Error(`Unable to connect to ComplyAI backend server (${API_URL}). Please verify the server is running.`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Request failed with status ${res.status}` }));
    // If backend returns a validation array (Pydantic), format it nicely
    if (Array.isArray(err.detail)) {
      const msg = err.detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ");
      throw new Error(msg);
    }
    throw new Error(err.detail || `Request failed (${res.status})`);
  }

  return res.json();
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);
      return request<{ access_token: string; user: any }>("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
    },
    register: async (data: { email: string; full_name: string; password: string; role?: string }) => {
      return request<{ access_token: string; user: any }>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    me: async () => {
      return request<any>("/api/v1/auth/me");
    },
  },

  documents: {
    list: async () => {
      return request<any[]>("/api/v1/documents/");
    },
    get: async (id: string) => {
      return request<any>(`/api/v1/documents/${id}`);
    },
    delete: async (id: string) => {
      return request<any>(`/api/v1/documents/${id}`, { method: "DELETE" });
    },
    upload: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      let res: Response;
      try {
        res = await fetch(`${API_URL}/api/v1/documents/upload`, {
          method: "POST",
          headers: getAuthHeader(),
          body: form,
        });
      } catch (err: any) {
        throw new Error(`Unable to connect to ComplyAI backend at ${API_URL}`);
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Upload failed (${res.status})`);
      }
      return res.json();
    },
    seedSamplePack: async () => {
      return request<any>("/api/v1/documents/seed-sample-pack", { method: "POST" });
    },
  },

  chat: {
    sessions: async () => {
      return request<any[]>("/api/v1/chat/sessions");
    },
    createSession: async (title?: string) => {
      return request<any>("/api/v1/chat/sessions", {
        method: "POST",
        body: JSON.stringify({ title: title || "New Session" }),
      });
    },
    messages: async (sessionId: string) => {
      return request<any[]>(`/api/v1/chat/sessions/${sessionId}/messages`);
    },
    ask: async (message: string, sessionId?: string, documentIds?: string[]) => {
      return request<any>("/api/v1/chat/ask", {
        method: "POST",
        body: JSON.stringify({ message, session_id: sessionId, document_ids: documentIds || [] }),
      });
    },
  },

  analytics: {
    overview: async () => {
      return request<any>("/api/v1/analytics/overview");
    },
    activity: async () => {
      return request<any[]>("/api/v1/analytics/activity");
    },
  },

  reports: {
    list: async () => {
      return request<any[]>("/api/v1/reports/");
    },
    get: async (id: string) => {
      return request<any>(`/api/v1/reports/${id}`);
    },
    generate: async (data: { title: string; query: string; document_ids?: string[]; report_type?: string }) => {
      return request<any>("/api/v1/reports/generate", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },
};
