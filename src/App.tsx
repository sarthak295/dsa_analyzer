import { useState, useEffect } from "react";
import { DashboardData, User, Problem, Weakness, Roadmap } from "./types.ts";
import LandingPage from "./components/LandingPage.tsx";
import AlgoVisualizer from "./components/AlgoVisualizer.tsx";
import ProblemLogger from "./components/ProblemLogger.tsx";
import RemindersList from "./components/RemindersList.tsx";
import PlacementTracker from "./components/PlacementTracker.tsx";
import ProgressCharts from "./components/ProgressCharts.tsx";
import {
  LogOut,
  Sparkles,
  BookOpen,
  Award,
  ListTodo,
  ExternalLink,
  Trash2,
  Lock,
  User as UserIcon,
  Briefcase,
  AlertCircle,
  Clock,
  Code,
  Menu,
  X,
  ChevronRight,
  Database,
  BarChart3,
  Search,
  SlidersHorizontal,
  Calendar
} from "lucide-react";

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("dsa_auth_token"));
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nested Layout state
  const [activeSection, setActiveSection] = useState<"overview" | "roadmaps" | "journal" | "reviews" | "visualizer">("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [journalTab, setJournalTab] = useState<"history" | "log">("history");

  // Problem search/filtering state for nested journal view
  const [problemSearch, setProblemSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("All");
  const [topicFilter, setTopicFilter] = useState<string>("All");

  // 1. Initialize custom auth from localStorage token
  useEffect(() => {
    const initializeAuth = async () => {
      setAuthLoading(true);
      setError(null);
      if (token) {
        try {
          await syncUser(token);
        } catch (err: any) {
          console.error("Token sync failed on mount:", err);
          localStorage.removeItem("dsa_auth_token");
          setToken(null);
          setDbUser(null);
        }
      } else {
        setDbUser(null);
        setDashboard(null);
      }
      setAuthLoading(false);
    };

    initializeAuth();
  }, [token]);

  // 2. Sync JWT session to PostgreSQL
  const syncUser = async (authToken: string) => {
    try {
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDbUser(data.user);
      await fetchDashboardData(authToken);
    } catch (err: any) {
      setError(err.message || "Failed to synchronize session with PostgreSQL.");
      throw err;
    }
  };

  // 3. Fetch aggregated dashboard metric data
  const fetchDashboardData = async (authToken: string) => {
    setDashboardLoading(true);
    try {
      const res = await fetch("/api/dashboard", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDashboard(data);
    } catch (err: any) {
      setError("Failed to fetch dashboard progress statistics.");
      console.error(err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // 4. Custom JWT Email & Password login and registration handlers
  const handleEmailLogin = async (email: string, pass: string) => {
    setAuthLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password: pass }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sign in. Please check your credentials.");

      localStorage.setItem("dsa_auth_token", data.token);
      setToken(data.token);
      setDbUser(data.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setAuthLoading(false);
      throw err;
    }
  };

  const handleEmailRegister = async (email: string, pass: string, name: string) => {
    setAuthLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password: pass, name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account. Please try again.");

      localStorage.setItem("dsa_auth_token", data.token);
      setToken(data.token);
      setDbUser(data.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setAuthLoading(false);
      throw err;
    }
  };

  // 5. Logout session
  const handleLogout = async () => {
    localStorage.removeItem("dsa_auth_token");
    setToken(null);
    setDbUser(null);
    setDashboard(null);
  };

  // 6. Delete logged problem
  const handleDeleteProblem = async (problemId: number) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this problem log?")) return;

    try {
      const res = await fetch(`/api/problems/${problemId}/delete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Deletion failed.");
      await fetchDashboardData(token);
    } catch (err) {
      alert("Failed to delete solved problem record.");
    }
  };

  // 7. Toggle completion of individual roadmap item
  const handleToggleRoadmapItem = async (itemId: number, currentStatus: "Pending" | "Completed") => {
    if (!token) return;
    const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";

    try {
      const res = await fetch(`/api/roadmap-items/${itemId}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Toggle update failed.");
      await fetchDashboardData(token);
    } catch (err) {
      console.error(err);
    }
  };

  // 8. Trigger Gemini AI weakness and custom roadmap generation
  const handleTriggerAIAnalysis = async () => {
    if (!token) return;
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await fetchDashboardData(token);
    } catch (err: any) {
      setError(err.message || "Gemini analysis timed out or failed.");
    } finally {
      setAiLoading(false);
    }
  };

  // Loading Screen
  if (authLoading && !dbUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-slate-400 mt-4">Loading your security credentials...</p>
      </div>
    );
  }

  // Not logged in: Show landing page
  if (!dbUser || !token) {
    return (
      <LandingPage
        onEmailLogin={handleEmailLogin}
        onEmailRegister={handleEmailRegister}
        loading={authLoading}
        externalError={error}
        setExternalError={setError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col lg:flex-row relative overflow-x-hidden">
      
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-all duration-300"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container: Fixed on Desktop, Sliding Drawer on Mobile */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 z-50 transform lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Sidebar Brand Logo Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 shrink-0">
                <Code className="w-4 h-4" />
              </div>
              <span className="font-bold tracking-tight text-white text-base">
                DSA<span className="text-indigo-400"> Tracker</span>
              </span>
            </div>
            {/* Close Mobile Sidebar button */}
            <button 
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Info Card inside Sidebar */}
          {dbUser && (
            <div className="p-4 mx-3 my-4 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-center gap-3">
              {dbUser.avatarUrl ? (
                <img
                  src={dbUser.avatarUrl}
                  alt="avatar"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border border-indigo-500/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-white truncate">
                  {dbUser.name || dbUser.email}
                </span>
                <span className="block text-[10px] text-indigo-400 font-semibold uppercase tracking-wider mt-0.5 truncate">
                  Target: {dbUser.targetCompany}
                </span>
              </div>
            </div>
          )}

          {/* Sidebar Navigation Links */}
          <nav className="flex-1 px-3 py-2 space-y-1">
            <button
              onClick={() => {
                setActiveSection("overview");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border-l-2 cursor-pointer ${
                activeSection === "overview"
                  ? "bg-indigo-600/10 text-white border-indigo-500"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40 border-transparent"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Overview Dashboard</span>
            </button>

            <button
              onClick={() => {
                setActiveSection("roadmaps");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border-l-2 cursor-pointer ${
                activeSection === "roadmaps"
                  ? "bg-indigo-600/10 text-white border-indigo-500"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40 border-transparent"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <div className="flex-1 flex items-center justify-between">
                <span>AI Practice Tracks</span>
                {dashboard?.roadmaps && dashboard.roadmaps.length > 0 && (
                  <span className="bg-indigo-500/20 text-indigo-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-indigo-500/30">
                    {dashboard.roadmaps.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => {
                setActiveSection("journal");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border-l-2 cursor-pointer ${
                activeSection === "journal"
                  ? "bg-indigo-600/10 text-white border-indigo-500"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40 border-transparent"
              }`}
            >
              <ListTodo className="w-4 h-4" />
              <div className="flex-1 flex items-center justify-between">
                <span>Grind Journal</span>
                {dashboard?.problems && dashboard.problems.length > 0 && (
                  <span className="bg-slate-800 text-slate-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {dashboard.problems.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => {
                setActiveSection("reviews");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border-l-2 cursor-pointer ${
                activeSection === "reviews"
                  ? "bg-indigo-600/10 text-white border-indigo-500"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40 border-transparent"
              }`}
            >
              <Clock className="w-4 h-4" />
              <div className="flex-1 flex items-center justify-between">
                <span>Spaced Review Queue</span>
                {dashboard?.dueRemindersCount && dashboard.dueRemindersCount > 0 ? (
                  <span className="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                    {dashboard.dueRemindersCount}
                  </span>
                ) : null}
              </div>
            </button>

            <button
              onClick={() => {
                setActiveSection("visualizer");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border-l-2 cursor-pointer ${
                activeSection === "visualizer"
                  ? "bg-indigo-600/10 text-white border-indigo-500"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40 border-transparent"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Algo Visualizer</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer logout button */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/20 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-700/60"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 min-h-screen">
        
        {/* Mobile Top bar header */}
        <header className="lg:hidden h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 ml-1">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md shrink-0">
                <Code className="w-4 h-4" />
              </div>
              <span className="font-bold tracking-tight text-white text-sm">DSA Tracker</span>
            </div>
          </div>

          {dbUser && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-800 text-indigo-400 font-bold px-2 py-0.5 rounded-md">
                Target: {dbUser.targetCompany}
              </span>
              <button
                onClick={handleLogout}
                className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        {/* Central view frame */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {/* Alert messages */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2.5 animate-fade-in shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0 animate-pulse" />
              <span>{error}</span>
            </div>
          )}

          {/* Render Active Section view */}
          {activeSection === "overview" && (
            <div className="space-y-6 animate-fade-in">
              {/* Stats overview cards row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 shadow-xs flex flex-col justify-between">
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Total Solved
                  </span>
                  <span className="text-2xl font-bold text-white mt-1.5 block">
                    {dashboard?.problems.length || 0}
                  </span>
                  <span className="block text-[9px] text-slate-500 mt-1">
                    LeetCode solves logged
                  </span>
                </div>

                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 shadow-xs flex flex-col justify-between">
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Reminders Due
                  </span>
                  <span className="text-2xl font-bold text-amber-400 mt-1.5 block animate-pulse">
                    {dashboard?.dueRemindersCount || 0}
                  </span>
                  <span className="block text-[9px] text-amber-500/80 font-medium mt-1">
                    Pending SM-2 spaced review
                  </span>
                </div>

                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 shadow-xs flex flex-col justify-between">
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    AI Weaknesses
                  </span>
                  <span className="text-2xl font-bold text-rose-400 mt-1.5 block">
                    {dashboard?.weaknesses.length || 0}
                  </span>
                  <span className="block text-[9px] text-rose-400/80 mt-1">
                    Isolate friction domains
                  </span>
                </div>

                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 shadow-xs flex flex-col justify-between">
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Target Context
                  </span>
                  <span className="text-base font-bold text-white mt-1.5 block truncate">
                    {dbUser?.targetCompany || "FAANG"}
                  </span>
                  <span className="block text-[9px] text-indigo-400 font-semibold mt-1">
                    Target match engine
                  </span>
                </div>
              </div>

              {/* Placement chances block */}
              {dashboard && dbUser && (
                <PlacementTracker
                  user={dbUser}
                  chances={dashboard.placementChances}
                  roadmaps={dashboard.roadmaps}
                  token={token}
                  onTargetUpdated={() => fetchDashboardData(token)}
                />
              )}

              {/* Charts block */}
              {dashboard && (
                <ProgressCharts
                  problems={dashboard.problems}
                  weaknesses={dashboard.weaknesses}
                />
              )}
            </div>
          )}

          {activeSection === "roadmaps" && (
            <div className="space-y-6 animate-fade-in">
              {/* Practice Roadmaps controls compiler */}
              <div className="bg-indigo-600 rounded-xl p-6 sm:p-8 shadow-xl shadow-indigo-950/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                    <span className="bg-white/10 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Gemini Core Engine
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-2">
                      Personalized Practice Roadmap
                    </h2>
                    <p className="text-indigo-100 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
                      Let Gemini AI inspect your solved problem statistics and target profile to assemble custom mastery roadmaps, isolate core weaknesses, schedule repetition milestones, and calculate placement scores.
                    </p>
                  </div>
                  <button
                    onClick={handleTriggerAIAnalysis}
                    disabled={aiLoading || (dashboard?.problems.length === 0)}
                    className="bg-white hover:bg-slate-100 text-slate-950 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-950/25"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                    {aiLoading ? "Constructing Roadmap..." : "Analyze Solved Problems"}
                  </button>
                </div>

                {dashboard?.problems.length === 0 && (
                  <div className="mt-4 flex items-center gap-1.5 text-indigo-200 text-xs font-semibold bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-2.5 max-w-lg">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Log at least 1 solved problem to activate AI Roadmap generation!</span>
                  </div>
                )}
              </div>

              {/* Active Tracks List */}
              {dashboard?.roadmaps && dashboard.roadmaps.length > 0 ? (
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
                  <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-6">
                    <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400 border border-indigo-500/10 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">AI-Generated Practice Tracks</h3>
                      <p className="text-xs text-slate-400">Step-by-step custom curriculum milestones compiled for you.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {dashboard.roadmaps.map((r) => (
                      <div
                        key={r.id}
                        className="border border-slate-800 bg-slate-950 rounded-xl p-5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">
                                Topic Practice Track
                              </span>
                              <h4 className="font-bold text-white text-sm mt-0.5 leading-snug">
                                {r.trackName}
                              </h4>
                            </div>
                            <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/20 shrink-0">
                              {r.status}
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                            {r.description}
                          </p>

                          {/* List of track items */}
                          <div className="mt-4 space-y-3">
                            {r.items.map((item) => {
                              const isCompleted = item.status === "Completed";
                              return (
                                <div
                                  key={item.id}
                                  className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 flex items-start gap-3 transition-all hover:border-slate-700"
                                >
                                  <button
                                    onClick={() => handleToggleRoadmapItem(item.id, item.status)}
                                    className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                                      isCompleted
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "border-slate-700 hover:border-indigo-500 bg-slate-950"
                                    }`}
                                  >
                                    {isCompleted && "✓"}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span
                                        className={`text-xs font-bold leading-normal truncate ${
                                          isCompleted ? "text-slate-500 line-through" : "text-white"
                                        }`}
                                      >
                                        {item.title}
                                      </span>
                                      {item.resourceLink && (
                                        <a
                                          href={item.resourceLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-slate-500 hover:text-indigo-400 transition-colors shrink-0"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                    <span className="block text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                                      {item.description}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white text-sm">No Practice Tracks Compiled</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Click "Analyze Solved Problems" above once you have logged solved questions to let Gemini assemble your custom curriculum.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeSection === "journal" && (
            <div className="space-y-6 animate-fade-in">
              {/* Nested Navigation Header for Journal */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-lg shrink-0">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Grind Journal</h3>
                    <p className="text-xs text-slate-400">Log solved algorithms and browse your running solved problem history.</p>
                  </div>
                </div>

                {/* Sub tabs switches */}
                <div className="bg-slate-900 p-1 rounded-lg flex items-center border border-slate-800">
                  <button
                    onClick={() => setJournalTab("history")}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      journalTab === "history"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Solved History
                  </button>
                  <button
                    onClick={() => setJournalTab("log")}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      journalTab === "log"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Log New Problem
                  </button>
                </div>
              </div>

              {/* Nested View A: Log New Problem Form */}
              {journalTab === "log" && (
                <div className="max-w-2xl mx-auto">
                  <ProblemLogger onSuccess={() => fetchDashboardData(token)} token={token} />
                </div>
              )}

              {/* Nested View B: Interactive Solved History Table & Search Filter */}
              {journalTab === "history" && (
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 space-y-6">
                  
                  {/* Search and Filters Header bar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search by title, notes..."
                        value={problemSearch}
                        onChange={(e) => setProblemSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs font-medium text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <select
                        value={difficultyFilter}
                        onChange={(e) => setDifficultyFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-medium text-slate-300 focus:outline-hidden focus:border-indigo-500"
                      >
                        <option value="All">All Difficulties</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={topicFilter}
                        onChange={(e) => setTopicFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-medium text-slate-300 focus:outline-hidden focus:border-indigo-500"
                      >
                        <option value="All">All Topics</option>
                        {Array.from(new Set(dashboard?.problems.map((p) => p.topic) || [])).map((topic) => (
                          <option key={topic} value={topic}>
                            {topic}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Filter process lists */}
                  {(() => {
                    const filtered = (dashboard?.problems || []).filter((p) => {
                      const matchesSearch =
                        p.problemTitle.toLowerCase().includes(problemSearch.toLowerCase()) ||
                        (p.notes || "").toLowerCase().includes(problemSearch.toLowerCase());
                      const matchesDifficulty = difficultyFilter === "All" || p.difficulty === difficultyFilter;
                      const matchesTopic = topicFilter === "All" || p.topic === topicFilter;
                      return matchesSearch && matchesDifficulty && matchesTopic;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-10 text-slate-500 text-xs font-medium">
                          {dashboard?.problems.length === 0 
                            ? "No solved problems logged yet. Go to 'Log New Problem' tab to add your first solve!" 
                            : "No logged problems match your search filter criteria."}
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-3 px-4">Title</th>
                              <th className="py-3 px-4">Topic</th>
                              <th className="py-3 px-4">Difficulty</th>
                              <th className="py-3 px-4">Time Spent</th>
                              <th className="py-3 px-4">Notes</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40 font-medium text-slate-300">
                            {filtered.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-900/30">
                                <td className="py-3.5 px-4 font-bold text-white">
                                  {p.problemUrl ? (
                                    <a
                                      href={p.problemUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-indigo-400 inline-flex items-center gap-1 transition-colors"
                                    >
                                      {p.problemTitle}
                                      <ExternalLink className="w-3 h-3 text-slate-500" />
                                    </a>
                                  ) : (
                                    p.problemTitle
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate-700/60">
                                    {p.topic}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                      p.difficulty === "Easy"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : p.difficulty === "Medium"
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    }`}
                                  >
                                    {p.difficulty}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-400">{p.timeSpentMinutes}m</td>
                                <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={p.notes || ""}>
                                  {p.notes || "—"}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => handleDeleteProblem(p.id)}
                                    className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                    title="Delete Log"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {activeSection === "reviews" && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <RemindersList token={token} onReviewed={() => fetchDashboardData(token)} />
            </div>
          )}

          {activeSection === "visualizer" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <div className="p-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-lg shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Algo Visualizer</h3>
                  <p className="text-xs text-slate-400">Step through core algorithms and structures with interactive canvas step tracing.</p>
                </div>
              </div>
              <AlgoVisualizer />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
