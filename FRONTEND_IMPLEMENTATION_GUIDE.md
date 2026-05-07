# Frontend Implementation Guide - Ranking System

## 🎯 Overview
The backend now includes a **seasonal ranking system** that maps user scores to 8 tier ranks (similar to League of Legends). Ranks automatically refresh every 3 months.

---

## 📊 Rank Tiers Reference

| Rank | Score Range | Display Icon |
|------|-------------|--------------|
| Iron | 0-299 | 🔩 |
| Bronze | 300-599 | 🥉 |
| Silver | 600-999 | ⚪ |
| Gold | 1000-1499 | 🟡 |
| Platinum | 1500-1999 | 💜 |
| Diamond | 2000-2999 | 💎 |
| Master | 3000-4999 | ⭐ |
| Grandmaster | 5000+ | 👑 |

---

## 🔌 New API Endpoints

### 1. Get Score Leaderboard (Enhanced)
```
GET /leaderboard/score?scope=season
```

**Scopes Available:**
- `season` - Current season (default)
- `24h` - Last 24 hours
- `7d` - Last 7 days
- `30d` - Last 30 days
- `all` - All-time

**Response:**
```json
[
  {
    "userId": "uuid-123",
    "totalScore": 450,
    "challengeCompletions": 8,
    "rank": "BRONZE",
    "rankProgress": 50.0
  },
  {
    "userId": "uuid-456",
    "totalScore": 150,
    "challengeCompletions": 3,
    "rank": "IRON",
    "rankProgress": 50.0
  }
]
```

### 2. Get User Standing (Enhanced)
```
GET /leaderboard/user/:userId
```

**Response:**
```json
{
  "scoreEntry": {
    "userId": "uuid-123",
    "totalScore": 450,
    "challengeCompletions": 8,
    "rank": "BRONZE",
    "rankProgress": 50.0
  },
  "scoreRank": 42,
  "rank": "BRONZE",
  "rankProgress": 50.0,
  "xpRank": 15,
  "xp": 8500
}
```

### 3. Get Rank Thresholds (NEW)
```
GET /leaderboard/ranks/thresholds
```

**Response:**
```json
{
  "IRON": { "min": 0, "max": 299 },
  "BRONZE": { "min": 300, "max": 599 },
  "SILVER": { "min": 600, "max": 999 },
  "GOLD": { "min": 1000, "max": 1499 },
  "PLATINUM": { "min": 1500, "max": 1999 },
  "DIAMOND": { "min": 2000, "max": 2999 },
  "MASTER": { "min": 3000, "max": 4999 },
  "GRANDMASTER": { "min": 5000, "max": null }
}
```

Use this to display rank progression bars and thresholds on UI.

### 4. Get All Ranks (NEW)
```
GET /leaderboard/ranks/all
```

**Response:**
```json
["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER", "GRANDMASTER"]
```

---

## 🎨 Frontend Implementation Examples

### Display User Rank
```typescript
// Fetch user standing
const response = await fetch(`/api/leaderboard/user/${userId}`);
const data = await response.json();

console.log(`Current Rank: ${data.rank}`); // "BRONZE"
console.log(`Progress to next rank: ${data.rankProgress}%`); // 50.0
console.log(`Leaderboard Position: #${data.scoreRank}`); // 42
console.log(`Total Score: ${data.scoreEntry.totalScore}`); // 450
```

### Display Leaderboard with Ranks
```typescript
// Fetch score leaderboard
const response = await fetch('/api/leaderboard/score?scope=season');
const leaderboard = await response.json();

// Map to UI format
const items = leaderboard.map((entry, index) => ({
  position: index + 1,
  username: entry.userId, // You'll need to fetch user details separately
  score: entry.totalScore,
  rank: entry.rank,
  completions: entry.challengeCompletions,
  rankProgress: entry.rankProgress,
}));
```

### Display Rank Progression Bar
```typescript
const thresholes = await fetch('/api/leaderboard/ranks/thresholds')
  .then(r => r.json());

function renderProgressBar(score) {
  const RANK_ORDER = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER'];
  
  // Find current rank
  let currentRank = 'IRON';
  for (const rank of RANK_ORDER) {
    const threshold = thresholes[rank];
    if (score >= threshold.min && (threshold.max === null || score <= threshold.max)) {
      currentRank = rank;
      break;
    }
  }
  
  // Find next rank
  const currentIndex = RANK_ORDER.indexOf(currentRank);
  const nextRank = currentIndex < RANK_ORDER.length - 1 ? RANK_ORDER[currentIndex + 1] : null;
  
  // Display
  return {
    current: currentRank,
    next: nextRank,
    scoreInRange: score - thresholes[currentRank].min,
    rangeSize: thresholes[currentRank].max - thresholes[currentRank].min,
    progressPercent: ((score - thresholes[currentRank].min) / (thresholes[currentRank].max - thresholes[currentRank].min)) * 100,
  };
}
```

### Rank Icon Component
```typescript
function getRankIcon(rank: string): string {
  const icons = {
    IRON: '🔩',
    BRONZE: '🥉',
    SILVER: '⚪',
    GOLD: '🟡',
    PLATINUM: '💜',
    DIAMOND: '💎',
    MASTER: '⭐',
    GRANDMASTER: '👑',
  };
  return icons[rank] || '❓';
}

function getRankColor(rank: string): string {
  const colors = {
    IRON: '#777777',       // Gray
    BRONZE: '#CD7F32',     // Bronze
    SILVER: '#C0C0C0',     // Silver
    GOLD: '#FFD700',       // Gold
    PLATINUM: '#E5E4E2',   // Platinum
    DIAMOND: '#B9F2FF',    // Diamond Blue
    MASTER: '#FFD700',     // Master Gold
    GRANDMASTER: '#FF6B6B', // Grandmaster Red
  };
  return colors[rank] || '#000000';
}
```

---

## 🔄 Data Flow

### User Scores Challenge
1. User completes a challenge
2. Backend awards score + XP
3. Score added to **this season's** total
4. Rank is **automatically calculated** from seasonal score
5. `rankProgress` shows % to next tier

### Seasonal Reset (Every 3 Months)
- Seasonal score resets to 0
- New season starts (e.g., "2026-04" → "2026-07")
- Users start climbing the ranks again
- XP remains (all-time progression)

---

## 💾 Caching Recommendations

**Optional:** Cache rank thresholds client-side since they don't change frequently:

```typescript
// In your API service
private rankCache = null;

async getRankThresholds() {
  if (!this.rankCache) {
    this.rankCache = await fetch('/api/leaderboard/ranks/thresholds')
      .then(r => r.json());
  }
  return this.rankCache;
}
```

---

## 🎯 UI Components to Implement

### 1. User Profile Rank Badge
- Display current rank with icon
- Show progress bar to next rank
- Include score and position in leaderboard
- Example: "Bronze • 450/600 points • #42 Leaderboard"

### 2. Leaderboard Table Enhancement
- Add rank column with icon + name
- Add score column
- Add rank progress indicator (optional)
- Sort by rank tier first, then by position within tier

### 3. Rank Progression Widget
- Visual bar showing progress (0-100%)
- Current rank icon
- Next rank icon
- Score: 450/600 (shows current/needed for next)

### 4. Seasonal Status
- Show current season (e.g., "Season 2026-04")
- Countdown to next season reset
- History of past ranks (optional)

---

## 📝 Migration Notes

### These fields are NEW:
- `ScoreLeaderboardItem.rank` - Current tier (e.g., "BRONZE")
- `ScoreLeaderboardItem.rankProgress` - Progress to next rank (0-100)
- `UserStanding.rank` - Current tier
- `UserStanding.rankProgress` - Progress to next rank

### These fields UNCHANGED:
- `totalScore` - Still calculated same way
- `challengeCompletions` - Still tracked same way
- `xp` - All-time XP unaffected
- All existing endpoints work exactly the same

### Backward Compatibility ✅
- Old API clients still work
- New fields are **optional** to use
- Can display with or without ranks

---

## 🚀 Quick Start Checklist

- [ ] Update leaderboard API calls to include `?scope=season`
- [ ] Fetch rank thresholds on app init: `GET /leaderboard/ranks/thresholds`
- [ ] Display rank badges in user profile
- [ ] Add rank column to leaderboard table
- [ ] Show rank progress bar in user profile
- [ ] Add rank icons to leaderboard rows
- [ ] Cache rank thresholds locally
- [ ] Display seasonal info (current season, reset date)
- [ ] Test rank display when score crosses tier boundaries
- [ ] Test with users at different rank levels

---

## 🔗 Related Documentation
- Backend Implementation: [RANKING_SYSTEM.md](RANKING_SYSTEM.md)
- Safety Audit: [RANKING_SYSTEM_AUDIT.md](RANKING_SYSTEM_AUDIT.md)
- API Endpoint: GET `/leaderboard/*`

---

**Questions?** Check the backend response format examples above or refer to the full API documentation.
