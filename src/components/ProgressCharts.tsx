import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { BarChart3, PieChart as PieChartIcon, ShieldAlert } from "lucide-react";
import { Problem, Weakness } from "../types.ts";

interface ProgressChartsProps {
  problems: Problem[];
  weaknesses: Weakness[];
}

export default function ProgressCharts({ problems, weaknesses }: ProgressChartsProps) {
  // 1. Calculate difficulty breakdown
  const easyCount = problems.filter((p) => p.difficulty === "Easy").length;
  const mediumCount = problems.filter((p) => p.difficulty === "Medium").length;
  const hardCount = problems.filter((p) => p.difficulty === "Hard").length;

  const difficultyData = [
    { name: "Easy", value: easyCount, color: "#10b981" },
    { name: "Medium", value: mediumCount, color: "#f59e0b" },
    { name: "Hard", value: hardCount, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  // Fallback if no problems are solved yet
  const displayDiffData =
    difficultyData.length > 0
      ? difficultyData
      : [
          { name: "No Solved Data", value: 1, color: "#cbd5e1" },
        ];

  // 2. Weekly volume breakdown
  // Let's count solved problems per topic category
  const topicCounts: Record<string, number> = {};
  problems.forEach((p) => {
    topicCounts[p.topic] = (topicCounts[p.topic] || 0) + 1;
  });

  const topicData = Object.entries(topicCounts).map(([name, count]) => ({
    topic: name,
    solved: count,
  })).slice(0, 6); // show top 6

  const displayTopicData =
    topicData.length > 0
      ? topicData
      : [
          { topic: "Arrays", solved: 0 },
          { topic: "DP", solved: 0 },
          { topic: "Graphs", solved: 0 },
          { topic: "Trees", solved: 0 },
        ];

  // 3. Weakness Radar data
  const radarData = weaknesses.map((w) => ({
    subject: w.topic,
    weaknessScore: w.weaknessScore, // 0 to 100
  }));

  const displayRadarData =
    radarData.length > 0
      ? radarData
      : [
          { subject: "Graphs", weaknessScore: 40 },
          { subject: "DP", weaknessScore: 30 },
          { subject: "Trees", weaknessScore: 50 },
          { subject: "Arrays", weaknessScore: 20 },
        ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Solve Difficulty Breakdown */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 flex flex-col h-[320px] shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
          <PieChartIcon className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-sm text-white">Solve Difficulty Ratio</span>
        </div>
        <div className="flex-1 min-h-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={displayDiffData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {displayDiffData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px", color: "#f8fafc" }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
            </PieChart>
          </ResponsiveContainer>

          {problems.length > 0 && (
            <div className="absolute top-[43%] left-[50%] -translate-x-[50%] -translate-y-[50%] text-center select-none">
              <span className="text-2xl font-bold text-white">{problems.length}</span>
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Solved</span>
            </div>
          )}
        </div>
      </div>

      {/* Top Solved Topics */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 flex flex-col h-[320px] shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-sm text-white">Solved Volume by Topic</span>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayTopicData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="topic" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px", color: "#f8fafc" }} />
              <Bar dataKey="solved" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI-Detected Weaknesses */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 flex flex-col h-[320px] shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
          <ShieldAlert className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-sm text-white">AI-Detected Weakness Scores</span>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={displayRadarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={8} />
              <Radar
                name="Weakness Level"
                dataKey="weaknessScore"
                stroke="#818cf8"
                fill="#6366f1"
                fillOpacity={0.3}
              />
              <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px", color: "#f8fafc" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
