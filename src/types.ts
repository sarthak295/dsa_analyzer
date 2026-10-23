export interface User {
  id: number;
  uid: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  targetCompany: string;
  createdAt: string;
}

export interface Problem {
  id: number;
  userId: number;
  problemTitle: string;
  problemUrl: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  notes: string | null;
  timeSpentMinutes: number;
  solvedAt: string;
}

export interface Weakness {
  id: number;
  userId: number;
  topic: string;
  weaknessScore: number;
  explanation: string;
  suggestedFocus: string;
  analyzedAt: string;
}

export interface RoadmapItem {
  id: number;
  roadmapId: number;
  title: string;
  description: string;
  resourceLink: string | null;
  orderIndex: number;
  status: 'Pending' | 'Completed';
}

export interface Roadmap {
  id: number;
  userId: number;
  trackName: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  createdAt: string;
  completedAt: string | null;
  items: RoadmapItem[];
}

export interface Reminder {
  id: number;
  userId: number;
  problemTitle: string;
  topic: string;
  nextReviewAt: string;
  intervalDays: number;
  easeFactor: number;
  status: 'Pending' | 'Reviewed';
  createdAt: string;
}

export interface PlacementChance {
  companyName: string;
  chancePercentage: number;
  reason: string;
  skillGap: string;
}

export interface DashboardData {
  user: User;
  problems: Problem[];
  weaknesses: Weakness[];
  roadmaps: Roadmap[];
  dueRemindersCount: number;
  placementChances: PlacementChance[];
}
