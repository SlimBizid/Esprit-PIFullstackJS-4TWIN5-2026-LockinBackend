import { Rank } from '../enums/rank.enum';

/**
 * Score thresholds for each rank tier
 * Score ranges: 0-300: Iron, 300-600: Bronze, 600-1000: Silver, etc.
 * Refreshes every 3 months (seasonal)
 */
export const RANK_THRESHOLDS: Record<Rank, { min: number; max: number }> = {
  [Rank.IRON]: { min: 0, max: 299 },
  [Rank.BRONZE]: { min: 300, max: 599 },
  [Rank.SILVER]: { min: 600, max: 999 },
  [Rank.GOLD]: { min: 1000, max: 1499 },
  [Rank.PLATINUM]: { min: 1500, max: 1999 },
  [Rank.DIAMOND]: { min: 2000, max: 2999 },
  [Rank.MASTER]: { min: 3000, max: 4999 },
  [Rank.GRANDMASTER]: { min: 5000, max: Infinity },
};

/**
 * Get rank from score
 * @param score User's seasonal score
 * @returns Rank enum
 */
export function getRankFromScore(score: number): Rank {
  for (const [rank, threshold] of Object.entries(RANK_THRESHOLDS)) {
    if (score >= threshold.min && score <= threshold.max) {
      return rank as Rank;
    }
  }
  return Rank.IRON; // Fallback to iron
}

/**
 * Get all ranks ordered by tier (ascending)
 */
export function getAllRanksOrdered(): Rank[] {
  return [
    Rank.IRON,
    Rank.BRONZE,
    Rank.SILVER,
    Rank.GOLD,
    Rank.PLATINUM,
    Rank.DIAMOND,
    Rank.MASTER,
    Rank.GRANDMASTER,
  ];
}

/**
 * Get rank index (0 = Iron, 7 = Grandmaster)
 */
export function getRankIndex(rank: Rank): number {
  return getAllRanksOrdered().indexOf(rank);
}

/**
 * Get progress towards next rank (0-100)
 * @param score User's seasonal score
 * @returns Progress percentage (0-100)
 */
export function getRankProgress(score: number): number {
  const currentRank = getRankFromScore(score);
  const threshold = RANK_THRESHOLDS[currentRank];

  if (currentRank === Rank.GRANDMASTER) {
    return 100; // No progression beyond Grandmaster
  }

  const rangeSize = threshold.max - threshold.min + 1;
  const scoreInRange = score - threshold.min;
  return Math.min(100, Math.max(0, (scoreInRange / rangeSize) * 100));
}
