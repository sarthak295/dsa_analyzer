import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  Clock,
  LineChart,
  Award,
  PlayCircle,
  ShieldCheck,
  ArrowRight,
  Mail,
  Lock,
  User,
  UserPlus,
  LogIn,
  AlertCircle
} from "lucide-react";

interface LandingPageProps {
  onEmailLogin: (email: string, pass: string) => Promise<void>;
  onEmailRegister: (email: string, pass: string, name: string) => Promise<void>;
  loading: boolean;
  externalError: string | null;
  setExternalError: (err: string | null) => void;
}

export default function LandingPage({
  onEmailLogin,
  onEmailRegister,
  loading,
  externalError,
  setExternalError
}: LandingPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const features = [
    {
      icon: <Sparkles className="w-5 h-5 text-indigo-400" />,
      title: "AI Weakness Analysis",
      desc: "Our model reviews your LeetCode history, surfaces topic weaknesses, and explains complex concepts directly to bridge your gaps.",
    },
    {
      icon: <Clock className="w-5 h-5 text-amber-400" />,
      title: "SM-2 Spaced Repetition",
      desc: "Solidify your algorithms! Automatically schedules reviews for logged tasks using the dynamic SuperMemo interval engine.",
    },
    {
      icon: <LineChart className="w-5 h-5 text-emerald-400" />,
      title: "Career Placement Tracker",
      desc: "Track placement matches for Google, Amazon, Meta, and others, with tailored skill gap reports based on your solve depth.",
    },
    {
      icon: <PlayCircle className="w-5 h-5 text-rose-400" />,
      title: "Algorithm Visualizer",
      desc: "Interact with live BFS/DFS graph traversals. Step through operations to visualize active Queue and Stack memory structures.",
    },
    {
      icon: <Award className="w-5 h-5 text-indigo-400" />,
      title: "Certification Milestones",
      desc: "Earn verified master badges for completed learning tracks to track your curriculum milestones securely.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-violet-400" />,
      title: "Secure Account Vault",
      desc: "Protect your dashboard progress. Fast, secure email and password authentication powered by Firebase handles your records safely.",
    },
  ];

  const handleTabChange = (signUpMode: boolean) => {
    setIsSignUp(signUpMode);
    setLocalError(null);
    setExternalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setExternalError(null);

    // Basic Validation
    if (!email.trim() || !password.trim()) {
      setLocalError("Please fill out all required fields.");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    if (isSignUp && !name.trim()) {
      setLocalError("Please enter your name.");
      return;
    }

    try {
      if (isSignUp) {
        await onEmailRegister(email, password, name);
      } else {
        await onEmailLogin(email, password);
      }
    } catch (err: any) {
      // Error will be captured and passed by App.tsx, but in case of local exceptions, handle them
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Hero Section with Auth Container side-by-side on large screens */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading and description */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold select-none"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Powered by Gemini 2.5 & PostgreSQL
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight"
            >
              Personalized <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">DSA Learning Path</span> Generator
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium"
            >
              Accelerate your LeetCode grind. Log your solved problems, let AI identify your weak areas, generate customized roadmaps, and review tasks dynamically with spaced repetition.
            </motion.p>
          </div>

          {/* Right Column: Glassmorphism Auth Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5 w-full max-w-md mx-auto"
            id="auth-card-container"
          >
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-950">
              
              {/* Tab Toggles */}
              <div className="flex border-b border-slate-800 pb-4 mb-6" id="auth-tabs">
                <button
                  type="button"
                  id="tab-signin-btn"
                  onClick={() => handleTabChange(false)}
                  className={`flex-1 pb-2.5 text-center font-bold text-sm border-b-2 transition-all cursor-pointer ${
                    !isSignUp
                      ? "text-indigo-400 border-indigo-500"
                      : "text-slate-400 border-transparent hover:text-slate-200"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  id="tab-signup-btn"
                  onClick={() => handleTabChange(true)}
                  className={`flex-1 pb-2.5 text-center font-bold text-sm border-b-2 transition-all cursor-pointer ${
                    isSignUp
                      ? "text-indigo-400 border-indigo-500"
                      : "text-slate-400 border-transparent hover:text-slate-200"
                  }`}
                >
                  Register
                </button>
              </div>

              {/* Error Banners */}
              {(localError || externalError) && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs font-semibold flex items-start gap-2.5 mb-6 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-normal">{localError || externalError}</span>
                </div>
              )}

              {/* Form fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {isSignUp && (
                  <div className="space-y-1.5" id="name-field-group">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Your Name
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        id="reg-name-input"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5" id="email-field-group">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="auth-email-input"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5" id="password-field-group">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="auth-password-input"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                      <span>{isSignUp ? "Create Account" : "Sign In to DSA Practice Tracker"}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Note on manual enabling */}
              <p className="text-[10px] text-slate-500 mt-6 leading-relaxed text-center">
                Email/Password provider must be enabled in your Firebase Auth dashboard.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Features Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-20 w-full text-left" id="features-grid">
          {features.map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 * idx }}
              className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 hover:bg-slate-900/60 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center mb-4">
                  {feat.icon}
                </div>
                <h3 className="font-bold text-white text-base mb-2">{feat.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed font-medium">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 py-6 text-center text-xs text-slate-500 font-medium">
        DSA Learning Path Generator • Secured by Firebase Authentication & PostgreSQL
      </footer>
    </div>
  );
}
