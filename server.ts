import express from "express";
import path from "path";
import dotenv from "dotenv";
import cron from "node-cron";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import {
  users,
  problemsLogged,
  userWeaknesses,
  learningRoadmaps,
  roadmapItems,
  reminders,
} from "./src/db/schema.ts";
import { getOrCreateUser, findUserByEmail, createUser } from "./src/db/users.ts";
import { verifyPassword } from "./src/lib/crypto.ts";
import jwt from "jsonwebtoken";
import { generateDSAPath } from "./src/services/gemini.ts";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { eq, and, desc, lte } from "drizzle-orm";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// -------------------------------------------------------------------------
// Spaced Repetition engine background cron job
// -------------------------------------------------------------------------
cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();
    console.log(`[Cron Job] Spaced Repetition Engine running at ${now.toISOString()}`);
    
    // Scan for pending reminders that are past their review date
    const dueReminders = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.status, "Pending"),
          lte(reminders.nextReviewAt, now)
        )
      );

    if (dueReminders.length > 0) {
      console.log(`[Cron Job] Spaced Repetition Notification: ${dueReminders.length} problems are due for review!`);
    } else {
      console.log("[Cron Job] No problems are due for review right now.");
    }
  } catch (err) {
    console.error("[Cron Job Error] Failed to scan reminders:", err);
  }
});

// -------------------------------------------------------------------------
// Helper: SuperMemo SM-2 algorithm for spaced repetition
// -------------------------------------------------------------------------
function calculateNextReview(intervalDays: number, easeFactor: number, quality: number) {
  let newInterval = 1;
  let newEaseFactor = easeFactor;

  if (quality >= 3) {
    if (intervalDays === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intervalDays * easeFactor);
    }
    // Update ease factor
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    newInterval = 1;
    newEaseFactor = easeFactor - 0.2;
  }

  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  // Calculate review date
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    nextReviewAt,
    intervalDays: newInterval,
    easeFactor: newEaseFactor,
  };
}

// -------------------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET || 'dsa-learning-path-super-secret-key-2026';

// A. Register Endpoint
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required." });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "This email address is already registered." });
    }

    const newUser = await createUser(email, name, password);

    // Sign JWT
    const token = jwt.sign(
      { uid: newUser.uid, email: newUser.email, name: newUser.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        uid: newUser.uid,
        email: newUser.email,
        name: newUser.name,
        targetCompany: newUser.targetCompany,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message || "Failed to register user." });
  }
});

// B. Login Endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const userRecord = await findUserByEmail(email);
    if (!userRecord || !userRecord.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = verifyPassword(password, userRecord.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Sign JWT
    const token = jwt.sign(
      { uid: userRecord.uid, email: userRecord.email, name: userRecord.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.name,
        targetCompany: userRecord.targetCompany,
        createdAt: userRecord.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message || "Failed to sign in." });
  }
});

// 1. Auth synchronization: Sync user with SQL DB
app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid } = req.user!;
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid));

    if (userRecord.length === 0) {
      return res.status(404).json({ error: "User profile not found." });
    }

    res.json({ success: true, user: userRecord[0] });
  } catch (error: any) {
    console.error("Auth sync error:", error);
    res.status(500).json({ error: error.message || "Failed to sync user session." });
  }
});

// 2. Fetch logged problems
app.get("/api/problems", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.uid, req.user!.uid));

    if (userRecord.length === 0) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const userId = userRecord[0].id;
    const list = await db
      .select()
      .from(problemsLogged)
      .where(eq(problemsLogged.userId, userId))
      .orderBy(desc(problemsLogged.solvedAt));

    res.json({ success: true, problems: list });
  } catch (error: any) {
    console.error("Fetch problems error:", error);
    res.status(500).json({ error: "Failed to fetch logged problems." });
  }
});

// 3. Log a new solved problem (and automatically schedule standard SM-2 reminder)
app.post("/api/problems", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.uid, req.user!.uid));

    if (userRecord.length === 0) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const userId = userRecord[0].id;
    const { problemTitle, problemUrl, difficulty, topic, notes, timeSpentMinutes } = req.body;

    if (!problemTitle || !difficulty || !topic) {
      return res.status(400).json({ error: "Problem title, difficulty, and topic are required fields." });
    }

    // Insert problem solve record
    const result = await db
      .insert(problemsLogged)
      .values({
        userId,
        problemTitle,
        problemUrl: problemUrl || null,
        difficulty,
        topic,
        notes: notes || null,
        timeSpentMinutes: timeSpentMinutes ? parseInt(timeSpentMinutes) : 30,
      })
      .returning();

    // Create automatic spaced-repetition reminder (starts with 1 day interval)
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + 1); // 1 day interval

    await db.insert(reminders).values({
      userId,
      problemTitle,
      topic,
      nextReviewAt,
      intervalDays: 1,
      easeFactor: 2.5,
      status: "Pending",
    });

    res.json({ success: true, problem: result[0] });
  } catch (error: any) {
    console.error("Log problem error:", error);
    res.status(500).json({ error: "Failed to log solved problem." });
  }
});

// 4. Delete logged problem
app.post("/api/problems/:id/delete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.uid, req.user!.uid));

    if (userRecord.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const userId = userRecord[0].id;
    const problemId = parseInt(req.params.id);

    await db
      .delete(problemsLogged)
      .where(and(eq(problemsLogged.id, problemId), eq(problemsLogged.userId, userId)));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete problem error:", error);
    res.status(500).json({ error: "Failed to delete problem." });
  }
});

// 5. Update target company
app.post("/api/user/target", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { targetCompany } = req.body;
    if (!targetCompany) {
      return res.status(400).json({ error: "Target company is required." });
    }

    await db
      .update(users)
      .set({ targetCompany })
      .where(eq(users.uid, req.user!.uid));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Update target error:", error);
    res.status(500).json({ error: "Failed to update target company." });
  }
});

// 6. Gemini AI trigger: Analyze solved problems and generate roadmaps, weaknesses, and placement chances
app.post("/api/analyze", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.uid, req.user!.uid));

    if (userRecord.length === 0) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const user = userRecord[0];
    const userId = user.id;

    // Fetch user solved problems
    const solved = await db
      .select()
      .from(problemsLogged)
      .where(eq(problemsLogged.userId, userId));

    // Call Gemini to generate the path
    const analysis = await generateDSAPath(solved, user.targetCompany || "FAANG");

    // Persist weaknesses
    await db.delete(userWeaknesses).where(eq(userWeaknesses.userId, userId));
    for (const w of analysis.weaknesses) {
      await db.insert(userWeaknesses).values({
        userId,
        topic: w.topic,
        weaknessScore: w.weaknessScore,
        explanation: w.explanation,
        suggestedFocus: w.suggestedFocus,
      });
    }

    // Persist learning roadmap (replace old roadmap to avoid clashing)
    await db.delete(learningRoadmaps).where(eq(learningRoadmaps.userId, userId));
    for (const r of analysis.roadmap) {
      const roadmapResult = await db
        .insert(learningRoadmaps)
        .values({
          userId,
          trackName: r.trackName,
          description: r.description,
          status: "In Progress",
        })
        .returning();

      const roadmapId = roadmapResult[0].id;

      // Insert roadmap items
      for (let i = 0; i < r.items.length; i++) {
        const item = r.items[i];
        await db.insert(roadmapItems).values({
          roadmapId,
          title: item.title,
          description: item.description,
          resourceLink: item.resourceLink || null,
          orderIndex: i,
          status: "Pending",
        });
      }
    }

    res.json({ success: true, analysis });
  } catch (error: any) {
    console.error("AI Analysis error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze DSA metrics." });
  }
});

// 7. Toggle roadmap item completion
app.post("/api/roadmap-items/:id/toggle", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.uid, req.user!.uid));

    if (userRecord.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const itemId = parseInt(req.params.id);
    const { status } = req.body; // 'Completed' or 'Pending'

    await db
      .update(roadmapItems)
      .set({ status })
      .where(eq(roadmapItems.id, itemId));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Toggle item error:", error);
    res.status(500).json({ error: "Failed to update item state." });
  }
});

// 8. Fetch active spaced-repetition reminders
app.get("/api/reminders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.uid, req.user!.uid));

    if (userRecord.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const userId = userRecord[0].id;
    const list = await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId))
      .orderBy(desc(reminders.nextReviewAt));

    res.json({ success: true, reminders: list });
  } catch (error: any) {
    console.error("Fetch reminders error:", error);
    res.status(500).json({ error: "Failed to fetch reminders." });
  }
});

// 9. Review reminder (calculates next date using SM-2)
app.post("/api/reminders/:id/review", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.uid, req.user!.uid));

    if (userRecord.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const reminderId = parseInt(req.params.id);
    const { rating } = req.body; // rating from 0 to 5

    if (rating === undefined || rating < 0 || rating > 5) {
      return res.status(400).json({ error: "Quality score rating (0-5) is required." });
    }

    const reminderRecord = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, reminderId));

    if (reminderRecord.length === 0) {
      return res.status(404).json({ error: "Reminder record not found." });
    }

    const rem = reminderRecord[0];
    const { nextReviewAt, intervalDays, easeFactor } = calculateNextReview(
      rem.intervalDays,
      rem.easeFactor,
      rating
    );

    await db
      .update(reminders)
      .set({
        nextReviewAt,
        intervalDays,
        easeFactor,
        status: "Reviewed",
      })
      .where(eq(reminders.id, reminderId));

    res.json({ success: true, nextReviewAt, intervalDays });
  } catch (error: any) {
    console.error("Review reminder error:", error);
    res.status(500).json({ error: "Failed to update spaced repetition schedule." });
  }
});

// 10. Dashboard Aggregate Data (fetches everything needed in one request)
app.get("/api/dashboard", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.uid, req.user!.uid));

    if (userRecord.length === 0) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const user = userRecord[0];
    const userId = user.id;

    // Problems
    const problems = await db
      .select()
      .from(problemsLogged)
      .where(eq(problemsLogged.userId, userId))
      .orderBy(desc(problemsLogged.solvedAt));

    // Weaknesses
    const weaknesses = await db
      .select()
      .from(userWeaknesses)
      .where(eq(userWeaknesses.userId, userId));

    // Roadmaps
    const roadmapsRaw = await db
      .select()
      .from(learningRoadmaps)
      .where(eq(learningRoadmaps.userId, userId))
      .orderBy(desc(learningRoadmaps.createdAt));

    const roadmaps = [];
    for (const r of roadmapsRaw) {
      const items = await db
        .select()
        .from(roadmapItems)
        .where(eq(roadmapItems.roadmapId, r.id))
        .orderBy(roadmapItems.orderIndex);
      roadmaps.push({ ...r, items });
    }

    // Active Spaced Repetition Due Count
    const now = new Date();
    const dueReminders = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          eq(reminders.status, "Pending"),
          lte(reminders.nextReviewAt, now)
        )
      );

    // Dynamic placement calculations
    // If no problems solved, default is lower. More problems -> higher chance.
    const solveCount = problems.length;
    const targetCompany = user.targetCompany || "FAANG";
    
    // Static placement chances fallback if Gemini analysis has not been executed yet
    const placementChances = [
      {
        companyName: targetCompany,
        chancePercentage: Math.min(15 + solveCount * 3, 90),
        reason: solveCount < 5 
          ? "Solve volume is relatively low. Expand list to reveal stronger skill levels." 
          : "Solve stats indicate an active grind. Continuous practice of dynamic programming and graphs will push this higher.",
        skillGap: solveCount < 5 ? "Consistent streak length" : "Highly advanced Tree algorithms",
      },
      {
        companyName: "Google",
        chancePercentage: Math.min(5 + solveCount * 1.5, 85),
        reason: "Requires outstanding performance in complex structural graphs, concurrency, and recursive DP.",
        skillGap: "Optimal runtime and memory scaling proofs",
      },
      {
        companyName: "Amazon",
        chancePercentage: Math.min(10 + solveCount * 2.5, 90),
        reason: "Heavy emphasis on System Design, queues, and tree-structures.",
        skillGap: "Tree-balancing and hashing dynamics",
      }
    ];

    res.json({
      success: true,
      user,
      problems,
      weaknesses,
      roadmaps,
      dueRemindersCount: dueReminders.length,
      placementChances,
    });
  } catch (error: any) {
    console.error("Fetch dashboard aggregates error:", error);
    res.status(500).json({ error: "Failed to aggregate dashboard metrics." });
  }
});


// -------------------------------------------------------------------------
// Vite Dev Server / Static Ingress
// -------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
