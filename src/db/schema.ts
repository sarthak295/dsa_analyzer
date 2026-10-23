import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, real, boolean } from 'drizzle-orm/pg-core';

// 1. Users table (stores Firebase Auth synced users)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  targetCompany: text('target_company').default('FAANG'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  passwordHash: text('password_hash'),
});

// 2. Solved/Logged LeetCode problems
export const problemsLogged = pgTable('problems_logged', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  problemTitle: text('problem_title').notNull(),
  problemUrl: text('problem_url'),
  difficulty: text('difficulty').notNull(), // 'Easy', 'Medium', 'Hard'
  topic: text('topic').notNull(), // e.g. 'Graphs', 'Trees', 'DP', 'Arrays', 'Recursion', 'Strings'
  notes: text('notes'),
  timeSpentMinutes: integer('time_spent_minutes').default(30),
  solvedAt: timestamp('solved_at').defaultNow().notNull(),
});

// 3. User Weaknesses (analyzed via Gemini AI based on LeetCode logs)
export const userWeaknesses = pgTable('user_weaknesses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  topic: text('topic').notNull(),
  weaknessScore: integer('weakness_score').notNull(), // 0 to 100, higher is weaker
  explanation: text('explanation').notNull(), // Conceptual breakdown by AI
  suggestedFocus: text('suggested_focus').notNull(),
  analyzedAt: timestamp('analyzed_at').defaultNow().notNull(),
});

// 4. Learning Roadmaps (generated via Gemini AI)
export const learningRoadmaps = pgTable('learning_roadmaps', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  trackName: text('track_name').notNull(), // e.g., 'Tree Traversals and Binary Search Trees'
  description: text('description').notNull(),
  status: text('status').notNull().default('In Progress'), // 'Not Started', 'In Progress', 'Completed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// 5. Roadmap Items (individual milestones/problems in the roadmap)
export const roadmapItems = pgTable('roadmap_items', {
  id: serial('id').primaryKey(),
  roadmapId: integer('roadmap_id')
    .references(() => learningRoadmaps.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  resourceLink: text('resource_link'),
  orderIndex: integer('order_index').notNull(),
  status: text('status').notNull().default('Pending'), // 'Pending', 'Completed'
});

// 6. Reminders (Spaced-Repetition Review Schedule)
export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  problemTitle: text('problem_title').notNull(),
  topic: text('topic').notNull(),
  nextReviewAt: timestamp('next_review_at').notNull(),
  intervalDays: integer('interval_days').notNull().default(1), // e.g. 1, 3, 7, 14, 30 days
  easeFactor: real('ease_factor').notNull().default(2.5),
  status: text('status').notNull().default('Pending'), // 'Pending', 'Reviewed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  problems: many(problemsLogged),
  weaknesses: many(userWeaknesses),
  roadmaps: many(learningRoadmaps),
  reminders: many(reminders),
}));

export const problemsLoggedRelations = relations(problemsLogged, ({ one }) => ({
  user: one(users, {
    fields: [problemsLogged.userId],
    references: [users.id],
  }),
}));

export const userWeaknessesRelations = relations(userWeaknesses, ({ one }) => ({
  user: one(users, {
    fields: [userWeaknesses.userId],
    references: [users.id],
  }),
}));

export const learningRoadmapsRelations = relations(learningRoadmaps, ({ many, one }) => ({
  items: many(roadmapItems),
  user: one(users, {
    fields: [learningRoadmaps.userId],
    references: [users.id],
  }),
}));

export const roadmapItemsRelations = relations(roadmapItems, ({ one }) => ({
  roadmap: one(learningRoadmaps, {
    fields: [roadmapItems.roadmapId],
    references: [learningRoadmaps.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),
}));
