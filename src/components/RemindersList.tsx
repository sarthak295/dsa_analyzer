import { useState, useEffect } from "react";
import { Clock, CheckSquare, Award, AlertCircle, Calendar } from "lucide-react";
import { Reminder } from "../types.ts";

interface RemindersListProps {
  token: string;
  onReviewed: () => void;
}

export default function RemindersList({ token, onReviewed }: RemindersListProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [ratingMap, setRatingMap] = useState<Record<number, number>>({});

  const fetchReminders = async () => {
    try {
      const res = await fetch("/api/reminders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Filter to only display 'Pending' reminders where nextReviewAt is due or close
      const pendingList = (data.reminders || []).filter(
        (rem: Reminder) => rem.status === "Pending"
      );
      setReminders(pendingList);
    } catch (err: any) {
      setError(err.message || "Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [token]);

  const handleReview = async (id: number, rating: number) => {
    setSubmittingId(id);
    try {
      const res = await fetch(`/api/reminders/${id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Refresh list
      await fetchReminders();
      onReviewed();
    } catch (err: any) {
      alert(err.message || "Failed to update review interval.");
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return <div className="p-4 text-xs font-mono text-slate-400">Loading reminders queue...</div>;
  }

  const dueReminders = reminders.filter(
    (rem) => new Date(rem.nextReviewAt) <= new Date()
  );

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Spaced Repetition Queue</h3>
            <p className="text-xs text-slate-400">SM-2 algorithm dynamically intervals reviews to maximize code recall.</p>
          </div>
        </div>
        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full">
          {dueReminders.length} Due Today
        </span>
      </div>

      {dueReminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-950 rounded-xl border border-dashed border-slate-800 p-6">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <Award className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-white">Perfect Streak!</span>
          <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed">
            All algorithms are fully committed to memory. Log more problem solves to feed the SM-2 learning queue.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
          {dueReminders.map((rem) => {
            const isSubmitting = submittingId === rem.id;
            const currentRating = ratingMap[rem.id] || 4;

            return (
              <div
                key={rem.id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-slate-900/40"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{rem.problemTitle}</span>
                    <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                      {rem.topic}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Interval: {rem.intervalDays}d</span>
                    <span>•</span>
                    <span>Factor: {rem.easeFactor.toFixed(1)}</span>
                  </div>
                </div>

                {/* Rating scale selection */}
                <div className="flex flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Recall:
                    </span>
                    {[0, 1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setRatingMap((prev) => ({ ...prev, [rem.id]: rating }))}
                        className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          currentRating === rating
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white"
                        }`}
                        title={
                          rating === 5
                            ? "Perfect Recall"
                            : rating === 3
                            ? "Correct, but very difficult"
                            : rating === 0
                            ? "Complete Blackout"
                            : `Recall level ${rating}`
                        }
                      >
                        {rating}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleReview(rem.id, currentRating)}
                    disabled={isSubmitting}
                    className="w-full md:w-auto self-end bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer border border-indigo-500/20"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {isSubmitting ? "Updating..." : "Mark Reviewed"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
