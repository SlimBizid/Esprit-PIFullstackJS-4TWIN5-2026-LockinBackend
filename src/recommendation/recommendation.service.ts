import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Challenge } from 'src/challenge/entities/challenge.entity';
import { ChallengeType } from 'src/challenge/enums/challenge-type.enums';
import { User } from 'src/user/entities/user.entity';
import { In, Not, Repository } from 'typeorm';

import { RecommendationResponseDto } from './dto/recommendation-response.dto';
import { ChallengeRecommendation } from './entities/challenge-recommendation.entity';
import { ChallengeSubmission } from 'src/submission/entities/challenge-submission.entity';

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(ChallengeRecommendation)
    private readonly recommendationRepository: Repository<ChallengeRecommendation>,
    @InjectRepository(Challenge)
    private readonly challengeRepository: Repository<Challenge>,
    @InjectRepository(ChallengeSubmission)
    private readonly submissionRepository: Repository<ChallengeSubmission>,
  ) {}

  async listForUser(
    user: User,
    limit = 5,
  ): Promise<RecommendationResponseDto> {
    const safeLimit = Math.min(Math.max(limit, 1), 10);
    const storedRecommendations = await this.recommendationRepository.find({
      where: { userId: user.id },
      relations: ['challenge'],
      order: { rank: 'ASC', score: 'DESC' },
      take: safeLimit,
    });

    if (storedRecommendations.length > 0) {
      return {
        data: storedRecommendations
          .filter((recommendation) => recommendation.challenge)
          .map((recommendation) => this.serializeRecommendation(recommendation)),
        meta: {
          modelVersion: storedRecommendations[0]?.modelVersion ?? 'unknown',
          generatedAt: storedRecommendations[0]?.generatedAt?.toISOString() ?? null,
        },
      };
    }

    return this.buildFallbackRecommendations(user.id, safeLimit);
  }

  private async buildFallbackRecommendations(
    userId: string,
    limit: number,
  ): Promise<RecommendationResponseDto> {
    const attemptedChallengeIds = await this.submissionRepository.find({
      select: { challengeId: true },
      where: { userId },
    });

    const excludedIds = attemptedChallengeIds.map((submission) => submission.challengeId);
    const where = excludedIds.length
      ? {
          id: Not(In(excludedIds)),
          type: In([ChallengeType.SOLO, ChallengeType.QUIZ]),
        }
      : {
          type: In([ChallengeType.SOLO, ChallengeType.QUIZ]),
        };

    const fallbackChallenges = await this.challengeRepository.find({
      where,
      order: {
        acceptanceRate: 'DESC',
        createdAt: 'DESC',
      },
      take: limit,
    });

    return {
      data: fallbackChallenges.map((challenge, index) => ({
        challengeId: challenge.id,
        score: Number(challenge.acceptanceRate) / 100,
        rank: index + 1,
        reason: this.buildFallbackReason(challenge),
        challenge: {
          id: challenge.id,
          title: challenge.title,
          difficulty: challenge.difficulty,
          type: challenge.type,
          topics: challenge.topics,
          acceptanceRate: Number(challenge.acceptanceRate),
        },
      })),
      meta: {
        modelVersion: 'heuristic-acceptance-rate',
        generatedAt: null,
      },
    };
  }

  private serializeRecommendation(
    recommendation: ChallengeRecommendation,
  ): RecommendationResponseDto['data'][number] {
    return {
      challengeId: recommendation.challengeId,
      score: Number(recommendation.score),
      rank: recommendation.rank,
      reason:
        recommendation.reason.trim() ||
        this.buildFallbackReason(recommendation.challenge),
      challenge: {
        id: recommendation.challenge.id,
        title: recommendation.challenge.title,
        difficulty: recommendation.challenge.difficulty,
        type: recommendation.challenge.type,
        topics: recommendation.challenge.topics,
        acceptanceRate: Number(recommendation.challenge.acceptanceRate),
      },
    };
  }

  private buildFallbackReason(challenge: Challenge) {
    const primaryTopic = challenge.topics[0] ?? 'general problem solving';
    const normalizedDifficulty = challenge.difficulty.toLowerCase();

    if (normalizedDifficulty === 'easy') {
      return `Good entry point for ${primaryTopic.toLowerCase()}.`;
    }

    if (normalizedDifficulty === 'medium') {
      return `Balanced next step if you want to practice ${primaryTopic.toLowerCase()}.`;
    }

    return `Stretch challenge for players ready for harder ${primaryTopic.toLowerCase()} problems.`;
  }
}
