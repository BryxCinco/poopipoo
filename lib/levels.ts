/**
 * Levels from points. Mirrors calculate_level() in
 * supabase/migrations/0004_gamification.sql — keep the two in sync.
 */

export interface LevelDef {
  level: number;
  name: string;
  /** Points needed to reach this level */
  minPoints: number;
}

export const LEVELS: readonly LevelDef[] = [
  { level: 1, name: "Newbie", minPoints: 0 },
  { level: 2, name: "Explorer", minPoints: 50 },
  { level: 3, name: "Scout", minPoints: 200 },
  { level: 4, name: "Expert", minPoints: 500 },
  { level: 5, name: "Legend", minPoints: 1000 },
];

export const MAX_LEVEL = LEVELS[LEVELS.length - 1].level;

/** Points awarded by the database triggers (shown in the UI as "how to earn"). */
export const POINTS = {
  addRestroom: 10,
  addReview: 5,
  helpfulVote: 1,
} as const;

export function calculateLevel(points: number): number {
  let current = 1;
  for (const def of LEVELS) {
    if (points >= def.minPoints) current = def.level;
  }
  return current;
}

export function getLevelDef(level: number): LevelDef {
  return LEVELS.find((def) => def.level === level) ?? LEVELS[0];
}

export interface LevelProgress {
  current: LevelDef;
  /** null at the max level */
  next: LevelDef | null;
  /** 0–1 progress from the current level to the next (1 at max level) */
  ratio: number;
  /** Points still needed for the next level (0 at max level) */
  pointsToNext: number;
}

export function getLevelProgress(points: number): LevelProgress {
  const current = getLevelDef(calculateLevel(points));
  const next = LEVELS.find((def) => def.level === current.level + 1) ?? null;
  if (!next) return { current, next: null, ratio: 1, pointsToNext: 0 };

  const span = next.minPoints - current.minPoints;
  const ratio = Math.min(Math.max((points - current.minPoints) / span, 0), 1);
  return { current, next, ratio, pointsToNext: next.minPoints - points };
}
