import React, { useState, useEffect } from "react";
import {
  Trophy, Shield, Users, ArrowRightLeft, Calendar, Flame,
  Search, Menu, X, Share2, MapPin, ChevronRight, CheckCircle2,
  Clock, AlertCircle, ExternalLink, Info, Filter
} from "lucide-react";

// API helper
const API_BASE = "/api";

export default function App() {
  const [view, setView] = useState<string>("home");
  const [viewParam, setViewParam] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);

  // Global public state
  const [settings, setSettings] = useState<any>({});
  const [homeData, setHomeData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active sub-page data
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedComp, setSelectedComp] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [matchFilter, setMatchFilter] = useState("all");
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Filters
  const [newsCategoryFilter, setNewsCategoryFilter] = useState("");
  const [transferFilter, setTransferFilter] = useState("");

  // Load initial global data
  useEffect(() => {
    fetchSettingsAndHome();
  }, []);

  const fetchSettingsAndHome = async () => {
    try {
      setLoading(true);
      const [resSettings, resHome, resCats] = await Promise.all([
        fetch(`${API_BASE}/settings`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/home`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/categories`).then(r => r.json()).catch(() => []),
      ]);
      setSettings(resSettings || {});
      setHomeData(resHome || {});
      setCategories(resCats || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Navigate helper
  const navigate = (newView: string, param: string | null = null) => {
    setView(newView);
    setViewParam(param);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (newView === "news") loadNews(param || "");
    if (newView === "teams") loadTeams();
    if (newView === "players") loadPlayers();
    if (newView === "transfers") loadTransfers();
    if (newView === "competitions") loadCompetitions(param);
    if (newView === "matches") loadMatches();
    if (newView === "announcements") loadAnnouncements();
  };

  const loadNews = async (cat = "") => {
    try {
      const url = cat ? `${API_BASE}/news?category=${cat}` : `${API_BASE}/news`;
      const data = await fetch(url).then(r => r.json());
      setNewsArticles(data.items || []);
    } catch (e) { console.error(e); }
  };

  const loadTeams = async () => {
    try {
      const data = await fetch(`${API_BASE}/teams`).then(r => r.json());
      setTeams(data.items || []);
    } catch (e) { console.error(e); }
  };

  const loadTeamDetail = async (slug: string) => {
    try {
      const data = await fetch(`${API_BASE}/teams/${slug}`).then(r => r.json());
      setSelectedTeam(data);
      setView("team-detail");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { console.error(e); }
  };

  const loadPlayers = async () => {
    try {
      const data = await fetch(`${API_BASE}/players`).then(r => r.json());
      setPlayers(data.items || []);
    } catch (e) { console.error(e); }
  };

  const loadPlayerDetail = async (slug: string) => {
    try {
      const data = await fetch(`${API_BASE}/players/${slug}`).then(r => r.json());
      setSelectedPlayer(data);
      setView("player-detail");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { console.error(e); }
  };

  const loadTransfers = async () => {
    try {
      const data = await fetch(`${API_BASE}/transfers`).then(r => r.json());
      setTransfers(data.items || []);
    } catch (e) { console.error(e); }
  };

  const loadCompetitions = async (compSlug: string | null = null) => {
    try {
      const data = await fetch(`${API_BASE}/competitions`).then(r => r.json());
      setCompetitions(data || []);
      const slug = compSlug || data[0]?.slug;
      if (slug) {
        const detail = await fetch(`${API_BASE}/competitions/${slug}`).then(r => r.json());
        setSelectedComp(detail);
      }
    } catch (e) { console.error(e); }
  };

  const loadMatches = async (filter = "all") => {
    try {
      let url = `${API_BASE}/matches`;
      if (filter !== "all") url += `?filter=${filter}`;
      const data = await fetch(url).then(r => r.json());
      setMatches(data.items || []);
    } catch (e) { console.error(e); }
  };

  const loadMatchDetail = async (ref: string) => {
    try {
      const data = await fetch(`${API_BASE}/matches/${ref}`).then(r => r.json());
      setSelectedMatch(data);
      setView("match-detail");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { console.error(e); }
  };

  const loadArticleDetail = async (slug: string) => {
    try {
      const data = await fetch(`${API_BASE}/news/${slug}`).then(r => r.json());
      setSelectedArticle(data);
      setView("article-detail");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { console.error(e); }
  };

  const loadAnnouncements = async () => {
    try {
      const data = await fetch(`${API_BASE}/announcements`).then(r => r.json());
      setAnnouncements(data || []);
    } catch (e) { console.error(e); }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`).then(r => r.json());
      setSearchResults(res);
    } catch (err) { console.error(err); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatTime = (d: string | null) => {
    if (!d) return "";
    return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F5F4] text-[#17211B] font-sans">
      {/* 1. TOP BREAKING NEWS BANNER (Controlled by Admin Settings) */}
      {settings.breaking_banner_enabled === "true" && settings.breaking_banner_text && (
        <div className="bg-[#DC2626] text-white py-2 px-4 text-xs sm:text-sm font-semibold tracking-wide shadow-inner flex items-center justify-between">
          <div className="container mx-auto flex items-center gap-2">
            <span className="bg-white text-[#DC2626] px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Breaking
            </span>
            <p className="truncate">{settings.breaking_banner_text}</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, breaking_banner_enabled: "false" })}
            className="text-white/80 hover:text-white ml-2 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* 2. MAIN HEADER */}
      <header className="sticky top-0 z-40 bg-[#052E16] text-white shadow-xl border-b border-[#14532D]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo & Identity */}
          <div
            onClick={() => navigate("home")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center p-0.5 shadow-md border-2 border-[#F5C542] overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
              <img
                src={settings.site_logo || "/uploads/sebei_province_logo.jpg"}
                alt="Sebei Province Football"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => { (e.target as HTMLImageElement).src = "/uploads/sebei_province_logo.jpg"; }}
              />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black tracking-tight uppercase text-white group-hover:text-[#F5C542] transition-colors leading-none">
                Sebei Province <span className="text-[#F5C542]">Football</span>
              </div>
              <div className="text-[10px] text-emerald-300 font-medium tracking-wider uppercase mt-1">
                Kapchorwa • Bukwo • Kween
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-semibold text-emerald-100">
            {[
              { id: "home", label: "Home" },
              { id: "news", label: "News" },
              { id: "teams", label: "Teams" },
              { id: "players", label: "Players" },
              { id: "transfers", label: "Transfers" },
              { id: "competitions", label: "Competitions" },
              { id: "matches", label: "Fixtures & Results" },
              { id: "announcements", label: "Announcements" },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => navigate(link.id)}
                className={`px-3 py-2 rounded-md transition-all ${
                  view === link.id
                    ? "bg-[#14532D] text-[#F5C542] shadow-sm font-bold"
                    : "hover:bg-emerald-900/50 hover:text-white"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right Header Actions: Search & Admin Link */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-full hover:bg-emerald-900/60 text-emerald-200 hover:text-white transition"
              title="Search Sebei Football"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Link to Admin Console */}
            <a
              href="http://localhost:5174"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#14532D] hover:bg-[#1b6b3b] text-[#F5C542] text-xs font-bold border border-[#F5C542]/30 transition shadow-sm"
            >
              <Shield className="w-3.5 h-3.5" /> Staff Admin
            </a>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-emerald-900 text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#052E16] border-t border-emerald-900 px-4 pt-2 pb-5 space-y-1 shadow-2xl">
            {[
              { id: "home", label: "Home" },
              { id: "news", label: "News & Stories" },
              { id: "teams", label: "Teams Directory" },
              { id: "players", label: "Players Roster" },
              { id: "transfers", label: "Transfer Hub" },
              { id: "competitions", label: "Competitions & Leagues" },
              { id: "matches", label: "Fixtures & Results" },
              { id: "announcements", label: "Official Notices" },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => navigate(link.id)}
                className={`block w-full text-left px-3 py-2.5 rounded text-sm font-semibold ${
                  view === link.id ? "bg-[#14532D] text-[#F5C542]" : "text-emerald-100 hover:bg-emerald-900/50"
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 border-t border-emerald-900/60 mt-2">
              <a
                href="http://localhost:5174"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#14532D] text-[#F5C542] rounded font-bold text-xs"
              >
                <Shield className="w-4 h-4" /> Open Official Admin Console
              </a>
            </div>
          </div>
        )}
      </header>

      {/* 3. SEARCH MODAL OVERLAY */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-left border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-2 text-[#14532D] font-bold text-lg">
                <Search className="w-5 h-5" /> Search Sebei Football
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSearch} className="mt-4 flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teams, players, tournaments, match results, news..."
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#14532D] text-sm"
                autoFocus
              />
              <button
                type="submit"
                className="px-5 py-3 bg-[#14532D] hover:bg-[#052E16] text-[#F5C542] font-bold rounded-lg text-sm transition"
              >
                Search
              </button>
            </form>

            {searchResults && (
              <div className="mt-6 max-h-96 overflow-y-auto space-y-4 text-sm divide-y">
                {/* News matches */}
                {searchResults.news?.length > 0 && (
                  <div className="pt-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">News Articles</h4>
                    <div className="space-y-1.5">
                      {searchResults.news.map((n: any) => (
                        <div
                          key={n.slug}
                          onClick={() => { setSearchOpen(false); loadArticleDetail(n.slug); }}
                          className="p-2 hover:bg-slate-50 rounded cursor-pointer flex justify-between items-center"
                        >
                          <span className="font-semibold text-slate-800">{n.title}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Teams matches */}
                {searchResults.teams?.length > 0 && (
                  <div className="pt-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">Teams</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {searchResults.teams.map((t: any) => (
                        <div
                          key={t.slug}
                          onClick={() => { setSearchOpen(false); loadTeamDetail(t.slug); }}
                          className="p-2 hover:bg-slate-50 rounded cursor-pointer border flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4 text-[#14532D]" />
                          <span className="font-semibold">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Players matches */}
                {searchResults.players?.length > 0 && (
                  <div className="pt-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">Players</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {searchResults.players.map((p: any) => (
                        <div
                          key={p.slug}
                          onClick={() => { setSearchOpen(false); loadPlayerDetail(p.slug); }}
                          className="p-2 hover:bg-slate-50 rounded cursor-pointer border flex items-center justify-between"
                        >
                          <span className="font-semibold">{p.full_name}</span>
                          <span className="text-xs text-slate-400">{p.position}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(!searchResults.news?.length && !searchResults.teams?.length && !searchResults.players?.length) && (
                  <div className="py-6 text-center text-slate-400">
                    No results found for "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MAIN BODY ROUTING */}
      <main className="flex-1">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#14532D] border-t-transparent"></div>
            <p className="mt-3 text-sm text-slate-500 font-medium">Loading Sebei Football Platform...</p>
          </div>
        ) : (
          <>
            {view === "home" && (
              <HomeView
                data={homeData}
                navigate={navigate}
                onSelectArticle={loadArticleDetail}
                onSelectTeam={loadTeamDetail}
                onSelectMatch={loadMatchDetail}
              />
            )}
            {view === "news" && (
              <NewsView
                articles={newsArticles}
                categories={categories}
                activeCategory={newsCategoryFilter}
                onFilterCategory={(cat) => {
                  setNewsCategoryFilter(cat);
                  loadNews(cat);
                }}
                onSelectArticle={loadArticleDetail}
              />
            )}
            {view === "article-detail" && selectedArticle && (
              <ArticleDetailView
                article={selectedArticle}
                navigate={navigate}
                onSelectArticle={loadArticleDetail}
              />
            )}
            {view === "teams" && (
              <TeamsView
                teams={teams}
                onSelectTeam={loadTeamDetail}
              />
            )}
            {view === "team-detail" && selectedTeam && (
              <TeamDetailView
                team={selectedTeam}
                navigate={navigate}
                onSelectPlayer={loadPlayerDetail}
                onSelectMatch={loadMatchDetail}
              />
            )}
            {view === "players" && (
              <PlayersView
                players={players}
                onSelectPlayer={loadPlayerDetail}
              />
            )}
            {view === "player-detail" && selectedPlayer && (
              <PlayerDetailView
                player={selectedPlayer}
                navigate={navigate}
                onSelectTeam={loadTeamDetail}
              />
            )}
            {view === "transfers" && (
              <TransfersView
                transfers={transfers}
                navigate={navigate}
                onSelectPlayer={loadPlayerDetail}
                onSelectTeam={loadTeamDetail}
              />
            )}
            {view === "competitions" && (
              <CompetitionsView
                competitions={competitions}
                selectedComp={selectedComp}
                onSelectCompSlug={(slug) => loadCompetitions(slug)}
                onSelectTeam={loadTeamDetail}
                onSelectMatch={loadMatchDetail}
              />
            )}
            {view === "matches" && (
              <MatchesView
                matches={matches}
                filter={matchFilter}
                onFilterChange={(f) => {
                  setMatchFilter(f);
                  loadMatches(f);
                }}
                onSelectMatch={loadMatchDetail}
                onSelectTeam={loadTeamDetail}
              />
            )}
            {view === "match-detail" && selectedMatch && (
              <MatchDetailView
                match={selectedMatch}
                navigate={navigate}
                onSelectTeam={loadTeamDetail}
              />
            )}
            {view === "announcements" && (
              <AnnouncementsView
                announcements={announcements}
              />
            )}
          </>
        )}
      </main>

      {/* 5. FOOTER */}
      <footer className="bg-[#052E16] text-white border-t-4 border-[#F5C542] mt-16 pt-12 pb-8">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center p-0.5 border-2 border-[#F5C542] overflow-hidden shrink-0 shadow">
                <img
                  src={settings.site_logo || "/uploads/sebei_province_logo.jpg"}
                  alt="Sebei Province Football"
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/uploads/sebei_province_logo.jpg"; }}
                />
              </div>
              <span className="font-black text-lg tracking-wider uppercase text-white">
                Sebei Province <span className="text-[#F5C542]">Football</span>
              </span>
            </div>
            <p className="mt-3 text-xs text-emerald-200 leading-relaxed">
              {settings.about || "The central digital home for football news, clubs, transfers, tournaments and league standings in Sebei Province."}
            </p>
            <div className="mt-4 text-xs text-emerald-300 font-semibold">
              Region: Kapchorwa • Bukwo • Kween
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#F5C542] mb-3">Quick Links</h4>
            <ul className="space-y-2 text-xs text-emerald-100">
              <li><button onClick={() => navigate("news")} className="hover:text-white">Football News</button></li>
              <li><button onClick={() => navigate("competitions")} className="hover:text-white">Sebei Premier League</button></li>
              <li><button onClick={() => navigate("transfers")} className="hover:text-white">Transfer Centre</button></li>
              <li><button onClick={() => navigate("teams")} className="hover:text-white">Registered Teams</button></li>
              <li><button onClick={() => navigate("matches")} className="hover:text-white">Fixtures & Results</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#F5C542] mb-3">Tournaments</h4>
            <ul className="space-y-2 text-xs text-emerald-100">
              <li><span className="font-semibold text-white">Sebei Premier League</span> (Top Flight)</li>
              <li><span className="font-semibold text-white">Mount Elgon Championship Cup</span> (Knockout)</li>
              <li><span className="font-semibold text-white">Highlands Grassroots Gala</span> (Youth)</li>
              <li><button onClick={() => navigate("announcements")} className="text-[#F5C542] underline">Tournament Registration</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#F5C542] mb-3">Administration</h4>
            <p className="text-xs text-emerald-200 mb-3">
              Official content is managed securely by verified editorial staff and sports data administrators.
            </p>
            <a
              href="http://localhost:5174"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-[#14532D] hover:bg-[#1a6839] text-[#F5C542] text-xs font-bold border border-[#F5C542]/30 transition"
            >
              <Shield className="w-4 h-4" /> Secure Staff Portal
            </a>
          </div>
        </div>

        <div className="container mx-auto px-4 mt-8 pt-6 border-t border-emerald-900/80 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-400">
          <p>© {new Date().getFullYear()} Sebei Province Football. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-medium">Your Region. Your Teams. Your Football.</p>
        </div>
      </footer>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-VIEWS IMPLEMENTATION
// ----------------------------------------------------------------------

function HomeView({ data, navigate, onSelectArticle, onSelectTeam, onSelectMatch }: any) {
  if (!data) return null;
  const { featured, latest, transfers, fixtures, results, teams, standings, announcements } = data;

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#052E16] to-[#14532D] text-white pt-8 pb-12 shadow-lg border-b border-[#F5C542]/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Featured Main Story (7 cols) */}
            {featured ? (
              <div
                onClick={() => onSelectArticle(featured.slug)}
                className="lg:col-span-7 bg-[#052E16]/80 rounded-2xl overflow-hidden border border-emerald-700/50 shadow-2xl cursor-pointer group flex flex-col justify-between"
              >
                <div className="relative h-64 sm:h-80 bg-slate-800 overflow-hidden">
                  <img
                    src={featured.featured_image || "/uploads/sebei_team_lineup.jpg"}
                    alt={featured.title}
                    onError={(e) => { (e.target as HTMLImageElement).src = "/uploads/sebei_team_lineup.jpg"; }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#052E16] via-transparent to-black/30"></div>
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-[#F5C542] text-[#052E16] text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow">
                      {featured.category || "Top Story"}
                    </span>
                    {featured.is_breaking && (
                      <span className="bg-[#DC2626] text-white text-xs font-black uppercase px-2.5 py-1 rounded-full">
                        Breaking
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-xs text-emerald-300 font-medium mb-1">
                    {new Date(featured.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} • By {featured.author_name || "Sebei Sports Desk"}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#F5C542] transition-colors leading-tight">
                    {featured.title}
                  </h1>
                  <p className="mt-3 text-sm text-emerald-100 line-clamp-3 leading-relaxed">
                    {featured.summary}
                  </p>
                  <div className="mt-4 flex items-center text-xs font-bold text-[#F5C542] gap-1 group-hover:translate-x-1 transition-transform">
                    Read Full Story <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Quick Match Centre & Standings Preview (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Fixtures & Results mini widget */}
              <div className="bg-[#052E16]/90 rounded-2xl p-5 border border-emerald-700/50 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-800">
                  <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-[#F5C542]">
                    <Calendar className="w-4 h-4" /> Match Centre
                  </div>
                  <button onClick={() => navigate("matches")} className="text-xs text-emerald-300 hover:text-white underline">
                    All Fixtures
                  </button>
                </div>

                <div className="mt-3 divide-y divide-emerald-900/60 text-xs">
                  {/* Results preview */}
                  {results && results.slice(0, 2).map((m: any) => (
                    <div
                      key={m.id}
                      onClick={() => onSelectMatch(m.reference)}
                      className="py-2.5 flex items-center justify-between hover:bg-emerald-900/40 px-2 rounded cursor-pointer transition"
                    >
                      <div className="flex-1 truncate">
                        <div className="font-semibold text-white truncate">{m.home_name}</div>
                        <div className="font-semibold text-white truncate">{m.away_name}</div>
                      </div>
                      <div className="px-3 text-center">
                        <div className="bg-[#14532D] text-[#F5C542] font-black px-2.5 py-1 rounded text-sm tracking-widest border border-[#F5C542]/20">
                          {m.home_score} - {m.away_score}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-medium">FT</span>
                      </div>
                    </div>
                  ))}

                  {/* Upcoming fixture preview */}
                  {fixtures && fixtures.slice(0, 2).map((m: any) => (
                    <div
                      key={m.id}
                      onClick={() => onSelectMatch(m.reference)}
                      className="py-2.5 flex items-center justify-between hover:bg-emerald-900/40 px-2 rounded cursor-pointer transition"
                    >
                      <div className="flex-1 truncate">
                        <div className="font-medium text-emerald-200 truncate">{m.home_name}</div>
                        <div className="font-medium text-emerald-200 truncate">{m.away_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#F5C542] font-bold">
                          {new Date(m.kickoff_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-[10px] text-emerald-300">
                          {new Date(m.kickoff_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* League Table Preview */}
              {standings && standings[0] && (
                <div className="bg-[#052E16]/90 rounded-2xl p-5 border border-emerald-700/50 shadow-xl flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-800">
                      <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-[#F5C542]">
                        <Trophy className="w-4 h-4" /> {standings[0].competition.name}
                      </div>
                      <button onClick={() => navigate("competitions")} className="text-xs text-emerald-300 hover:text-white underline">
                        Full Table
                      </button>
                    </div>

                    <table className="w-full text-xs mt-2">
                      <thead>
                        <tr className="text-emerald-400 border-b border-emerald-900 text-[10px] uppercase">
                          <th className="py-1 text-left">#</th>
                          <th className="py-1 text-left">Club</th>
                          <th className="py-1 text-center">P</th>
                          <th className="py-1 text-center">GD</th>
                          <th className="py-1 text-right font-bold text-[#F5C542]">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-900/40 text-emerald-100">
                        {standings[0].rows.slice(0, 5).map((r: any) => (
                          <tr
                            key={r.team_id}
                            onClick={() => onSelectTeam(r.slug)}
                            className="hover:bg-emerald-900/50 cursor-pointer"
                          >
                            <td className="py-1.5 font-bold text-emerald-300">{r.position}</td>
                            <td className="py-1.5 font-medium text-white truncate max-w-[130px]">{r.name}</td>
                            <td className="py-1.5 text-center">{r.played}</td>
                            <td className="py-1.5 text-center font-mono">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                            <td className="py-1.5 text-right font-bold text-[#F5C542]">{r.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Latest News & Articles Grid */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#14532D] mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight text-[#052E16] flex items-center gap-2">
            <span className="w-3 h-6 bg-[#14532D] rounded-sm inline-block"></span>
            Latest Football News
          </h2>
          <button
            onClick={() => navigate("news")}
            className="text-sm font-bold text-[#14532D] hover:text-[#052E16] flex items-center gap-1"
          >
            All Stories <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {latest && latest.map((art: any) => (
            <div
              key={art.id}
              onClick={() => onSelectArticle(art.slug)}
              className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-[#14532D] shadow-sm hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
            >
              <div className="h-44 bg-slate-100 relative overflow-hidden">
                <img
                  src={art.featured_image || "/uploads/sebei_team_lineup.jpg"}
                  alt={art.title}
                  onError={(e) => { (e.target as HTMLImageElement).src = "/uploads/sebei_team_lineup.jpg"; }}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <span className="absolute top-3 left-3 bg-[#14532D] text-[#F5C542] text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                  {art.category || "Sebei Football"}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1">
                    {new Date(art.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-[#14532D] transition leading-snug line-clamp-2">
                    {art.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {art.summary}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#14532D] font-bold">
                  <span>Read Article</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transfer Centre Highlights */}
      {transfers && transfers.length > 0 && (
        <section className="bg-slate-900 text-white py-10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-6">
              <div>
                <span className="text-[#F5C542] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4" /> Transfer Centre
                </span>
                <h2 className="text-2xl font-black text-white mt-1">Confirmed Regional Transfers</h2>
              </div>
              <button
                onClick={() => navigate("transfers")}
                className="text-xs font-bold text-[#F5C542] hover:text-white uppercase tracking-wider border border-[#F5C542]/40 px-3 py-1.5 rounded transition"
              >
                View Transfer Hub
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {transfers.slice(0, 3).map((t: any) => (
                <div
                  key={t.id}
                  className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 shadow-md hover:border-[#F5C542]/50 transition"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="bg-[#14532D] text-[#F5C542] px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      {t.transfer_type.replace(/_/g, " ")}
                    </span>
                    <span>{new Date(t.announced_on).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </div>
                  <h4 className="text-base font-black text-white">{t.player_name}</h4>
                  <div className="mt-3 flex items-center justify-between text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50">
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">From</span>
                      <span className="font-bold text-slate-200">{t.from_team || "Free Agent"}</span>
                    </div>
                    <ArrowRightLeft className="w-4 h-4 text-[#F5C542]" />
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">To</span>
                      <span className="font-bold text-[#F5C542]">{t.to_team || "Released"}</span>
                    </div>
                  </div>
                  {t.announcement_text && (
                    <p className="mt-2.5 text-xs text-slate-400 line-clamp-2 italic">
                      "{t.announcement_text}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Teams Showcase */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#14532D] mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight text-[#052E16] flex items-center gap-2">
            <span className="w-3 h-6 bg-[#14532D] rounded-sm inline-block"></span>
            Sebei Province Teams
          </h2>
          <button
            onClick={() => navigate("teams")}
            className="text-sm font-bold text-[#14532D] hover:text-[#052E16] flex items-center gap-1"
          >
            All Teams <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {teams && teams.map((t: any) => (
            <div
              key={t.id}
              onClick={() => onSelectTeam(t.slug)}
              className="bg-white rounded-xl p-4 border border-slate-200 hover:border-[#14532D] text-center shadow-sm hover:shadow-md transition cursor-pointer group"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-white flex items-center justify-center border border-slate-200 group-hover:scale-105 transition p-1 shadow-sm overflow-hidden">
                {t.logo ? (
                  <img src={t.logo} alt={t.name} className="w-full h-full object-contain rounded-full" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                ) : (
                  <Shield className="w-8 h-8 text-[#14532D]" />
                )}
              </div>
              <h4 className="mt-3 font-bold text-sm text-slate-900 group-hover:text-[#14532D] transition truncate">
                {t.name}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" /> {t.location || "Sebei"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Official Announcements */}
      {announcements && announcements.length > 0 && (
        <section className="container mx-auto px-4">
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200 mb-4">
              <div className="flex items-center gap-2 font-black text-amber-900 uppercase text-sm tracking-wider">
                <AlertCircle className="w-5 h-5 text-amber-600" /> Official Announcements & Notices
              </div>
              <button
                onClick={() => navigate("announcements")}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 underline"
              >
                View All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.map((a: any) => (
                <div key={a.id} className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold text-amber-700">Official Notice</span>
                    <span>{new Date(a.published_at).toLocaleDateString("en-GB")}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{a.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{a.excerpt}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// NEWS ARCHIVE VIEW
// ----------------------------------------------------------------------
function NewsView({ articles, categories, activeCategory, onFilterCategory, onSelectArticle }: any) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#052E16] uppercase tracking-tight">Football News</h1>
        <p className="text-sm text-slate-600 mt-1">
          Comprehensive match reports, player interviews, transfer updates, and official announcements across Sebei.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8">
        <button
          onClick={() => onFilterCategory("")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
            activeCategory === "" ? "bg-[#14532D] text-[#F5C542]" : "bg-white text-slate-700 border hover:bg-slate-50"
          }`}
        >
          All Categories
        </button>
        {categories.map((c: any) => (
          <button
            key={c.slug}
            onClick={() => onFilterCategory(c.slug)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
              activeCategory === c.slug ? "bg-[#14532D] text-[#F5C542]" : "bg-white text-slate-700 border hover:bg-slate-50"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.map((art: any) => (
          <div
            key={art.id}
            onClick={() => onSelectArticle(art.slug)}
            className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-[#14532D] shadow-sm hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="h-48 bg-slate-100 relative overflow-hidden">
              <img
                src={art.featured_image || "/uploads/sebei_team_lineup.jpg"}
                alt={art.title}
                onError={(e) => { (e.target as HTMLImageElement).src = "/uploads/sebei_team_lineup.jpg"; }}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <span className="absolute top-3 left-3 bg-[#14532D] text-[#F5C542] text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                {art.category || "General"}
              </span>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-medium mb-1.5">
                  {new Date(art.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} • By {art.author_name || "Sebei Football"}
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-[#14532D] transition leading-snug">
                  {art.title}
                </h3>
                <p className="mt-2 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {art.summary}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#14532D] font-bold">
                <span>Read Full Story</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ARTICLE DETAIL VIEW
// ----------------------------------------------------------------------
function ArticleDetailView({ article, navigate, onSelectArticle }: any) {
  const shareUrl = window.location.href;

  const handleShare = (platform: string) => {
    let url = "";
    if (platform === "whatsapp") url = `https://api.whatsapp.com/send?text=${encodeURIComponent(article.title + " " + shareUrl)}`;
    if (platform === "twitter") url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(shareUrl)}`;
    if (platform === "facebook") url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button
        onClick={() => navigate("news")}
        className="text-xs font-bold text-[#14532D] hover:underline flex items-center gap-1 mb-4"
      >
        ← Back to All News
      </button>

      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-[#14532D] text-[#F5C542] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded">
            {article.category || "Sebei Football"}
          </span>
          {article.is_breaking && (
            <span className="bg-[#DC2626] text-white text-xs font-black uppercase px-2.5 py-1 rounded">
              Breaking
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
          {article.title}
        </h1>

        <div className="mt-4 pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Published: <span className="font-semibold text-slate-800">{new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span> • By <span className="font-semibold text-slate-800">{article.author_name || "Sebei Province Sports Desk"}</span>
          </div>
          {/* Social share */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Share:</span>
            <button onClick={() => handleShare("whatsapp")} className="px-2.5 py-1 bg-green-600 text-white rounded text-[11px] font-bold hover:bg-green-700">WhatsApp</button>
            <button onClick={() => handleShare("twitter")} className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-bold hover:bg-black">X / Twitter</button>
            <button onClick={() => handleShare("facebook")} className="px-2.5 py-1 bg-blue-700 text-white rounded text-[11px] font-bold hover:bg-blue-800">Facebook</button>
          </div>
        </div>

        {article.featured_image && (
          <div className="my-6 rounded-xl overflow-hidden border">
            <img src={article.featured_image} alt={article.title} className="w-full max-h-[460px] object-cover" />
          </div>
        )}

        <div className="mt-6 text-slate-800 text-base leading-relaxed space-y-4 whitespace-pre-line">
          {article.body}
        </div>

        {article.tags && article.tags.length > 0 && (
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold">Tags:</span>
            {article.tags.map((t: any) => (
              <span key={t.slug} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-md font-medium">
                #{t.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Related stories */}
      {article.related && article.related.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xl font-black text-[#052E16] uppercase tracking-tight mb-4">Related Stories</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {article.related.map((rel: any) => (
              <div
                key={rel.id}
                onClick={() => onSelectArticle(rel.slug)}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-[#14532D] cursor-pointer shadow-sm transition"
              >
                <span className="text-[10px] font-bold text-[#14532D] uppercase">{rel.category}</span>
                <h4 className="font-bold text-slate-900 text-sm mt-1">{rel.title}</h4>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// TEAMS DIRECTORY & DETAIL VIEW
// ----------------------------------------------------------------------
function TeamsView({ teams, onSelectTeam }: any) {
  const [filterLoc, setFilterLoc] = useState("");
  const filtered = filterLoc ? teams.filter((t: any) => t.location?.toLowerCase().includes(filterLoc.toLowerCase())) : teams;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#052E16] uppercase tracking-tight">Teams Directory</h1>
          <p className="text-sm text-slate-600 mt-1">
            Registered football clubs across Kapchorwa, Bukwo, and Kween competing in provincial leagues and cups.
          </p>
        </div>
        <div className="flex gap-2">
          {["", "Kapchorwa", "Bukwo", "Kween"].map((loc) => (
            <button
              key={loc}
              onClick={() => setFilterLoc(loc)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterLoc === loc ? "bg-[#14532D] text-[#F5C542]" : "bg-white text-slate-700 border"
              }`}
            >
              {loc || "All Districts"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((t: any) => (
          <div
            key={t.id}
            onClick={() => onSelectTeam(t.slug)}
            className="bg-white rounded-xl p-6 border border-slate-200 hover:border-[#14532D] shadow-sm hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center p-1 group-hover:scale-105 transition shadow-sm overflow-hidden shrink-0">
                  {t.logo ? (
                    <img src={t.logo} alt={t.name} className="w-full h-full object-contain rounded-full" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                  ) : (
                    <Shield className="w-9 h-9 text-[#14532D]" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-[#14532D] transition leading-tight">
                    {t.name}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {t.location || "Sebei Province"}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Home Ground</span>
                  <span className="font-semibold text-slate-700 truncate block">{t.home_ground || "TBD"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Abbreviation</span>
                  <span className="font-bold text-[#14532D]">{t.abbreviation || "FC"}</span>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#14532D] font-bold">
              <span>View Club Profile & Squad</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamDetailView({ team, navigate, onSelectPlayer, onSelectMatch }: any) {
  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate("teams")}
        className="text-xs font-bold text-[#14532D] hover:underline flex items-center gap-1 mb-4"
      >
        ← Back to All Teams
      </button>

      {/* Team Header Banner */}
      <div className="bg-gradient-to-r from-[#052E16] to-[#14532D] rounded-2xl p-6 sm:p-10 text-white shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white border-2 border-[#F5C542] flex items-center justify-center p-2 shadow-2xl overflow-hidden shrink-0">
          {team.logo ? (
            <img src={team.logo} alt={team.name} className="w-full h-full object-contain rounded-full" />
          ) : (
            <Shield className="w-14 h-14 text-[#14532D]" />
          )}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <span className="bg-[#F5C542] text-[#052E16] text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider">
            {team.abbreviation || "FC"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-1 text-white">{team.name}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-emerald-200">
            <span>Stadium: <strong className="text-white">{team.home_ground}</strong></span>
            <span>Location: <strong className="text-white">{team.location}</strong></span>
            <span>Manager: <strong className="text-white">{team.coach || "Not Listed"}</strong></span>
            <span>Colors: <strong className="text-white">{team.colors || "Green/White"}</strong></span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Squad Members Roster (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 pb-3 border-b">
              <Users className="w-5 h-5 text-[#14532D]" /> Registered Squad ({team.squad?.length || 0})
            </h3>
            <div className="divide-y divide-slate-100 mt-2">
              {team.squad?.map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPlayer(p.slug)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-50 text-[#14532D] font-black text-xs flex items-center justify-center border border-emerald-200">
                      {p.squad_number || "-"}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 text-sm hover:text-[#14532D] transition">{p.full_name}</div>
                      <div className="text-xs text-slate-400">{p.position}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              ))}
              {(!team.squad || team.squad.length === 0) && (
                <div className="py-6 text-center text-xs text-slate-400">
                  No squad members currently registered.
                </div>
              )}
            </div>
          </div>

          {/* Club History */}
          {team.history && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-3">Club History</h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{team.history}</p>
            </div>
          )}
        </div>

        {/* Competitions & Recent Matches (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Competitions */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 pb-3 border-b">
              <Trophy className="w-5 h-5 text-[#F5C542]" /> Competitions
            </h3>
            <div className="mt-3 space-y-2">
              {team.competitions?.map((c: any) => (
                <div key={c.slug} className="p-3 bg-slate-50 rounded-xl border flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{c.name}</span>
                    <span className="text-[10px] text-slate-400">{c.season_label}</span>
                  </div>
                  {c.position && (
                    <span className="bg-[#14532D] text-[#F5C542] px-2.5 py-1 rounded font-black text-xs">
                      #{c.position}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Results */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 pb-3 border-b">
              <Calendar className="w-5 h-5 text-[#14532D]" /> Recent Results
            </h3>
            <div className="mt-3 divide-y divide-slate-100 text-xs">
              {team.recent?.map((m: any) => (
                <div
                  key={m.id}
                  onClick={() => onSelectMatch(m.reference)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded cursor-pointer"
                >
                  <div className="truncate flex-1">
                    <span className="text-slate-800 font-medium block truncate">{m.home_name} vs {m.away_name}</span>
                    <span className="text-[10px] text-slate-400">{new Date(m.kickoff_at).toLocaleDateString("en-GB")}</span>
                  </div>
                  <span className="font-black px-2 py-0.5 bg-slate-100 rounded text-slate-900">
                    {m.home_score} - {m.away_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// PLAYERS DIRECTORY & DETAIL VIEW
// ----------------------------------------------------------------------
function PlayersView({ players, onSelectPlayer }: any) {
  const [posFilter, setPosFilter] = useState("");
  const filtered = posFilter ? players.filter((p: any) => p.position === posFilter) : players;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#052E16] uppercase tracking-tight">Players Roster</h1>
          <p className="text-sm text-slate-600 mt-1">
            Registered footballers across Sebei Province clubs, verified with match statistics.
          </p>
        </div>
        <div className="flex gap-2">
          {["", "Goalkeeper", "Defender", "Midfielder", "Forward"].map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                posFilter === pos ? "bg-[#14532D] text-[#F5C542]" : "bg-white text-slate-700 border"
              }`}
            >
              {pos || "All Positions"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p: any) => (
          <div
            key={p.id}
            onClick={() => onSelectPlayer(p.slug)}
            className="bg-white rounded-xl p-5 border border-slate-200 hover:border-[#14532D] shadow-sm hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-[#14532D] text-lg">
                  {p.squad_number || "•"}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 group-hover:text-[#14532D] transition leading-tight">
                    {p.full_name}
                  </h3>
                  <span className="text-xs text-slate-500 block mt-0.5">{p.position || "Player"}</span>
                  <span className="text-xs font-semibold text-[#14532D]">{p.team_name || "Unattached"}</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-1 text-center bg-slate-50 p-2.5 rounded-lg border text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Apps</span>
                  <strong className="text-slate-800">{p.appearances || 0}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Goals</span>
                  <strong className="text-slate-800">{p.goals || 0}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Assists</span>
                  <strong className="text-slate-800">{p.assists || 0}</strong>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#14532D] font-bold">
              <span>View Career Profile</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerDetailView({ player, navigate, onSelectTeam }: any) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button
        onClick={() => navigate("players")}
        className="text-xs font-bold text-[#14532D] hover:underline flex items-center gap-1 mb-4"
      >
        ← Back to All Players
      </button>

      {/* Player Header Banner */}
      <div className="bg-gradient-to-r from-[#052E16] to-[#14532D] rounded-2xl p-6 sm:p-10 text-white shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/10 backdrop-blur border-2 border-[#F5C542] flex items-center justify-center font-black text-3xl text-[#F5C542] shadow-2xl">
          {player.squad_number || "9"}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <span className="bg-[#F5C542] text-[#052E16] text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider">
            {player.position || "Forward"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-1 text-white">{player.full_name}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-emerald-200">
            <span>Club: <strong className="text-white cursor-pointer hover:underline" onClick={() => player.team_slug && onSelectTeam(player.team_slug)}>{player.team_name || "Unattached"}</strong></span>
            <span>Nationality: <strong className="text-white">{player.nationality || "Uganda"}</strong></span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
          <span className="text-xs text-slate-400 uppercase font-bold block">Appearances</span>
          <span className="text-2xl font-black text-[#14532D] mt-1 block">{player.appearances || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
          <span className="text-xs text-slate-400 uppercase font-bold block">Goals</span>
          <span className="text-2xl font-black text-[#14532D] mt-1 block">{player.goals || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
          <span className="text-xs text-slate-400 uppercase font-bold block">Assists</span>
          <span className="text-2xl font-black text-[#14532D] mt-1 block">{player.assists || 0}</span>
        </div>
      </div>

      {/* Biography */}
      {player.biography && (
        <div className="mt-6 bg-white rounded-2xl p-6 border shadow-sm">
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">Player Biography</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{player.biography}</p>
        </div>
      )}

      {/* Career Club History */}
      <div className="mt-6 bg-white rounded-2xl p-6 border shadow-sm">
        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-4">Career Team History</h3>
        <div className="space-y-2">
          {player.history?.map((h: any, idx: number) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-xl border flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">{h.team_name}</span>
              <span className="text-slate-400 font-mono text-[11px]">
                {new Date(h.start_date).getFullYear()} - {h.end_date ? new Date(h.end_date).getFullYear() : "Present"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// TRANSFER CENTRE
// ----------------------------------------------------------------------
function TransfersView({ transfers, onSelectPlayer, onSelectTeam }: any) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <span className="text-[#14532D] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <ArrowRightLeft className="w-4 h-4" /> Official Sebei Transfer Centre
        </span>
        <h1 className="text-3xl font-black text-[#052E16] uppercase tracking-tight mt-1">
          Confirmed Transfers & Signings
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Verified player movements, permanent transfers, loans, and contract renewals across Sebei Province football.
        </p>
      </div>

      <div className="space-y-4">
        {transfers.map((t: any) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-[#14532D] transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="bg-[#14532D] text-[#F5C542] text-[11px] font-bold uppercase px-2.5 py-0.5 rounded">
                  {t.transfer_type.replace(/_/g, " ")}
                </span>
                <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Confirmed & Verified
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Announced: {new Date(t.announced_on).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>

            <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3
                  onClick={() => onSelectPlayer(t.player_slug)}
                  className="text-xl font-black text-slate-900 hover:text-[#14532D] cursor-pointer transition"
                >
                  {t.player_name}
                </h3>
                {t.fee_terms && (
                  <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                    Terms: <strong className="text-slate-700">{t.fee_terms}</strong>
                  </span>
                )}
              </div>

              {/* Club Move Box */}
              <div className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border text-xs">
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block uppercase">Previous Club</span>
                  <span className="font-bold text-slate-700">{t.from_team || "Free Agent / Academy"}</span>
                </div>
                <ArrowRightLeft className="w-5 h-5 text-[#14532D]" />
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">New Club</span>
                  <span className="font-black text-[#14532D]">{t.to_team || "Released"}</span>
                </div>
              </div>
            </div>

            {t.announcement_text && (
              <p className="mt-4 text-xs text-slate-600 bg-amber-50/60 p-3 rounded-lg border border-amber-100 italic">
                "{t.announcement_text}"
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// COMPETITIONS & STANDINGS HUB
// ----------------------------------------------------------------------
function CompetitionsView({ competitions, selectedComp, onSelectCompSlug, onSelectTeam, onSelectMatch }: any) {
  if (!selectedComp) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Competition Selector Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-6 border-b">
        {competitions.map((c: any) => (
          <button
            key={c.slug}
            onClick={() => onSelectCompSlug(c.slug)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2 ${
              selectedComp.slug === c.slug
                ? "bg-[#052E16] text-[#F5C542] shadow-md"
                : "bg-white text-slate-700 hover:bg-slate-100 border"
            }`}
          >
            <Trophy className="w-4 h-4" /> {c.name}
          </button>
        ))}
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#052E16] to-[#14532D] rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="bg-[#F5C542] text-[#052E16] text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider">
            {selectedComp.competition_type}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">{selectedComp.name}</h1>
          <p className="text-xs text-emerald-200 mt-1 max-w-xl">{selectedComp.description}</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-emerald-300 block">Season</span>
          <span className="text-lg font-black text-[#F5C542]">{selectedComp.season?.label || "2026/2027"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Standings Table (8 cols for leagues) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-x-auto">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 pb-3 border-b mb-4">
              <Trophy className="w-5 h-5 text-[#F5C542]" /> Official League Standings
            </h3>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400 font-bold uppercase text-[11px]">
                  <th className="py-2.5 text-left w-8">Pos</th>
                  <th className="py-2.5 text-left">Club</th>
                  <th className="py-2.5 text-center">P</th>
                  <th className="py-2.5 text-center">W</th>
                  <th className="py-2.5 text-center">D</th>
                  <th className="py-2.5 text-center">L</th>
                  <th className="py-2.5 text-center">GF</th>
                  <th className="py-2.5 text-center">GA</th>
                  <th className="py-2.5 text-center">GD</th>
                  <th className="py-2.5 text-right font-black text-[#14532D]">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedComp.standings?.map((r: any) => (
                  <tr
                    key={r.team_id}
                    onClick={() => onSelectTeam(r.slug)}
                    className="hover:bg-slate-50 cursor-pointer transition font-medium"
                  >
                    <td className="py-3 font-bold text-slate-700">{r.position}</td>
                    <td className="py-3 font-bold text-slate-900 flex items-center gap-2">
                      {r.logo ? (
                        <img src={r.logo} alt={r.name} className="w-5 h-5 object-contain rounded-full shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                      ) : (
                        <Shield className="w-4 h-4 text-[#14532D] shrink-0" />
                      )}
                      <span>{r.name}</span>
                    </td>
                    <td className="py-3 text-center text-slate-600">{r.played}</td>
                    <td className="py-3 text-center text-slate-600">{r.won}</td>
                    <td className="py-3 text-center text-slate-600">{r.drawn}</td>
                    <td className="py-3 text-center text-slate-600">{r.lost}</td>
                    <td className="py-3 text-center text-slate-500 font-mono">{r.gf}</td>
                    <td className="py-3 text-center text-slate-500 font-mono">{r.ga}</td>
                    <td className="py-3 text-center font-mono font-bold text-slate-700">
                      {r.gd > 0 ? `+${r.gd}` : r.gd}
                    </td>
                    <td className="py-3 text-right font-black text-sm text-[#14532D]">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fixtures & Results Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 pb-3 border-b mb-3">
              <Calendar className="w-4 h-4 text-[#14532D]" /> Recent Results
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {selectedComp.results?.map((m: any) => (
                <div
                  key={m.id}
                  onClick={() => onSelectMatch(m.reference)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded cursor-pointer"
                >
                  <div className="truncate flex-1">
                    <span className="font-bold text-slate-900 block truncate">{m.home_name}</span>
                    <span className="font-bold text-slate-900 block truncate">{m.away_name}</span>
                  </div>
                  <span className="bg-[#14532D] text-[#F5C542] px-2.5 py-1 rounded font-black text-xs">
                    {m.home_score} - {m.away_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// FIXTURES & MATCH CENTRE VIEW
// ----------------------------------------------------------------------
function MatchesView({ matches, filter, onFilterChange, onSelectMatch, onSelectTeam }: any) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#052E16] uppercase tracking-tight">Match Centre</h1>
          <p className="text-sm text-slate-600 mt-1">
            Official fixtures, live scorelines, and match reports across Sebei Province.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { id: "all", label: "All Matches" },
            { id: "upcoming", label: "Upcoming" },
            { id: "completed", label: "Results" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === f.id ? "bg-[#14532D] text-[#F5C542]" : "bg-white text-slate-700 border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {matches.map((m: any) => {
          const isDone = m.status === "completed";
          return (
            <div
              key={m.id}
              onClick={() => onSelectMatch(m.reference)}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#14532D] shadow-sm hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-100">
                <span className="font-bold text-[#14532D] uppercase">{m.competition_name}</span>
                <span>{new Date(m.kickoff_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} • {new Date(m.kickoff_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex-1 text-right">
                  <span className="font-black text-slate-900 text-base block">{m.home_name}</span>
                </div>

                <div className="px-4 text-center">
                  {isDone ? (
                    <div className="bg-[#14532D] text-[#F5C542] px-3.5 py-1.5 rounded-lg font-black text-lg tracking-widest shadow-sm">
                      {m.home_score} - {m.away_score}
                    </div>
                  ) : (
                    <div className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-xs font-bold font-mono">
                      VS
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block mt-1">
                    {isDone ? "Full Time" : "Scheduled"}
                  </span>
                </div>

                <div className="flex-1 text-left">
                  <span className="font-black text-slate-900 text-base block">{m.away_name}</span>
                </div>
              </div>

              {m.venue && (
                <div className="mt-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {m.venue}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchDetailView({ match, navigate, onSelectTeam }: any) {
  const isDone = match.status === "completed";

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <button
        onClick={() => navigate("matches")}
        className="text-xs font-bold text-[#14532D] hover:underline flex items-center gap-1 mb-4"
      >
        ← Back to Match Centre
      </button>

      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-sm text-center">
        <span className="bg-[#14532D] text-[#F5C542] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded">
          {match.competition_name}
        </span>
        <div className="text-xs text-slate-400 mt-2">
          {new Date(match.kickoff_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 sm:gap-12">
          <div className="flex-1 text-center">
            <Shield className="w-12 h-12 text-[#14532D] mx-auto mb-2" />
            <h2 className="text-xl font-black text-slate-900">{match.home_name}</h2>
          </div>

          <div className="px-4">
            {isDone ? (
              <div className="bg-[#14532D] text-[#F5C542] px-5 py-2 rounded-2xl font-black text-3xl tracking-widest shadow-md">
                {match.home_score} : {match.away_score}
              </div>
            ) : (
              <div className="text-slate-400 font-bold text-xl">VS</div>
            )}
            <span className="text-xs text-slate-400 block mt-2 font-bold uppercase">
              {match.status}
            </span>
          </div>

          <div className="flex-1 text-center">
            <Shield className="w-12 h-12 text-[#14532D] mx-auto mb-2" />
            <h2 className="text-xl font-black text-slate-900">{match.away_name}</h2>
          </div>
        </div>

        {match.venue && (
          <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-center gap-1">
            <MapPin className="w-4 h-4 text-slate-400" /> Ground: <strong>{match.venue}</strong>
          </div>
        )}

        {match.report && (
          <div className="mt-8 text-left bg-slate-50 p-6 rounded-xl border">
            <h4 className="font-black text-slate-900 uppercase text-xs tracking-wider mb-2">Match Report</h4>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{match.report}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ANNOUNCEMENTS VIEW
// ----------------------------------------------------------------------
function AnnouncementsView({ announcements }: any) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#052E16] uppercase tracking-tight">Official Notices & Announcements</h1>
        <p className="text-sm text-slate-600 mt-1">
          Provincial tournament registration deadlines, disciplinary updates, fixture changes, and regional sports circulars.
        </p>
      </div>

      <div className="space-y-4">
        {announcements.map((a: any) => (
          <div key={a.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs text-slate-400">
              <span className="font-bold text-[#14532D] uppercase">Official Circular</span>
              <span>{new Date(a.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mt-3">{a.title}</h3>
            <p className="text-xs text-slate-700 mt-2 leading-relaxed whitespace-pre-line">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
