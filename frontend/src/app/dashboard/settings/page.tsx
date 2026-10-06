"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, getApiUrl } from "@/lib/api";

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_current: boolean;
  created_at?: string;
}

interface TableData {
  columns: string[];
  total_records: number;
  sample_rows: Record<string, any>[];
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "team" | "data" | "system">("profile");

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwNotice, setPwNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Team State
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Data Explorer State
  const [tables, setTables] = useState<Record<string, TableData>>({});
  const [selectedTable, setSelectedTable] = useState<string>("employees");
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "team" && team.length === 0) {
      setTeamLoading(true);
      api.auth.team()
        .then(setTeam)
        .catch(() => {})
        .finally(() => setTeamLoading(false));
    }
    if (activeTab === "data" && Object.keys(tables).length === 0) {
      setDataLoading(true);
      api.analytics.databaseTables()
        .then((res) => {
          setTables(res || {});
          const firstKey = Object.keys(res || {})[0];
          if (firstKey) setSelectedTable(firstKey);
        })
        .catch(() => {})
        .finally(() => setDataLoading(false));
    }
  }, [activeTab, team.length, tables]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setProfileSaving(true);
    setProfileNotice(null);
    try {
      const res = await api.auth.updateProfile({ full_name: fullName.trim() });
      setProfileNotice({ type: "success", msg: res.message || "Profile updated successfully." });
    } catch (err: any) {
      setProfileNotice({ type: "error", msg: err.message || "Failed to update profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the workspace?`)) return;
    try {
      await api.auth.deleteTeamMember(id);
      setTeam((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwNotice(null);

    if (newPassword !== confirmPassword) {
      setPwNotice({ type: "error", msg: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setPwNotice({ type: "error", msg: "New password must be at least 6 characters." });
      return;
    }

    setPwSaving(true);
    try {
      const res = await api.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwNotice({ type: "success", msg: res.message || "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwNotice({ type: "error", msg: err.message || "Failed to update password." });
    } finally {
      setPwSaving(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Security & Password" },
    { id: "team", label: "Team Members" },
    { id: "data", label: "Database Explorer" },
    { id: "system", label: "System & AI" },
  ] as const;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Settings & Workspace</h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">
          Manage your account profile, credentials, team access, and internal compliance data.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-px scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-t-lg transition-all shrink-0 border-b-2 ${
              activeTab === t.id
                ? "text-indigo-400 border-indigo-500 bg-white/5"
                : "text-gray-400 border-transparent hover:text-white hover:bg-white/3"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PROFILE */}
      {activeTab === "profile" && (
        <div className="glass rounded-xl p-5 sm:p-6 space-y-6 max-w-2xl animate-fade-in">
          <div>
            <h2 className="text-base font-semibold text-white">Personal Profile</h2>
            <p className="text-xs text-gray-400 mt-0.5">Update your display name and view account details.</p>
          </div>

          {profileNotice && (
            <div
              className={`p-3 rounded-lg text-xs font-medium border ${
                profileNotice.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/25 text-rose-400"
              }`}
            >
              {profileNotice.msg}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-[#12121b] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full bg-[#12121b]/50 border border-white/5 rounded-lg px-3.5 py-2.5 text-sm text-gray-400 cursor-not-allowed"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">Email is managed by workspace administrator.</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Role & Permissions</label>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                  {user?.role || "Analyst"}
                </span>
                <span className="text-xs text-gray-400">Full access to policy search, audits &amp; reports</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
              >
                {profileSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: SECURITY */}
      {activeTab === "security" && (
        <div className="glass rounded-xl p-5 sm:p-6 space-y-6 max-w-2xl animate-fade-in">
          <div>
            <h2 className="text-base font-semibold text-white">Password &amp; Security</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ensure your account is using a secure password.</p>
          </div>

          {pwNotice && (
            <div
              className={`p-3 rounded-lg text-xs font-medium border ${
                pwNotice.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/25 text-rose-400"
              }`}
            >
              {pwNotice.msg}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full bg-[#12121b] border border-white/10 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                >
                  {showCurrentPw ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-[#12121b] border border-white/10 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                >
                  {showNewPw ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-[#12121b] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Repeat new password"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={pwSaving}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
              >
                {pwSaving ? "Updating Password..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: TEAM MEMBERS */}
      {activeTab === "team" && (
        <div className="glass rounded-xl p-5 sm:p-6 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">Workspace Team</h2>
              <p className="text-xs text-gray-400 mt-0.5">Active users registered to this ComplyAI workspace.</p>
            </div>
            <span className="text-xs font-medium bg-indigo-500/15 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-500/25">
              {team.length} Active {team.length === 1 ? "Member" : "Members"}
            </span>
          </div>

          {teamLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 skeleton rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 font-medium">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {team.map((m) => (
                    <tr key={m.id} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                          {m.full_name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <span>{m.full_name}</span>
                        {m.is_current && (
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/25 font-normal">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-400">{m.email}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-gray-300 uppercase text-[10px] font-semibold tracking-wider">
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!m.is_current && (
                          <button
                            onClick={() => handleDeleteMember(m.id, m.full_name)}
                            title="Remove member"
                            className="text-gray-500 hover:text-rose-400 transition-colors p-1 rounded hover:bg-white/5"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DATABASE EXPLORER */}
      {activeTab === "data" && (
        <div className="glass rounded-xl p-5 sm:p-6 space-y-4 animate-fade-in">
          <div>
            <h2 className="text-base font-semibold text-white">Compliance Database Explorer</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Inspect internal SQLite database tables queried by the Text-to-SQL engine and audit agents.
            </p>
          </div>

          {/* Table Selector Pills */}
          <div className="flex gap-2 border-b border-white/10 pb-3">
            {Object.keys(tables).map((tName) => (
              <button
                key={tName}
                onClick={() => setSelectedTable(tName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedTable === tName
                    ? "bg-indigo-600 text-white font-semibold"
                    : "bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                {tName} ({tables[tName]?.total_records ?? 0})
              </button>
            ))}
          </div>

          {dataLoading ? (
            <div className="h-40 skeleton rounded-lg" />
          ) : tables[selectedTable] ? (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 flex items-center justify-between">
                <span>Showing first 10 records of <strong>{tables[selectedTable].total_records}</strong> rows</span>
                <span className="font-mono text-[11px] text-indigo-400">SELECT * FROM {selectedTable}</span>
              </div>
              <div className="overflow-x-auto border border-white/5 rounded-lg bg-black/20">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-gray-300 font-semibold">
                      {tables[selectedTable].columns.map((col) => (
                        <th key={col} className="py-2.5 px-3 font-mono">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tables[selectedTable].sample_rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/3 transition-colors">
                        {tables[selectedTable].columns.map((col) => (
                          <td key={col} className="py-2.5 px-3 text-gray-300 font-mono text-[11px]">
                            {String(row[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500 py-6 text-center">No database tables loaded.</div>
          )}
        </div>
      )}

      {/* TAB 5: SYSTEM & AI */}
      {activeTab === "system" && (
        <div className="glass rounded-xl p-5 sm:p-6 space-y-5 max-w-2xl animate-fade-in">
          <div>
            <h2 className="text-base font-semibold text-white">System &amp; AI Engine Status</h2>
            <p className="text-xs text-gray-400 mt-0.5">Health and model parameters for ComplyAI intelligence pipeline.</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Backend API Server</div>
                <div className="text-gray-500 text-[11px] font-mono mt-0.5">{getApiUrl()}</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                Connected
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Core LLM Reasoner</div>
                <div className="text-gray-500 text-[11px] mt-0.5">Google Gemini 2.5 Flash</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold">
                Active
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Vector Embeddings</div>
                <div className="text-gray-500 text-[11px] mt-0.5">text-embedding-004 (768 dimensions)</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold">
                Enabled
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Security Guardrails</div>
                <div className="text-gray-500 text-[11px] mt-0.5">Real-time Prompt Injection &amp; Jailbreak Defense</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                Enforcing
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">PII Data Masker</div>
                <div className="text-gray-500 text-[11px] mt-0.5">Automatic regex redaction on SSN, emails, credit cards</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                Active
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
