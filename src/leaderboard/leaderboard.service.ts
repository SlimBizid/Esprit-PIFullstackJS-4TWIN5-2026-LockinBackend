import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderboardEntry } from './entities/leaderboard.entity';
import { UserChallengeReward } from './entities/user-challenge-reward.entity';
import { User } from '../user/entities/user.entity';
import { CreateLeaderboardEntryDto } from './dto/create-leaderboard-entry.dto';
import { AwardChallengeDto } from './dto/award-challenge.dto';
import { ChallengeDifficulty } from '../challenge/enums/challenge-difficulty.enums';
import { ChallengeType } from '../challenge/enums/challenge-type.enums';
import { LeaderboardScope } from './enums/leaderboard-scope.enum';
import { Rank } from './enums/rank.enum';
import { getRankFromScore, getRankProgress } from './constants/rank-thresholds';

const BASE_SCORE: Record<ChallengeDifficulty, number> = {
  [ChallengeDifficulty.EASY]: 50,
  [ChallengeDifficulty.MEDIUM]: 100,
  [ChallengeDifficulty.HARD]: 200,
};

const TYPE_SCORE_BONUS: Record<ChallengeType, number> = {
  [ChallengeType.SOLO]: 0,
  [ChallengeType.QUIZ]: 0,
  [ChallengeType.PVP]: 50,
  [ChallengeType.QUIZ_PVP]: 50,
  [ChallengeType.TEAMS]: 30,
  [ChallengeType.IMPOSTER]: 40,
};

const BASE_XP: Record<ChallengeDifficulty, number> = {
  [ChallengeDifficulty.EASY]: 20,
  [ChallengeDifficulty.MEDIUM]: 50,
  [ChallengeDifficulty.HARD]: 100,
};

const TYPE_XP_BONUS: Record<ChallengeType, number> = {
  [ChallengeType.SOLO]: 0,
  [ChallengeType.QUIZ]: 0,
  [ChallengeType.PVP]: 20,
  [ChallengeType.QUIZ_PVP]: 20,
  [ChallengeType.TEAMS]: 10,
  [ChallengeType.IMPOSTER]: 15,
};

const LOGIN_XP = 10;

export type ScoreLeaderboardItem = {
  userId: string;
  totalScore: number;
  challengeCompletions: number;
  rank: Rank;
  rankProgress: number;
};

// Score is a seasonal leaderboard metric. It is calculated from challenge rewards
// and is intended for visual ranking within the current season or recent date
// windows. XP is a separate, long-term progression metric and remains ordered
// all-time.
@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(LeaderboardEntry)
    private readonly leaderboardRepo: Repository<LeaderboardEntry>,
    @InjectRepository(UserChallengeReward)
    private readonly rewardRepo: Repository<UserChallengeReward>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async findEntryByUser(userId: string): Promise<LeaderboardEntry> {
    const entry = await this.leaderboardRepo.findOne({ where: { userId } });
    if (!entry)
      throw new NotFoundException(
        `No leaderboard entry found for user ${userId}`,
      );
    return entry;
  }

  async createEntry(dto: CreateLeaderboardEntryDto): Promise<LeaderboardEntry> {
    const existing = await this.leaderboardRepo.findOne({
      where: { userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException(
        'Leaderboard entry already exists for this user',
      );
    }
    const entry = this.leaderboardRepo.create({ userId: dto.userId });
    return this.leaderboardRepo.save(entry);
  }

  async awardChallenge(dto: AwardChallengeDto): Promise<LeaderboardEntry> {
    const existingReward = await this.rewardRepo.findOne({
      where: {
        userId: dto.userId,
        challengeId: dto.challengeId,
      },
    });

    if (existingReward) {
      return this.findEntryByUser(dto.userId);
    }

    const [entry, user] = await Promise.all([
      this.leaderboardRepo.findOne({ where: { userId: dto.userId } }),
      this.userRepo.findOne({ where: { id: dto.userId } }),
    ]);

    if (!entry || !user) {
      throw new NotFoundException(
        `No leaderboard entry or user found for userId ${dto.userId}`,
      );
    }

    const score = BASE_SCORE[dto.difficulty] + TYPE_SCORE_BONUS[dto.type];
    const xp = BASE_XP[dto.difficulty] + TYPE_XP_BONUS[dto.type];

    entry.totalScore += score;
    entry.challengeCompletions += 1;

    user.xp += xp;

    await Promise.all([
      this.rewardRepo.save(
        this.rewardRepo.create({
          userId: dto.userId,
          challengeId: dto.challengeId,
          scoreAwarded: score,
          xpAwarded: xp,
          season: this.getCurrentSeason(),
        }),
      ),
      this.leaderboardRepo.save(entry),
      this.userRepo.save(user),
    ]);

    return this.findEntryByUser(dto.userId);
  }

  async awardLoginXp(userId: string): Promise<void> {
    const [user, entry] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.leaderboardRepo.findOne({ where: { userId } }),
    ]);

    if (!user || !entry) return;

    const now = new Date();
    const lastAward = entry.lastLoginXpAt;
    const alreadyAwardedToday =
      lastAward &&
      lastAward.getFullYear() === now.getFullYear() &&
      lastAward.getMonth() === now.getMonth() &&
      lastAward.getDate() === now.getDate();

    if (alreadyAwardedToday) return;

    user.xp += LOGIN_XP;
    entry.lastLoginXpAt = now;

    await Promise.all([
      this.userRepo.save(user),
      this.leaderboardRepo.save(entry),
    ]);
  }

  async getScoreLeaderboard(
    scope: LeaderboardScope = LeaderboardScope.SEASON,
  ): Promise<LeaderboardEntry[] | ScoreLeaderboardItem[]> {
    if (scope === LeaderboardScope.ALL) {
      return this.leaderboardRepo.find({
        order: { totalScore: 'DESC', challengeCompletions: 'DESC' },
      });
    }

    const query = this.rewardRepo
      .createQueryBuilder('reward')
      .select('reward.userId', 'userId')
      .addSelect('SUM(reward.scoreAwarded)', 'totalScore')
      .addSelect('COUNT(*)', 'challengeCompletions')
      .groupBy('reward.userId')
      .orderBy('totalScore', 'DESC');

    if (scope === LeaderboardScope.SEASON) {
      query.where('reward.season = :season', {
        season: this.getCurrentSeason(),
      });
    } else {
      const startDate = this.getScopeStartDate(scope);
      if (!startDate) {
        return this.getScoreLeaderboard(LeaderboardScope.SEASON);
      }
      query.where('reward.createdAt >= :since', {
        since: startDate.toISOString(),
      });
    }

    const rows = await query.getRawMany();

    return rows.map((row) => ({
      userId: row.userId,
      totalScore: Number(row.totalScore),
      challengeCompletions: Number(row.challengeCompletions),
      rank: getRankFromScore(Number(row.totalScore)),
      rankProgress: getRankProgress(Number(row.totalScore)),
    }));
  }

  private getCurrentSeason(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(
      2,
      '0',
    )}`;
  }

  private getScopeStartDate(scope: LeaderboardScope): Date | null {
    const date = new Date();

    switch (scope) {
      case LeaderboardScope.DAY:
        date.setDate(date.getDate() - 1);
        return date;
      case LeaderboardScope.WEEK:
        date.setDate(date.getDate() - 7);
        return date;
      case LeaderboardScope.MONTH:
        date.setDate(date.getDate() - 30);
        return date;
      default:
        return null;
    }
  }

  async getXpLeaderboard(): Promise<User[]> {
    return this.userRepo.find({ order: { xp: 'DESC' } });
  }

  async getUserStanding(userId: string): Promise<{
    scoreEntry: ScoreLeaderboardItem;
    scoreRank: number;
    rank: Rank;
    rankProgress: number;
    xpRank: number;
    xp: number;
  }> {
    const [user, allByXp, seasonScores] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.userRepo.find({ order: { xp: 'DESC' } }),
      this.rewardRepo
        .createQueryBuilder('reward')
        .select('reward.userId', 'userId')
        .addSelect('SUM(reward.scoreAwarded)', 'totalScore')
        .addSelect('COUNT(*)', 'challengeCompletions')
        .where('reward.season = :season', {
          season: this.getCurrentSeason(),
        })
        .groupBy('reward.userId')
        .orderBy('totalScore', 'DESC')
        .getRawMany(),
    ]);

    if (!user) {
      throw new NotFoundException(`No standing found for user ${userId}`);
    }

    const scoreRows = seasonScores.map((row) => ({
      userId: row.userId,
      totalScore: Number(row.totalScore),
      challengeCompletions: Number(row.challengeCompletions),
      rank: getRankFromScore(Number(row.totalScore)),
      rankProgress: getRankProgress(Number(row.totalScore)),
    }));

    const scoreIndex = scoreRows.findIndex((row) => row.userId === userId);
    const scoreEntry: ScoreLeaderboardItem =
      scoreIndex >= 0
        ? scoreRows[scoreIndex]
        : {
            userId,
            totalScore: 0,
            challengeCompletions: 0,
            rank: getRankFromScore(0),
            rankProgress: getRankProgress(0),
          };
    const scoreRank = scoreIndex >= 0 ? scoreIndex + 1 : scoreRows.length + 1;
    const rank = scoreEntry.rank;
    const rankProgress = scoreEntry.rankProgress;
    const xpRank = allByXp.findIndex((u) => u.id === userId) + 1;

    return { scoreEntry, scoreRank, rank, rankProgress, xpRank, xp: user.xp };
  }

  /**
   * Get rank thresholds for all ranks
   * Used by frontend to display rank progression bars
   */
  getRankThresholds(): Record<Rank, { min: number; max: number }> {
    const { RANK_THRESHOLDS } = require('./constants/rank-thresholds');
    return RANK_THRESHOLDS;
  }

  /**
   * Get all available ranks ordered by tier
   */
  getAllRanks(): Rank[] {
    const { getAllRanksOrdered } = require('./constants/rank-thresholds');
    return getAllRanksOrdered();
  }
}
