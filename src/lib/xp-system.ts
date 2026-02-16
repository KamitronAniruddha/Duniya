/**
 * @fileOverview Core logic for the Duniya XP and Leveling system.
 * Handles XP calculations, level thresholds, rank titles, and history distribution.
 */

import { Firestore, doc, collection, increment, serverTimestamp } from 'firebase/firestore';
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
 */
export function calculateLevel(xp: number): number {
  return Math.floor((xp || 0) / XP_PER_LEVEL) + 1;
}

/**
 * Returns the XP needed to reach the next level.
 */
export function getXPToNextLevel(xp: number): number {
  const currentLevel = calculateLevel(xp);
  const nextLevelThreshold = currentLevel * XP_PER_LEVEL;
  return nextLevelThreshold - (xp || 0);
}

/**
 * Returns the percentage progress through the current level.
 */
export function getLevelProgress(xp: number): number {
  const xpInCurrentLevel = (xp || 0) % XP_PER_LEVEL;
  return (xpInCurrentLevel / XP_PER_LEVEL) * 100;
}

/**
 * Returns a rank title based on level.
 */
export function getRankTitle(level: number): string {
  if (level >= 100) return "Universal Singularity";
  if (level >= 75) return "Ancient Spirit";
  if (level >= 50) return "Verse Architect";
  if (level >= 25) return "Elite Sentinel";
  if (level >= 10) return "Core Acolyte";
  return "Verse Initiate";
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
  PASSIVE_HEARTBEAT: 5,
  GENESIS_CREATION: 500,
  DAILY_LOGIN_BASE: 100,
  STREAK_BONUS: 10,
};

/**
 * Award XP to a user and log it in history (Non-Blocking).
 * Maintains a detailed lineage of every point gained.
 */
export function awardXP(
  db: Firestore,
  userId: string,
  amount: number,
  type: 'chatting' | 'presence' | 'genesis' | 'bonus',
  reason: string
) {
  if (!db || !userId || amount <= 0) return;

  const userRef = doc(db, "users", userId);
  const historyRef = collection(db, "users", userId, "xp_history");

  const finalAmount = Math.floor(amount);

  // Update user totals and breakdown
  updateDocumentNonBlocking(userRef, {
    xp: increment(finalAmount),
    [`xpBreakdown.${type}`]: increment(finalAmount),
    updatedAt: new Date().toISOString()
  });

  // Log history entry with millisecond precision
  addDocumentNonBlocking(historyRef, {
    userId,
    type,
    reason,
    amount: finalAmount,
    timestamp: new Date().toISOString(),
    displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    displayDate: new Date().toLocaleDateString()
  });
}
