import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

export interface ProblemLog {
  problemTitle: string;
  problemUrl?: string | null;
  difficulty: string;
  topic: string;
  notes?: string | null;
  solvedAt: Date;
}

export interface AnalysisResult {
  weaknesses: {
    topic: string;
    weaknessScore: number; // 0 to 100 (high means weak)
    explanation: string;
    suggestedFocus: string;
  }[];
  roadmap: {
    trackName: string;
    description: string;
    items: {
      title: string;
      description: string;
      resourceLink: string;
    }[];
  }[];
  placementChances: {
    companyName: string;
    chancePercentage: number;
    reason: string;
    skillGap: string;
  }[];
}

export async function generateDSAPath(
  problems: ProblemLog[],
  targetCompany: string
): Promise<AnalysisResult> {
  const ai = getAI();

  // Create description of solved problems
  const problemsDescription = problems.length > 0
    ? problems.map(p => `- ${p.problemTitle} (${p.topic}) - Difficulty: ${p.difficulty}. Notes: ${p.notes || "None"}`).join("\n")
    : "No problems solved yet. User is just getting started.";

  const prompt = `
You are an elite Tech Interview Coach and DSA Mentor. Your task is to analyze a student's LeetCode solve history, weak spots, and target company, then generate:
1. Weakness Analysis: Identify 2-3 weak topics (e.g. Graphs, Dynamic Programming, Trees) with a weakness score (1-100, where 100 is extremely weak/lacking) and a crisp concept explanation.
2. Personalized Roadmap: Generate a structured roadmap (1-2 tracks, with 3-4 problem milestones/learning topics each) to master these weaknesses. Specify clear descriptions and online resource search queries (like "https://www.geeksforgeeks.org/binary-tree-data-structure/") or standard Leetcode problems.
3. Placement Chances: Estimate the user's probability of getting a job at these standard companies: "${targetCompany}", "Google", "Amazon", "Meta", "Stripe", "Netflix" (or similar prominent tech companies) based on their DSA solved statistics, skill levels, and depth. Provide a percentage (0-100), reasoning, and key skill gaps.

Target Company specified by user: ${targetCompany}

User's solved problems:
${problemsDescription}

Return your response strictly as a JSON object matching the following structure (do not include markdown wrapping other than raw JSON):
{
  "weaknesses": [
    {
      "topic": "Topic Name",
      "weaknessScore": 75,
      "explanation": "Brief clear concept explanation of why they are struggling or what the topic entails.",
      "suggestedFocus": "What they should practice next."
    }
  ],
  "roadmap": [
    {
      "trackName": "Track Title (e.g. Tree Traversals Mastery)",
      "description": "General description of this practice track.",
      "items": [
        {
          "title": "Concept or Problem Name",
          "description": "Short explanation of what to learn or do.",
          "resourceLink": "A high-quality documentation URL or search link"
        }
      ]
    }
  ],
  "placementChances": [
    {
      "companyName": "Company Name",
      "chancePercentage": 45,
      "reason": "Specific reasoning linking their solved stats and weaknesses to the company interview standard.",
      "skillGap": "Top skill gap they need to bridge."
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini.");
    }

    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Error in generateDSAPath service:", error);
    // Fallback static analysis if AI fails
    return {
      weaknesses: [
        {
          topic: "Graphs",
          weaknessScore: 80,
          explanation: "Graphs represent networks of nodes and edges. Understanding depth-first search (DFS) and breadth-first search (BFS) is critical for standard network traversals.",
          suggestedFocus: "Implement BFS and DFS on standard adjacency lists."
        },
        {
          topic: "Dynamic Programming",
          weaknessScore: 70,
          explanation: "Dynamic Programming relies on breaking problems into overlapping subproblems and memoizing results.",
          suggestedFocus: "Solve 1D DP problems like Climbing Stairs and Fibonacci before moving to 2D DP."
        }
      ],
      roadmap: [
        {
          trackName: "Graph Fundamentals",
          description: "Establish strong foundations in Graph traversals and network structures.",
          items: [
            {
              title: "Breadth-First Search (BFS) Implementation",
              description: "Understand level-order traversal on a graph starting from a source node.",
              resourceLink: "https://www.geeksforgeeks.org/breadth-first-search-or-bfs-for-a-graph/"
            },
            {
              title: "Depth-First Search (DFS) Implementation",
              description: "Understand recursive backtracking to visit nodes as deep as possible.",
              resourceLink: "https://www.geeksforgeeks.org/depth-first-search-or-dfs-for-a-graph/"
            }
          ]
        }
      ],
      placementChances: [
        {
          companyName: targetCompany || "FAANG",
          chancePercentage: 35,
          reason: "Needs more medium and hard problem solve counts in tree and graph topics to comfortably pass technical screens.",
          skillGap: "Lack of deep graph traversal knowledge."
        },
        {
          companyName: "Google",
          chancePercentage: 20,
          reason: "Google heavily focuses on complex graph, tree, and DP algorithms with clean, optimal code.",
          skillGap: "Dynamic programming and advanced graphs."
        }
      ]
    };
  }
}
