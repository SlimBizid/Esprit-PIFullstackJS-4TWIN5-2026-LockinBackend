# Ranking System Documentation

## Overview

A seasonal ranking system has been added to the leaderboard that maps user scores to 8 tier ranks (Iron → Grandmaster), similar to League of Legends but simplified. Ranks refresh every 3 months with each season.

## Rank Tiers & Score Thresholds

| Rank           | Min Score | Max Score |
| -------------- | --------- | --------- |
| 🔩 Iron        | 0         | 299       |
| 🥉 Bronze      | 300       | 599       |
| ⚪ Silver      | 600       | 999       |
| 🟡 Gold        | 1000      | 1499      |
| 💜 Platinum    | 1500      | 1999      |
| 💎 Diamond     | 2000      | 2999      |
| ⭐ Master      | 3000      | 4999      |
| 👑 Grandmaster | 5000+     | ∞         |

## How It Works

### Score Calculation (Existing)

- **Base Score**: Based on challenge difficulty (Easy: 50, Medium: 100, Hard: 200)
- **Type Bonus**: Additional points for challenge type (PVP: +50, Teams: +30, etc.)
- **Season**: Score resets every 3 months (tracked in `UserChallengeReward.season` field)

### Rank Calculation (New)

- **Automatic**: Ranks are calculated in real-time from seasonal score
- **Rank Progress**: Shows percentage progress to next tier (0-100%)
- **Reset**: Automatically resets each season when new rewards are recorded

## API Endpoints

### Get Score Leaderboard with Ranks

```
GET /leaderboard/score?scope=season
```

Response includes `rank` and `rankProgress` for each entry.

**Scopes:**

- `season` - Current season (default)
- `24h` - Last 24 hours
- `7d` - Last 7 days
- `30d` - Last 30 days
- `all` - All-time (no ranks, uses legacy endpoint)

### Get User Standing with Rank

```
GET /leaderboard/user/:userId
```

Response now includes:

- `rank` - Current tier (IRON, BRONZE, etc.)
- `rankProgress` - Progress to next rank (0-100%)
- `scoreEntry` - Full entry with rank info
- `scoreRank` - Position in leaderboard

### Get Rank Thresholds

```
GET /leaderboard/ranks/thresholds
```

Returns all rank tiers with min/max score ranges. Use this to display rank progression bars on frontend.

### Get All Ranks

```
GET /leaderboard/ranks/all
```

Returns ordered array of ranks: `["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER", "GRANDMASTER"]`

## Response Examples

### Score Leaderboard Item

```json
{
  "userId": "uuid-123",
  "totalScore": 1250,
  "challengeCompletions": 15,
  "rank": "GOLD",
  "rankProgress": 25.0
}
```

### User Standing

```json
{
  "scoreEntry": {
    "userId": "uuid-123",
    "totalScore": 1250,
    "challengeCompletions": 15,
    "rank": "GOLD",
    "rankProgress": 25.0
  },
  "scoreRank": 42,
  "rank": "GOLD",
  "rankProgress": 25.0,
  "xpRank": 15,
  "xp": 8500
}
```

## Frontend Integration

### Display User Rank

```typescript
const standing = await fetch(`/leaderboard/user/${userId}`);
const data = await standing.json();

console.log(`Rank: ${data.rank}`); // "GOLD"
console.log(`Progress: ${data.rankProgress}%`); // 25.0%
console.log(`Leaderboard Position: ${data.scoreRank}`); // 42
```

### Display Rank Thresholds

```typescript
const thresholds = await fetch('/leaderboard/ranks/thresholds');
const data = await thresholds.json();

// Loop through ranks to create progression UI
Object.entries(data).forEach(([rank, threshold]) => {
  console.log(`${rank}: ${threshold.min}-${threshold.max} points`);
});
```

## Customization

To adjust rank thresholds, edit [rank-thresholds.ts](./src/leaderboard/constants/rank-thresholds.ts):

```typescript
export const RANK_THRESHOLDS: Record<Rank, { min: number; max: number }> = {
  [Rank.IRON]: { min: 0, max: 299 },
  [Rank.BRONZE]: { min: 300, max: 599 },
  // ...
};
```

## Seasonal Reset

Ranks automatically reset every 3 months because:

1. `UserChallengeReward.season` captures seasonal context
2. `getScoreLeaderboard(LeaderboardScope.SEASON)` queries only current season
3. New season starts on month transition (e.g., Jan 2026 → Apr 2026)

**Current Season Format:** `YYYY-MM` (e.g., "2026-04")

To manually test a new season, update `getCurrentSeason()` in leaderboard.service.ts.

## No Breaking Changes

- All existing endpoints still work
- Rank/rankProgress fields are additive (not replacing old data)
- Legacy XP system remains unchanged
- Backward compatible with existing clients

## Files Changed

- ✅ [rank.enum.ts](./src/leaderboard/enums/rank.enum.ts) - New rank enum (8 tiers)
- ✅ [rank-thresholds.ts](./src/leaderboard/constants/rank-thresholds.ts) - New rank calculations & thresholds
- ✅ [leaderboard.service.ts](./src/leaderboard/leaderboard.service.ts) - Integrated rank calculations
- ✅ [leaderboard.controller.ts](./src/leaderboard/leaderboard.controller.ts) - New endpoints for rank info
