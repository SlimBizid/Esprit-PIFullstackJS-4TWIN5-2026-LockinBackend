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
  [ChallengeType.THATS_NOT_MY_CODER]: 30,
  [ChallengeType.CSS_BATTLE]: 0,
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
  [ChallengeType.THATS_NOT_MY_CODER]: 40,
  [ChallengeType.CSS_BATTLE]: 15,
};

const LOGIN_XP = 10;

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

  async getScoreLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.leaderboardRepo.find({
      order: { totalScore: 'DESC', challengeCompletions: 'DESC' },
    });
  }

  async getXpLeaderboard(): Promise<User[]> {
    return this.userRepo.find({ order: { xp: 'DESC' } });
  }

  async getUserStanding(userId: string): Promise<{
    scoreEntry: LeaderboardEntry;
    scoreRank: number;
    xpRank: number;
    xp: number;
  }> {
    const [scoreEntry, user, allByScore, allByXp] = await Promise.all([
      this.leaderboardRepo.findOne({ where: { userId } }),
      this.userRepo.findOne({ where: { id: userId } }),
      this.leaderboardRepo.find({
        order: { totalScore: 'DESC', challengeCompletions: 'DESC' },
      }),
      this.userRepo.find({ order: { xp: 'DESC' } }),
    ]);

    if (!scoreEntry || !user) {
      throw new NotFoundException(`No standing found for user ${userId}`);
    }

    const scoreRank = allByScore.findIndex((e) => e.userId === userId) + 1;
    const xpRank = allByXp.findIndex((u) => u.id === userId) + 1;

    return { scoreEntry, scoreRank, xpRank, xp: user.xp };
  }
}
