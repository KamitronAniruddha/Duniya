/**
 * @fileOverview Core logic for the Duniya XP and Leveling system.
 * Handles XP calculations, level thresholds, and point distributions.
 */

import { Firestore, doc, collection, increment } from 'firebase/firestore';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export const XP_PER_LEVEL = 1000;

export interface XPState {
  xp: number;
  level: number;
  xpBreakdown: {
    chatting: number;
    presence: number;
    genesis: number;
  };
}

/**
 * Calculates the current level based on total XP.
 * Uses a linear progression for clarity in this version.
 */
export function calculateLevel(xp: number): number {
  return Math.floor(xp / (XP_PER_LEVEL || 1000)) + 1;
}

/**
 * Returns the XP needed to reach the next level from the current total.
 */
export function getXPToNextLevel(xp: number): number {
  const currentLevel = calculateLevel(xp);
  const nextLevelThreshold = currentLevel * (XP_PER_LEVEL || 1000);
  return nextLevelThreshold - xp;
}

/**
 * Returns the percentage progress through the current level.
 */
export function getLevelProgress(xp: number): number {
  const xpInCurrentLevel = xp % (XP_PER_LEVEL || 1000);
  return (xpInCurrentLevel / (XP_PER_LEVEL || 1000)) * 100;
}

/**
 * Returns a rank title based on level.
 */
export function getRankTitle(level: number): string {
  if (level >= 100) return "Singularity";
  if (level >= 75) return "Ancient";
  if (level >= 50) return "Architect";
  if (level >= 25) return "Sentinel";
  if (level >= 10) return "Acolyte";
  return "Initiate";
}

/**
 * XP Distribution Rules:
 * - Message Send: 10 XP base + (Length / 10) XP
 * - Passive Online (per 5 min): 5 XP
 * - Genesis Community Creation: 500 XP
 * - First Login of Day: 100 XP + (Streak * 10)
 */
export const XP_REWARDS = {
  MESSAGE_BASE: 10,
  MESSAGE_PER_CHAR: 0.1,
  PASSIVE_HEARTBEAT: 5, // Per 5 minutes
  GENESIS_CREATION: 500,
  DAILY_LOGIN_BASE: 100,
  STREAK_BONUS: 10,
};

/**
 * Award XP to a user and log it in history (Non-Blocking).
 */
export function awardXP(
  db: Firestore,
  userId: string,
  amount: number,
  type: 'chatting' | 'presence' | 'genesis',
  reason: string
) {
  if (!db || !userId || amount <= 0) return;

  const userRef = doc(db, "users", userId);
  const historyRef = collection(db, "users", userId, "xp_history");

  // Update user totals and breakdown
  updateDocumentNonBlocking(userRef, {
    xp: increment(Math.floor(amount)),
    [`xpBreakdown.${type}`]: increment(Math.floor(amount)),
    updatedAt: new Date().toISOString()
  });

  // Log history entry with precise timestamp
  addDocumentNonBlocking(historyRef, {
    userId,
    type,
    reason,
    amount: Math.floor(amount),
    timestamp: new Date().toISOString()
  });
}
