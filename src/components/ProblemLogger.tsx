import React, { useState } from "react";
import { PlusCircle, Link as LinkIcon, AlertCircle, Sparkles } from "lucide-react";

interface ProblemLoggerProps {
  onSuccess: () => void;
  token: string;
}

const TOPICS = [
  "Arrays & Hashing",
  "Two Pointers",
  "Sliding Window",
  "Stack",
  "Binary Search",
  "Linked List",
  "Trees",
  "Heap / Priority Queue",
  "Backtracking",
  "Graphs",
  "Advanced Graphs",
  "Dynamic Programming",
  "Greedy",
  "Intervals",
  "Math & Geometry",
  "Bit Manipulation",
];

export default function ProblemLogger({ onSuccess, token }: ProblemLoggerProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [timeSpent, setTimeSpent] = useState("30");
  const [notes, setNotes] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Problem title is required.");
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/problems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problemTitle: title,
          problemUrl: url || null,
          difficulty,
          topic,
          notes: notes || null,
          timeSpentMinutes: parseInt(timeSpent) || 30,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log problem.");
      }

      setSuccessMsg("LeetCode problem logged! Spaced repetition scheduled.");
      setTitle("");
      setUrl("");
      setNotes("");
      setTimeSpent("30");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/10 rounded-lg">
          <PlusCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-white text-base">Log Solved Problem</h3>
          <p className="text-xs text-slate-400">Record a solved DSA task and schedule spacing.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Problem Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 3Sum, Course Schedule"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900 transition-all text-white placeholder:text-slate-600"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              LeetCode URL
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <LinkIcon className="w-3.5 h-3.5" />
              </span>
              <input
                type="url"
                placeholder="https://leetcode.com/problems/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900 transition-all text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Topic Category
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900 transition-all text-white"
            >
              {TOPICS.map((t) => (
                <option key={t} value={t} className="bg-slate-950 text-white">
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Difficulty
            </label>
            <div className="flex gap-1.5">
              {["Easy", "Medium", "Hard"].map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff as any)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    difficulty === diff
                      ? diff === "Easy"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : diff === "Medium"
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                        : "bg-rose-500/15 border-rose-500/40 text-rose-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Time Spent (Minutes)
            </label>
            <input
              type="number"
              min="1"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900 transition-all text-white placeholder:text-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Key Learnings / Notes
          </label>
          <textarea
            placeholder="e.g. Used Dijkstra algorithm with custom Min Heap. Time complexity: O(E log V)."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900 transition-all text-white placeholder:text-slate-600"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-rose-400 bg-rose-500/10 p-3 rounded-lg text-xs font-medium border border-rose-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-lg text-xs font-medium border border-emerald-500/20">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer border border-indigo-500/30"
        >
          {loading ? "Logging..." : "Log and Schedule Practice"}
        </button>
      </form>
    </div>
  );
}
