import React, { useState } from "react";
import { Briefcase, Award, TrendingUp, AlertCircle, CheckCircle2, Medal } from "lucide-react";
import { User, PlacementChance, Roadmap } from "../types.ts";

interface PlacementTrackerProps {
  user: User;
  chances: PlacementChance[];
  roadmaps: Roadmap[];
  token: string;
  onTargetUpdated: () => void;
}

export default function PlacementTracker({
  user,
  chances,
  roadmaps,
  token,
  onTargetUpdated,
}: PlacementTrackerProps) {
  const [targetCompany, setTargetCompany] = useState(user?.targetCompany || "FAANG");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Identify completed roadmaps to award badges!
  const completedRoadmaps = roadmaps.filter((r) => {
    if (r.items.length === 0) return false;
    return r.items.every((item) => item.status === "Completed");
  });

  const handleUpdateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      const res = await fetch("/api/user/target", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetCompany }),
      });

      if (!res.ok) throw new Error("Failed to update target.");
      setSuccess(true);
      onTargetUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Target Company Selector & Placement Chances */}
      <div className="lg:col-span-2 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Placement Probability</h3>
                <p className="text-xs text-slate-400">Estimated interview clearance chance according to solved DSA logs.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateTarget} className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Target e.g. Netflix"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900 text-white font-bold"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border border-indigo-500/20"
              >
                {loading ? "..." : "Set Target"}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {chances.map((c, idx) => (
              <div
                key={idx}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden transition-all hover:border-slate-700"
              >
                {/* Radial accent indicator */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-lg"></div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{c.companyName}</span>
                    <span className="text-[9px] bg-slate-900 text-slate-300 font-bold px-2 py-0.5 rounded-full border border-slate-850">
                      Match Score
                    </span>
                  </div>

                  {/* Percentage with visual loading bar */}
                  <div className="my-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-indigo-400">
                        {c.chancePercentage}%
                      </span>
                      <span className="text-slate-400 text-[10px] font-bold">chance</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${c.chancePercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    {c.reason}
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-2.5 mt-2.5">
                  <div className="text-[10px] font-bold text-amber-400 bg-amber-500/10 rounded-md px-2.5 py-1.5 flex items-start gap-1.5 border border-amber-500/20">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Gap: {c.skillGap}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Certification Badges Panel */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 flex flex-col shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-4">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Earned Certifications</h3>
            <p className="text-xs text-slate-400">Mastery credentials unlocked by completing tracks.</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {completedRoadmaps.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3">
                <Medal className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-white">No Badges Unlocked Yet</span>
              <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto mt-1 leading-normal font-medium">
                Finish all roadmap steps within any AI curriculum track to generate your verification badge!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedRoadmaps.map((r) => (
                <div
                  key={r.id}
                  className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/25 rounded-lg p-3.5 flex items-center gap-3 shadow-xs relative"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs shrink-0 animate-bounce">
                    <Award className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-amber-400">Track Mastery Badge</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <span className="block font-bold text-white text-sm mt-0.5 leading-snug">
                      {r.trackName}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                      Verified Completion • Gold Level
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
