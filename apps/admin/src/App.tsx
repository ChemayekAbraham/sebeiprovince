import React, { useState, useEffect } from "react";
import {
  Shield, Trophy, Users, ArrowRightLeft, Calendar, FileText,
  AlertCircle, Settings, UserCheck, Activity, LogOut, Plus,
  Edit2, Trash2, CheckCircle, XCircle, Search, Filter, Save,
  ChevronRight, RefreshCw, Eye, Lock, CheckSquare
} from "lucide-react";

const API = "/api/admin";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Login form state
  const [email, setEmail] = useState("admin@sebeiprovincefootball.com");
  const [password, setPassword] = useState("ChangeMe!12345");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Active admin tab
  const [tab, setTab] = useState<string>("dashboard");

  // Global flash messages
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Data states
  const [dashboard, setDashboard] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [staffUsers, setStaffUsers] = useState<any[]>([]);

  // Modals / forms
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<any>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/auth/me`);
      if (res.ok) {
        const d = await res.json();
        setUser(d.user);
        loadDashboard();
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Login failed");
      } else {
        setUser(data.user);
        showToast("Authenticated successfully. Welcome to Sebei Province Football Console.");
        loadDashboard();
      }
    } catch (err: any) {
      setAuthError(err.message || "Network error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch(`${API}/auth/logout`, { method: "POST" });
    setUser(null);
    showToast("Logged out safely.");
  };

  // Switch tabs
  const switchTab = (newTab: string) => {
    setTab(newTab);
    if (newTab === "dashboard") loadDashboard();
    if (newTab === "news") loadNews();
    if (newTab === "teams") loadTeams();
    if (newTab === "players") loadPlayers();
    if (newTab === "transfers") loadTransfers();
    if (newTab === "competitions") loadCompetitions();
    if (newTab === "matches") loadMatches();
    if (newTab === "announcements") loadAnnouncements();
    if (newTab === "audit") loadAudit();
    if (newTab === "settings") loadSettings();
    if (newTab === "users") loadUsers();
  };

  const loadDashboard = async () => {
    const res = await fetch(`${API}/dashboard`);
    if (res.ok) setDashboard(await res.json());
  };

  const loadNews = async () => {
    const res = await fetch(`${API}/news`);
    if (res.ok) {
      const d = await res.json();
      setNews(d.items || []);
    }
  };

  const loadTeams = async () => {
    const res = await fetch(`${API}/teams`);
    if (res.ok) {
      const d = await res.json();
      setTeams(d.items || []);
    }
  };

  const loadPlayers = async () => {
    const res = await fetch(`${API}/players`);
    if (res.ok) {
      const d = await res.json();
      setPlayers(d.items || []);
    }
  };

  const loadTransfers = async () => {
    const res = await fetch(`${API}/transfers`);
    if (res.ok) {
      const d = await res.json();
      setTransfers(d.items || []);
    }
  };

  const loadCompetitions = async () => {
    const res = await fetch(`${API}/competitions`);
    if (res.ok) setCompetitions(await res.json());
  };

  const loadMatches = async () => {
    const res = await fetch(`${API}/matches`);
    if (res.ok) {
      const d = await res.json();
      setMatches(d.items || []);
    }
  };

  const loadAnnouncements = async () => {
    const res = await fetch(`${API}/announcements`);
    if (res.ok) setAnnouncements(await res.json());
  };

  const loadAudit = async () => {
    const res = await fetch(`${API}/audit-logs`);
    if (res.ok) {
      const d = await res.json();
      setAuditLogs(d.items || []);
    }
  };

  const loadSettings = async () => {
    const res = await fetch(`${API}/settings`);
    if (res.ok) setSettings(await res.json());
  };

  const loadUsers = async () => {
    const res = await fetch(`${API}/users`);
    if (res.ok) setStaffUsers(await res.json());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-medium">Checking Administrative Session...</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LOGIN SCREEN
  // -------------------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-white border-2 border-[#F5C542] p-1 mx-auto flex items-center justify-center shadow-xl overflow-hidden">
              <img
                src="/uploads/sebei_province_logo.jpg"
                alt="Sebei Province Football"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white mt-4">
              Sebei Province <span className="text-[#F5C542]">Football</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
              Authorized Staff Administration Console
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Staff Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F5C542]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F5C542]"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-[#14532D] hover:bg-[#196b3a] text-[#F5C542] font-black rounded-lg text-sm uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {authLoading ? "Authenticating..." : "Sign In to Admin Console"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
            <span className="font-semibold text-slate-400">Default Super Administrator:</span>
            <div className="font-mono text-[11px] text-emerald-400 mt-1">
              admin@sebeiprovincefootball.com / ChangeMe!12345
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED ADMIN LAYOUT
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl text-xs font-bold flex items-center gap-2 border ${
            toast.type === "success"
              ? "bg-emerald-950 border-emerald-600 text-emerald-200"
              : "bg-red-950 border-red-600 text-red-200"
          }`}
        >
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#F5C542] p-0.5 overflow-hidden shrink-0">
            <img
              src="/uploads/sebei_province_logo.jpg"
              alt="Sebei Province Football"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div>
            <div className="font-black text-sm uppercase tracking-wider text-white">
              Sebei Football <span className="text-[#F5C542]">Console</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Kapchorwa • Bukwo • Kween Sports Admin
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            <Eye className="w-3.5 h-3.5" /> View Public Site
          </a>

          <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

          <div className="text-right">
            <div className="font-bold text-white">{user.name}</div>
            <div className="text-[10px] text-[#F5C542]">{user.roles?.[0] || "Administrator"}</div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Admin Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-slate-900/80 border-r border-slate-800 flex flex-col justify-between p-4">
          <div className="space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: Activity },
              { id: "news", label: "News & Stories", icon: FileText },
              { id: "teams", label: "Teams Management", icon: Shield },
              { id: "players", label: "Players Management", icon: Users },
              { id: "transfers", label: "Transfer Centre", icon: ArrowRightLeft },
              { id: "competitions", label: "Competitions & Leagues", icon: Trophy },
              { id: "matches", label: "Fixtures & Results", icon: Calendar },
              { id: "announcements", label: "Announcements", icon: AlertCircle },
              { id: "settings", label: "Site Settings", icon: Settings },
              { id: "users", label: "Staff & Roles", icon: UserCheck },
              { id: "audit", label: "Audit Logs", icon: CheckSquare },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => switchTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${
                    tab === item.id
                      ? "bg-[#14532D] text-[#F5C542] shadow-sm"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            <div>Connected Database: <span className="text-emerald-400">PostgreSQL</span></div>
            <div>Timezone: <span className="text-slate-400">Africa/Kampala</span></div>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {tab === "dashboard" && (
            <AdminDashboard
              data={dashboard}
              onSwitchTab={switchTab}
              onNewNews={() => { setModalItem({}); setActiveModal("news"); }}
              onNewTeam={() => { setModalItem({}); setActiveModal("team"); }}
              onNewPlayer={() => { setModalItem({}); setActiveModal("player"); }}
              onNewTransfer={() => { setModalItem({}); setActiveModal("transfer"); }}
            />
          )}

          {tab === "news" && (
            <AdminNews
              news={news}
              onRefresh={loadNews}
              onNew={() => { setModalItem({}); setActiveModal("news"); }}
              onEdit={(item: any) => { setModalItem(item); setActiveModal("news"); }}
              showToast={showToast}
            />
          )}

          {tab === "teams" && (
            <AdminTeams
              teams={teams}
              onRefresh={loadTeams}
              onNew={() => { setModalItem({}); setActiveModal("team"); }}
              onEdit={(item: any) => { setModalItem(item); setActiveModal("team"); }}
              showToast={showToast}
            />
          )}

          {tab === "players" && (
            <AdminPlayers
              players={players}
              teams={teams}
              onRefresh={loadPlayers}
              onNew={() => { setModalItem({}); setActiveModal("player"); }}
              onEdit={(item: any) => { setModalItem(item); setActiveModal("player"); }}
              showToast={showToast}
            />
          )}

          {tab === "transfers" && (
            <AdminTransfers
              transfers={transfers}
              players={players}
              teams={teams}
              onRefresh={loadTransfers}
              onNew={() => { setModalItem({}); setActiveModal("transfer"); }}
              showToast={showToast}
            />
          )}

          {tab === "competitions" && (
            <AdminCompetitions
              competitions={competitions}
              onRefresh={loadCompetitions}
              onNew={() => { setModalItem({}); setActiveModal("competition"); }}
              showToast={showToast}
            />
          )}

          {tab === "matches" && (
            <AdminMatches
              matches={matches}
              teams={teams}
              competitions={competitions}
              onRefresh={loadMatches}
              onNew={() => { setModalItem({}); setActiveModal("match"); }}
              onRecordResult={(m: any) => { setModalItem(m); setActiveModal("result"); }}
              showToast={showToast}
            />
          )}

          {tab === "announcements" && (
            <AdminAnnouncements
              announcements={announcements}
              onRefresh={loadAnnouncements}
              onNew={() => { setModalItem({}); setActiveModal("announcement"); }}
              showToast={showToast}
            />
          )}

          {tab === "settings" && (
            <AdminSettings
              settings={settings}
              onRefresh={loadSettings}
              showToast={showToast}
            />
          )}

          {tab === "users" && (
            <AdminUsers
              users={staffUsers}
              onRefresh={loadUsers}
              onNew={() => { setModalItem({}); setActiveModal("user"); }}
              showToast={showToast}
            />
          )}

          {tab === "audit" && (
            <AdminAudit logs={auditLogs} onRefresh={loadAudit} />
          )}
        </main>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GLOBAL MODALS */}
      {/* ------------------------------------------------------------- */}
      {activeModal === "news" && (
        <NewsModal
          item={modalItem}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); loadNews(); showToast("Article saved successfully."); }}
        />
      )}

      {activeModal === "team" && (
        <TeamModal
          item={modalItem}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); loadTeams(); showToast("Team registered successfully."); }}
        />
      )}

      {activeModal === "player" && (
        <PlayerModal
          item={modalItem}
          teams={teams}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); loadPlayers(); showToast("Player profile saved."); }}
        />
      )}

      {activeModal === "transfer" && (
        <TransferModal
          item={modalItem}
          players={players}
          teams={teams}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); loadTransfers(); showToast("Transfer record saved."); }}
        />
      )}

      {activeModal === "match" && (
        <MatchModal
          item={modalItem}
          teams={teams}
          competitions={competitions}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); loadMatches(); showToast("Fixture scheduled."); }}
        />
      )}

      {activeModal === "result" && (
        <ResultModal
          match={modalItem}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); loadMatches(); showToast("Match result published and league standings updated!"); }}
        />
      )}

      {activeModal === "competition" && (
        <CompetitionModal
          item={modalItem}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); loadCompetitions(); showToast("Competition created."); }}
        />
      )}

      {activeModal === "announcement" && (
        <AnnouncementModal
          item={modalItem}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); loadAnnouncements(); showToast("Announcement published."); }}
        />
      )}

      {activeModal === "user" && (
        <UserModal
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); loadUsers(); showToast("Staff user created."); }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN DASHBOARD
// ----------------------------------------------------------------------
function AdminDashboard({ data, onSwitchTab, onNewNews, onNewTeam, onNewPlayer, onNewTransfer }: any) {
  if (!data) return null;
  const { counts, recentTransfers, recentAudit } = data;

  const statCards = [
    { label: "Registered Teams", value: counts.teams, tab: "teams", color: "text-emerald-400" },
    { label: "Registered Players", value: counts.players, tab: "players", color: "text-emerald-400" },
    { label: "Published Articles", value: counts.publishedNews, tab: "news", color: "text-[#F5C542]" },
    { label: "Pending Transfers", value: counts.pendingTransfers, tab: "transfers", color: "text-amber-400" },
    { label: "Upcoming Fixtures", value: counts.upcomingFixtures, tab: "matches", color: "text-blue-400" },
    { label: "Active Leagues", value: counts.activeLeagues, tab: "competitions", color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider text-white">System Dashboard</h1>
        <p className="text-xs text-slate-400 mt-1">
          Real-time summary of provincial football operations, team rosters, and editorial workflows.
        </p>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={onNewNews}
          className="px-4 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
        >
          <Plus className="w-3.5 h-3.5" /> Publish News Story
        </button>
        <button
          onClick={onNewTeam}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition"
        >
          <Plus className="w-3.5 h-3.5 text-[#F5C542]" /> Register Team
        </button>
        <button
          onClick={onNewPlayer}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition"
        >
          <Plus className="w-3.5 h-3.5 text-[#F5C542]" /> Register Player
        </button>
        <button
          onClick={onNewTransfer}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition"
        >
          <Plus className="w-3.5 h-3.5 text-[#F5C542]" /> Record Transfer
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((c, i) => (
          <div
            key={i}
            onClick={() => onSwitchTab(c.tab)}
            className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition shadow-sm"
          >
            <span className="text-[11px] font-bold text-slate-400 block uppercase">{c.label}</span>
            <span className={`text-2xl font-black mt-1 block ${c.color}`}>{c.value}</span>
          </div>
        ))}
      </div>

      {/* Two-column layout: Recent Transfers & Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transfers Activity */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-[#F5C542]" /> Recent Player Transfers
            </h3>
            <button onClick={() => onSwitchTab("transfers")} className="text-xs text-[#F5C542] hover:underline">
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-800 text-xs">
            {recentTransfers?.map((t: any) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">{t.player_name}</span>
                  <span className="text-[11px] text-slate-400">
                    {t.from_team || "Free Agent"} → <strong className="text-emerald-400">{t.to_team || "Released"}</strong>
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  t.status === "published" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-amber-950 text-amber-300"
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Administrative Audit Log Feed */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" /> Administrative Audit Trail
            </h3>
            <button onClick={() => onSwitchTab("audit")} className="text-xs text-[#F5C542] hover:underline">
              Full Logs
            </button>
          </div>
          <div className="divide-y divide-slate-800 text-xs">
            {recentAudit?.map((log: any) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-mono text-emerald-300 font-bold">{log.action}</span>
                  <span className="text-[11px] text-slate-400 block">{log.user_email || "System"} • {log.entity}</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(log.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN NEWS MANAGEMENT
// ----------------------------------------------------------------------
function AdminNews({ news, onRefresh, onNew, onEdit, showToast }: any) {
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    const res = await fetch(`${API}/news/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Article deleted.");
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">News & Editorial Articles</h1>
          <p className="text-xs text-slate-400 mt-1">Manage public articles, drafts, scheduled posts, and breaking alerts.</p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-3.5 h-3.5" /> Create Article
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Category</th>
              <th className="p-3">Status</th>
              <th className="p-3">Author</th>
              <th className="p-3">Published</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {news.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-800/50">
                <td className="p-3 font-bold text-white max-w-xs truncate">{item.title}</td>
                <td className="p-3 text-slate-400">{item.category_name || "General"}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    item.status === "published" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                    item.status === "draft" ? "bg-slate-800 text-slate-400" : "bg-amber-950 text-amber-300"
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-3 text-slate-400">{item.author_name}</td>
                <td className="p-3 text-slate-400">{item.published_at ? new Date(item.published_at).toLocaleDateString("en-GB") : "-"}</td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => onEdit(item)} className="p-1 hover:text-[#F5C542]"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1 hover:text-red-400"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN TEAMS MANAGEMENT
// ----------------------------------------------------------------------
function AdminTeams({ teams, onRefresh, onNew, onEdit, showToast }: any) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">Registered Football Teams</h1>
          <p className="text-xs text-slate-400 mt-1">Official club registries across Kapchorwa, Bukwo, and Kween.</p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-3.5 h-3.5" /> Register Club
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((t: any) => (
          <div key={t.id} className="bg-slate-900 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-mono text-[10px] text-[#F5C542] font-bold uppercase">{t.abbreviation || "FC"}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 font-bold uppercase">{t.status}</span>
              </div>
              <h3 className="text-base font-black text-white mt-2">{t.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t.location} • {t.home_ground}</p>
              <div className="mt-3 text-xs text-slate-500">
                Manager: <strong className="text-slate-300">{t.coach || "Not Assigned"}</strong>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">{t.squad_size || 0} registered players</span>
              <button
                onClick={() => onEdit(t)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[#F5C542] rounded font-bold text-xs"
              >
                Edit Club
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN PLAYERS MANAGEMENT
// ----------------------------------------------------------------------
function AdminPlayers({ players, teams, onRefresh, onNew, onEdit, showToast }: any) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">Registered Players</h1>
          <p className="text-xs text-slate-400 mt-1">Official provincial roster with verified statistics and club affiliations.</p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-3.5 h-3.5" /> Add Player
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Player Name</th>
              <th className="p-3">Position</th>
              <th className="p-3">Current Club</th>
              <th className="p-3">Apps</th>
              <th className="p-3">Goals</th>
              <th className="p-3">Assists</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {players.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-800/50">
                <td className="p-3 font-bold text-[#F5C542]">{p.squad_number || "-"}</td>
                <td className="p-3 font-bold text-white">{p.full_name}</td>
                <td className="p-3 text-slate-400">{p.position}</td>
                <td className="p-3 font-medium text-emerald-400">{p.team_name || "Unattached"}</td>
                <td className="p-3">{p.appearances || 0}</td>
                <td className="p-3">{p.goals || 0}</td>
                <td className="p-3">{p.assists || 0}</td>
                <td className="p-3 text-right">
                  <button onClick={() => onEdit(p)} className="p-1 hover:text-[#F5C542]"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN TRANSFER MANAGEMENT (WITH VERIFY & PUBLISH WORKFLOW)
// ----------------------------------------------------------------------
function AdminTransfers({ transfers, onRefresh, onNew, showToast }: any) {
  const handleVerify = async (id: string, decision: string) => {
    const res = await fetch(`${API}/transfers/${id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (res.ok) {
      showToast(`Transfer marked as ${decision}.`);
      onRefresh();
    }
  };

  const handlePublish = async (id: string) => {
    const res = await fetch(`${API}/transfers/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const d = await res.json();
    if (res.ok) {
      showToast("Transfer published and player squad atomically updated!");
      onRefresh();
    } else {
      showToast(d.error || "Publish failed", "error");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">Transfer Centre & Verification Hub</h1>
          <p className="text-xs text-slate-400 mt-1">Review pending player moves, verify official clearance, and atomically publish to public site.</p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-3.5 h-3.5" /> Record Proposed Transfer
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th className="p-3">Player</th>
              <th className="p-3">From</th>
              <th className="p-3">To</th>
              <th className="p-3">Type</th>
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Workflow Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {transfers.map((t: any) => (
              <tr key={t.id} className="hover:bg-slate-800/50">
                <td className="p-3 font-bold text-white">{t.player_name}</td>
                <td className="p-3 text-slate-400">{t.from_team || "Free Agent"}</td>
                <td className="p-3 font-semibold text-emerald-400">{t.to_team || "Released"}</td>
                <td className="p-3 text-slate-400 uppercase text-[10px]">{t.transfer_type.replace(/_/g, " ")}</td>
                <td className="p-3 text-slate-500">{new Date(t.announced_on).toLocaleDateString("en-GB")}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    t.status === "published" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                    t.status === "confirmed" ? "bg-blue-950 text-blue-300 border border-blue-800" : "bg-amber-950 text-amber-300"
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-3 text-right space-x-2">
                  {t.status === "draft" || t.status === "pending" ? (
                    <>
                      <button
                        onClick={() => handleVerify(t.id, "confirmed")}
                        className="px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-[10px] font-bold"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleVerify(t.id, "rejected")}
                        className="px-2.5 py-1 bg-red-950 hover:bg-red-900 text-red-300 rounded text-[10px] font-bold"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}

                  {t.status === "confirmed" && (
                    <button
                      onClick={() => handlePublish(t.id)}
                      className="px-3 py-1 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] rounded text-[10px] font-black uppercase tracking-wider"
                    >
                      Publish to Web
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN COMPETITIONS MANAGEMENT
// ----------------------------------------------------------------------
function AdminCompetitions({ competitions, onRefresh, onNew, showToast }: any) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">Competitions & Leagues</h1>
          <p className="text-xs text-slate-400 mt-1">Manage leagues, tournament editions, seasons, and tie-break points rules.</p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-3.5 h-3.5" /> Create Competition
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {competitions.map((c: any) => (
          <div key={c.id} className="bg-slate-900 rounded-xl p-5 border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] uppercase font-bold text-[#F5C542]">{c.competition_type}</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">{c.status}</span>
            </div>
            <h3 className="text-lg font-black text-white mt-2">{c.name}</h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Points: W={c.points_win}, D={c.points_draw}, L={c.points_loss}</span>
              <span className="font-semibold text-slate-300">{c.seasons_count || 1} seasons</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN MATCHES & RESULT ENTRY
// ----------------------------------------------------------------------
function AdminMatches({ matches, onRefresh, onNew, onRecordResult, showToast }: any) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">Fixtures & Match Results</h1>
          <p className="text-xs text-slate-400 mt-1">Schedule regional fixtures, record scores, and publish results to dynamically recalculate standings.</p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-3.5 h-3.5" /> Schedule Fixture
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th className="p-3">Ref</th>
              <th className="p-3">Match</th>
              <th className="p-3">Competition</th>
              <th className="p-3">Kickoff</th>
              <th className="p-3">Score</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {matches.map((m: any) => (
              <tr key={m.id} className="hover:bg-slate-800/50">
                <td className="p-3 font-mono text-[10px] text-slate-400">{m.reference}</td>
                <td className="p-3 font-bold text-white">{m.home_team} vs {m.away_team}</td>
                <td className="p-3 text-slate-400">{m.competition_name}</td>
                <td className="p-3 text-slate-500">{new Date(m.kickoff_at).toLocaleDateString("en-GB")}</td>
                <td className="p-3">
                  {m.result_state === "published" ? (
                    <span className="font-black text-[#F5C542]">{m.home_score} - {m.away_score}</span>
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    m.status === "completed" ? "bg-emerald-950 text-emerald-300" : "bg-slate-800 text-slate-400"
                  }`}>
                    {m.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => onRecordResult(m)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[#F5C542] rounded font-bold text-xs"
                  >
                    Enter Result
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN ANNOUNCEMENTS
// ----------------------------------------------------------------------
function AdminAnnouncements({ announcements, onRefresh, onNew, showToast }: any) {
  const handleDelete = async (id: string) => {
    if (!confirm("Delete announcement?")) return;
    const res = await fetch(`${API}/announcements/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Announcement deleted.");
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">Official Notices & Announcements</h1>
          <p className="text-xs text-slate-400 mt-1">Publish notices, fixture alterations, and tournament alerts.</p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-3.5 h-3.5" /> New Announcement
        </button>
      </div>

      <div className="space-y-3">
        {announcements.map((a: any) => (
          <div key={a.id} className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm">{a.title}</h4>
                {a.is_urgent && (
                  <span className="bg-red-950 text-red-300 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-red-800">
                    Urgent Banner
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">{a.body}</p>
            </div>
            <button onClick={() => handleDelete(a.id)} className="p-1 hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN SETTINGS
// ----------------------------------------------------------------------
function AdminSettings({ settings, onRefresh, showToast }: any) {
  const [form, setForm] = useState<any>({ ...settings });

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      showToast("Website settings and brand configuration updated.");
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider text-white">Website & Brand Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Configure brand taglines, contact channels, breaking news strip, and public portal metadata.</p>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Platform Title</label>
            <input
              type="text"
              value={form.site_name || ""}
              onChange={(e) => setForm({ ...form, site_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Brand Tagline</label>
            <input
              type="text"
              value={form.tagline || ""}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-300 block mb-1 uppercase">About Platform Summary</label>
          <textarea
            rows={3}
            value={form.about || ""}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
          />
        </div>

        {/* Breaking Banner Switch */}
        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#F5C542] uppercase">Public Breaking News Strip</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.breaking_banner_enabled === "true"}
                onChange={(e) => setForm({ ...form, breaking_banner_enabled: e.target.checked ? "true" : "false" })}
                className="w-4 h-4 rounded text-emerald-600"
              />
              <span className="text-xs text-white">Enable on Public Homepage</span>
            </label>
          </div>
          <input
            type="text"
            value={form.breaking_banner_text || ""}
            onChange={(e) => setForm({ ...form, breaking_banner_text: e.target.value })}
            placeholder="Banner announcement message..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
          />
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] font-black rounded-lg text-xs uppercase tracking-wider transition"
        >
          Save Site Settings
        </button>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN STAFF & ROLES
// ----------------------------------------------------------------------
function AdminUsers({ users, onRefresh, onNew, showToast }: any) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">Staff & Access Permissions</h1>
          <p className="text-xs text-slate-400 mt-1">Manage editorial accounts, sports data managers, and role permissions.</p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-3.5 h-3.5" /> Create Staff Account
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th className="p-3">Staff Name</th>
              <th className="p-3">Email Address</th>
              <th className="p-3">Assigned Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Last Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-slate-800/50">
                <td className="p-3 font-bold text-white">{u.name}</td>
                <td className="p-3 text-slate-400">{u.email}</td>
                <td className="p-3 text-[#F5C542] font-semibold">{u.roles?.[0] || "Staff"}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 font-bold uppercase">
                    Active
                  </span>
                </td>
                <td className="p-3 text-slate-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleString("en-GB") : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN AUDIT LOGS
// ----------------------------------------------------------------------
function AdminAudit({ logs, onRefresh }: any) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">Administrative Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-1">Immutable security log of all publications, logins, score modifications, and team changes.</p>
        </div>
        <button onClick={onRefresh} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Action</th>
              <th className="p-3">Staff User</th>
              <th className="p-3">Entity Affected</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {logs.map((l: any) => (
              <tr key={l.id} className="hover:bg-slate-800/50">
                <td className="p-3 text-slate-500 font-mono text-[11px]">
                  {new Date(l.created_at).toLocaleString("en-GB")}
                </td>
                <td className="p-3 font-mono font-bold text-emerald-400">{l.action}</td>
                <td className="p-3 text-slate-300">{l.user_email || "System"}</td>
                <td className="p-3 text-slate-400">{l.entity || "-"}</td>
                <td className="p-3 text-slate-500 font-mono text-[11px] truncate max-w-xs">
                  {l.details ? JSON.stringify(l.details) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// FORM MODAL COMPONENTS
// ----------------------------------------------------------------------

function NewsModal({ item, onClose, onSuccess }: any) {
  const [title, setTitle] = useState(item?.title || "");
  const [summary, setSummary] = useState(item?.summary || "");
  const [body, setBody] = useState(item?.body || "");
  const [featuredImage, setFeaturedImage] = useState(item?.featured_image || "");
  const [authorName, setAuthorName] = useState(item?.author_name || "");
  const [status, setStatus] = useState(item?.status || "published");
  const [isBreaking, setIsBreaking] = useState(item?.is_breaking || false);
  const [isFeatured, setIsFeatured] = useState(item?.is_featured || false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const method = item?.id ? "PUT" : "POST";
    const url = item?.id ? `${API}/news/${item.id}` : `${API}/news`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, summary, body, featured_image: featuredImage,
        author_name: authorName, status, is_breaking: isBreaking, is_featured: isFeatured,
      }),
    });
    setSaving(false);
    if (res.ok) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto text-xs">
        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4">
          {item?.id ? "Edit News Story" : "Create News Article"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Headline</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Article Summary</label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Full Story Content</label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Featured Image URL</label>
              <input
                type="text"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Publication Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
              >
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <label className="flex items-center gap-2 text-white">
              <input type="checkbox" checked={isBreaking} onChange={(e) => setIsBreaking(e.target.checked)} />
              <span>Mark as Breaking News</span>
            </label>
            <label className="flex items-center gap-2 text-white">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              <span>Homepage Hero Feature</span>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] font-black rounded uppercase">
              {saving ? "Saving..." : "Save Story"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeamModal({ item, onClose, onSuccess }: any) {
  const [name, setName] = useState(item?.name || "");
  const [shortName, setShortName] = useState(item?.short_name || "");
  const [abbreviation, setAbbreviation] = useState(item?.abbreviation || "");
  const [location, setLocation] = useState(item?.location || "");
  const [homeGround, setHomeGround] = useState(item?.home_ground || "");
  const [coach, setCoach] = useState(item?.coach || "");
  const [colors, setColors] = useState(item?.colors || "");
  const [description, setDescription] = useState(item?.description || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const method = item?.id ? "PUT" : "POST";
    const url = item?.id ? `${API}/teams/${item.id}` : `${API}/teams`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, short_name: shortName, abbreviation, location,
        home_ground: homeGround, coach, colors, description, status: "active",
      }),
    });
    setSaving(false);
    if (res.ok) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto text-xs">
        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4">
          {item?.id ? "Edit Team" : "Register Football Team"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Official Team Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Short Name</label>
              <input type="text" value={shortName} onChange={(e) => setShortName(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Abbreviation</label>
              <input type="text" value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} placeholder="e.g. KPC" className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Location / District</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kapchorwa" className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Home Stadium</label>
              <input type="text" value={homeGround} onChange={(e) => setHomeGround(e.target.value)} placeholder="e.g. Boma Grounds" className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Head Coach / Manager</label>
              <input type="text" value={coach} onChange={(e) => setCoach(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Club Colors</label>
              <input type="text" value={colors} onChange={(e) => setColors(e.target.value)} placeholder="e.g. Forest Green & Gold" className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Club History & Overview</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] font-black rounded uppercase">
              {saving ? "Saving..." : "Save Club"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlayerModal({ item, teams, onClose, onSuccess }: any) {
  const [fullName, setFullName] = useState(item?.full_name || "");
  const [position, setPosition] = useState(item?.position || "Forward");
  const [squadNumber, setSquadNumber] = useState(item?.squad_number || "");
  const [currentTeamId, setCurrentTeamId] = useState(item?.current_team_id || "");
  const [nationality, setNationality] = useState(item?.nationality || "Uganda");
  const [appearances, setAppearances] = useState(item?.appearances || 0);
  const [goals, setGoals] = useState(item?.goals || 0);
  const [assists, setAssists] = useState(item?.assists || 0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const method = item?.id ? "PUT" : "POST";
    const url = item?.id ? `${API}/players/${item.id}` : `${API}/players`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName, position, squad_number: squadNumber,
        current_team_id: currentTeamId || null, nationality,
        appearances, goals, assists, status: "active",
      }),
    });
    setSaving(false);
    if (res.ok) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto text-xs">
        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4">
          {item?.id ? "Edit Player Profile" : "Register Footballer"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Full Name</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Position</label>
              <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white">
                <option value="Goalkeeper">Goalkeeper</option>
                <option value="Defender">Defender</option>
                <option value="Midfielder">Midfielder</option>
                <option value="Forward">Forward</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Squad Number</label>
              <input type="number" min="1" max="99" value={squadNumber} onChange={(e) => setSquadNumber(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Current Assigned Club</label>
            <select value={currentTeamId} onChange={(e) => setCurrentTeamId(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white">
              <option value="">-- Unattached / Free Agent --</option>
              {teams.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Apps</label>
              <input type="number" value={appearances} onChange={(e) => setAppearances(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Goals</label>
              <input type="number" value={goals} onChange={(e) => setGoals(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Assists</label>
              <input type="number" value={assists} onChange={(e) => setAssists(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] font-black rounded uppercase">
              {saving ? "Saving..." : "Save Player"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransferModal({ players, teams, onClose, onSuccess }: any) {
  const [playerId, setPlayerId] = useState(players[0]?.id || "");
  const [fromTeamId, setFromTeamId] = useState("");
  const [toTeamId, setToTeamId] = useState("");
  const [transferType, setTransferType] = useState("permanent_signing");
  const [windowLabel, setWindowLabel] = useState("2026/2027 Season");
  const [feeTerms, setFeeTerms] = useState("Undisclosed");
  const [announcementText, setAnnouncementText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`${API}/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: playerId, from_team_id: fromTeamId || null,
        to_team_id: toTeamId || null, transfer_type: transferType,
        window_label: windowLabel, fee_terms: feeTerms,
        announcement_text: announcementText, status: "pending",
      }),
    });
    setSaving(false);
    if (res.ok) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-lg w-full p-6 text-xs">
        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4">Record Transfer Proposal</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Select Player</label>
            <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} required className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white">
              {players.map((p: any) => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.team_name || "Free Agent"})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">From Club</label>
              <select value={fromTeamId} onChange={(e) => setFromTeamId(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white">
                <option value="">-- Free Agent / Academy --</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">To Club</label>
              <select value={toTeamId} onChange={(e) => setToTeamId(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white">
                <option value="">-- Released / None --</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Transfer Type</label>
              <select value={transferType} onChange={(e) => setTransferType(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white">
                <option value="permanent_signing">Permanent Signing</option>
                <option value="loan_signing">Loan Signing</option>
                <option value="departure">Player Departure</option>
                <option value="free_agent_signing">Free Agent Signing</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Fee / Terms</label>
              <input type="text" value={feeTerms} onChange={(e) => setFeeTerms(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Official Announcement Note</label>
            <textarea rows={2} value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} placeholder="Official press release summary..." className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] font-black rounded uppercase">
              {saving ? "Saving..." : "Submit for Verification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MatchModal({ teams, competitions, onClose, onSuccess }: any) {
  const [seasonId, setSeasonId] = useState(competitions[0]?.seasons?.[0]?.id || "");
  const [homeTeamId, setHomeTeamId] = useState(teams[0]?.id || "");
  const [awayTeamId, setAwayTeamId] = useState(teams[1]?.id || "");
  const [kickoffAt, setKickoffAt] = useState("");
  const [venue, setVenue] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-fill season if not yet selected
  useEffect(() => {
    if (!seasonId && competitions.length > 0) {
      fetch(`${API}/competitions/${competitions[0].id}`).then(r => r.json()).then(d => {
        if (d.seasons?.[0]) setSeasonId(d.seasons[0].id);
      });
    }
  }, [competitions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (homeTeamId === awayTeamId) {
      alert("Home team and away team cannot be the same!");
      return;
    }
    setSaving(true);
    const res = await fetch(`${API}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        season_id: seasonId, home_team_id: homeTeamId,
        away_team_id: awayTeamId, kickoff_at: kickoffAt || new Date().toISOString(),
        venue,
      }),
    });
    setSaving(false);
    if (res.ok) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-lg w-full p-6 text-xs">
        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4">Schedule Fixture</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Home Team</label>
              <select value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)} required className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white">
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Away Team</label>
              <select value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)} required className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white">
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Kickoff Date & Time</label>
              <input type="datetime-local" required value={kickoffAt} onChange={(e) => setKickoffAt(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Venue / Stadium</label>
              <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Kapchorwa Boma Grounds" className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] font-black rounded uppercase">
              {saving ? "Scheduling..." : "Schedule Match"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResultModal({ match, onClose, onSuccess }: any) {
  const [homeScore, setHomeScore] = useState(match?.home_score ?? 0);
  const [awayScore, setAwayScore] = useState(match?.away_score ?? 0);
  const [report, setReport] = useState(match?.report || "");
  const [publish, setPublish] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`${API}/matches/${match.id}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore),
        report,
        publish,
      }),
    });
    setSaving(false);
    if (res.ok) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-lg w-full p-6 text-xs">
        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Record Match Scoreline</h3>
        <p className="text-slate-400 mb-4">{match.home_team} vs {match.away_team}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-6 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <div>
              <label className="font-bold text-white block mb-2">{match.home_team}</label>
              <input
                type="number"
                min="0"
                max="99"
                required
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-20 px-3 py-2 text-2xl font-black text-center bg-slate-900 border border-slate-700 rounded text-[#F5C542] mx-auto block"
              />
            </div>
            <div>
              <label className="font-bold text-white block mb-2">{match.away_team}</label>
              <input
                type="number"
                min="0"
                max="99"
                required
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-20 px-3 py-2 text-2xl font-black text-center bg-slate-900 border border-slate-700 rounded text-[#F5C542] mx-auto block"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Match Summary & Report</label>
            <textarea
              rows={3}
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Highlight key goals, cards, and match notes..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
            />
          </div>

          <label className="flex items-center gap-2 text-white">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
            <span className="font-semibold">Publish Result & Recalculate Standings Immediately</span>
          </label>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] font-black rounded uppercase">
              {saving ? "Publishing..." : "Finalize & Update Standings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CompetitionModal({ onClose, onSuccess }: any) {
  const [name, setName] = useState("");
  const [type, setType] = useState("league");
  const [seasonLabel, setSeasonLabel] = useState("2026/2027");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`${API}/competitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, competition_type: type, season_label: seasonLabel, description, status: "active",
      }),
    });
    setSaving(false);
    if (res.ok) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-lg w-full p-6 text-xs">
        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4">Create Competition</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Competition Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sebei District Cup" className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Format</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white">
                <option value="league">League (Round-Robin)</option>
                <option value="knockout">Knockout Tournament</option>
                <option value="group_knockout">Group Stage & Knockout</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1 uppercase">Initial Season</label>
              <input type="text" value={seasonLabel} onChange={(e) => setSeasonLabel(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Rules & Description</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] font-black rounded uppercase">
              {saving ? "Creating..." : "Create Competition"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AnnouncementModal({ onClose, onSuccess }: any) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`${API}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, is_urgent: isUrgent, status: "published" }),
    });
    setSaving(false);
    if (res.ok) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-lg w-full p-6 text-xs">
        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4">Publish Announcement</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Notice Title</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Notice Body</label>
            <textarea rows={4} required value={body} onChange={(e) => setBody(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <label className="flex items-center gap-2 text-white">
            <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} />
            <span className="font-semibold text-red-300">Mark as Urgent (Shows in public ticker)</span>
          </label>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] font-black rounded uppercase">
              {saving ? "Publishing..." : "Publish Circular"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserModal({ onClose, onSuccess }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Editor");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`${API}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    setSaving(false);
    if (res.ok) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-md w-full p-6 text-xs">
        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4">Create Staff Account</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Full Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Initial Password (min 10 chars with numbers)</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1 uppercase">Assigned Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white">
              <option value="Administrator">Administrator</option>
              <option value="Editor">Editor</option>
              <option value="Sports Data Manager">Sports Data Manager</option>
              <option value="Transfer Manager">Transfer Manager</option>
              <option value="Read-Only Staff">Read-Only Staff</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] font-black rounded uppercase">
              {saving ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
