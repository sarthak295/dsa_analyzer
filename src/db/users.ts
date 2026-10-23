import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../lib/crypto.ts';
import crypto from 'crypto';

export async function getOrCreateUser(uid: string, email: string, name?: string, avatarUrl?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name: name || null,
        avatarUrl: avatarUrl || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name: name || null,
          avatarUrl: avatarUrl || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database query failed in getOrCreateUser:", error);
    throw new Error("Failed to sync user with database.", { cause: error });
  }
}

export async function findUserByEmail(email: string) {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));
    return result[0] || null;
  } catch (error) {
    console.error("Database query failed in findUserByEmail:", error);
    throw new Error("Failed to retrieve user.");
  }
}

export async function createUser(email: string, name: string, pass: string) {
  try {
    const uid = 'custom_' + crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(pass);
    const result = await db
      .insert(users)
      .values({
        uid,
        email: email.toLowerCase().trim(),
        name: name || null,
        passwordHash,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database query failed in createUser:", error);
    throw new Error("Failed to create user.");
  }
}

