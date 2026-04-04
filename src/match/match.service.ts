import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeService } from 'src/challenge/challenge.service';
import { ChallengeType } from 'src/challenge/enums/challenge-type.enums';
import { CodeExecutionService } from 'src/code-execution/code-execution.service';
import { User } from 'src/user/entities/user.entity';
import { Brackets, Repository } from 'typeorm';

import { CreateMatchDto } from './dto/create-match.dto';
import { CreateMatchMessageDto } from './dto/create-match-message.dto';
import { ListPublicMatchesDto } from './dto/list-public-matches.dto';
import { SubmitMatchDto } from './dto/submit-match.dto';
import { MatchMessage } from './entities/match-message.entity';
import { MatchSubmission } from './entities/match-submission.entity';
import { Match } from './entities/match.entity';
import { MatchStatus } from './enums/match-status.enum';
import { MatchVerdict } from './enums/match-verdict.enum';
import { MatchVisibility } from './enums/match-visibility.enum';

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchMessage)
    private readonly messageRepository: Repository<MatchMessage>,
    @InjectRepository(MatchSubmission)
    private readonly submissionRepository: Repository<MatchSubmission>,
    private readonly challengeService: ChallengeService,
    private readonly codeExecutionService: CodeExecutionService,
  ) {}

  async createMatch(dto: CreateMatchDto, user: User) {
    const challenge = await this.challengeService.findOne(dto.challengeId);

    if (challenge.type !== ChallengeType.PVP) {
      throw new BadRequestException(
        'Only 1v1 challenges can be queued as matches.',
      );
    }

    const existingMatch = await this.matchRepository
      .createQueryBuilder('match')
      .where('match.challengeId = :challengeId', { challengeId: dto.challengeId })
      .andWhere('match.status IN (:...statuses)', {
        statuses: [MatchStatus.WAITING, MatchStatus.ACTIVE],
      })
      .andWhere(
        new Brackets((query) => {
          query
            .where('match.playerOneId = :userId', { userId: user.id })
            .orWhere('match.playerTwoId = :userId', { userId: user.id });
        }),
      )
      .getOne();

    if (existingMatch) {
      return this.getMatch(existingMatch.id, user);
    }

    const match = this.matchRepository.create({
      challengeId: dto.challengeId,
      playerOneId: user.id,
      status: MatchStatus.WAITING,
      visibility: dto.visibility ?? MatchVisibility.PRIVATE,
    });

    const savedMatch = await this.matchRepository.save(match);

    return this.getMatch(savedMatch.id, user);
  }

  async joinMatch(matchId: string, user: User) {
    const match = await this.findMatchById(matchId);

    if (match.status !== MatchStatus.WAITING) {
      throw new ConflictException('This match is no longer waiting for players.');
    }

    if (match.playerOneId === user.id) {
      throw new BadRequestException('You cannot join your own waiting match.');
    }

    if (match.playerTwoId) {
      throw new ConflictException('This match already has a second player.');
    }

    match.playerTwoId = user.id;
    match.status = MatchStatus.ACTIVE;
    match.startedAt = new Date();

    await this.matchRepository.save(match);

    return this.getMatch(match.id, user);
  }

  async listPublicMatches(dto: ListPublicMatchesDto, user: User) {
    const challenge = await this.challengeService.findOne(dto.challengeId);

    if (challenge.type !== ChallengeType.PVP) {
      throw new BadRequestException(
        'Public matchmaking is available only for 1v1 challenges.',
      );
    }

    const matches = await this.matchRepository.find({
      where: {
        challengeId: dto.challengeId,
        status: MatchStatus.WAITING,
        visibility: MatchVisibility.PUBLIC,
      },
      relations: {
        challenge: true,
        playerOne: true,
        playerTwo: true,
        winner: true,
      },
      order: {
        createdAt: 'ASC',
      },
      take: 20,
    });

    return matches
      .filter((match) => match.playerOneId !== user.id)
      .map((match) => this.serializeMatch(match, []));
  }

  async joinRandomMatch(dto: ListPublicMatchesDto, user: User) {
    const challenge = await this.challengeService.findOne(dto.challengeId);

    if (challenge.type !== ChallengeType.PVP) {
      throw new BadRequestException(
        'Random matchmaking is available only for 1v1 challenges.',
      );
    }

    const match = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.challenge', 'challenge')
      .leftJoinAndSelect('match.playerOne', 'playerOne')
      .leftJoinAndSelect('match.playerTwo', 'playerTwo')
      .leftJoinAndSelect('match.winner', 'winner')
      .where('match.challengeId = :challengeId', { challengeId: dto.challengeId })
      .andWhere('match.status = :status', { status: MatchStatus.WAITING })
      .andWhere('match.visibility = :visibility', {
        visibility: MatchVisibility.PUBLIC,
      })
      .andWhere('match.playerOneId != :userId', { userId: user.id })
      .orderBy('match.createdAt', 'ASC')
      .getOne();

    if (!match) {
      throw new NotFoundException('No public waiting matches are available.');
    }

    return this.joinMatch(match.id, user);
  }

  async getMatch(matchId: string, user: User) {
    const match = await this.findMatchById(matchId);
    this.ensureParticipant(match, user.id);

    const submissions = await this.submissionRepository.find({
      where: { matchId },
      relations: {
        user: true,
      },
      order: { createdAt: 'DESC' },
    });

    return this.serializeMatch(match, submissions);
  }

  async listMessages(matchId: string, user: User) {
    const match = await this.findMatchById(matchId);
    this.ensureParticipant(match, user.id);

    const messages = await this.messageRepository.find({
      where: { matchId },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return messages.map((message) => this.serializeMessage(message));
  }

  async createMessage(matchId: string, dto: CreateMatchMessageDto, user: User) {
    const match = await this.findMatchById(matchId);
    this.ensureParticipant(match, user.id);

    if (match.status === MatchStatus.WAITING || !match.playerTwoId) {
      throw new ConflictException(
        'Chat unlocks once both players have joined the match.',
      );
    }

    const message = this.messageRepository.create({
      matchId: match.id,
      userId: user.id,
      content: dto.content.trim(),
    });

    const savedMessage = await this.messageRepository.save(message);
    const populatedMessage = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: {
        user: true,
      },
    });

    if (!populatedMessage) {
      throw new NotFoundException('Message could not be loaded after save.');
    }

    return this.serializeMessage(populatedMessage);
  }

  async submitToMatch(matchId: string, dto: SubmitMatchDto, user: User) {
    const match = await this.findMatchById(matchId);
    this.ensureParticipant(match, user.id);

    if (match.status === MatchStatus.WAITING) {
      throw new ConflictException('This match does not have a second player yet.');
    }

    if (match.status === MatchStatus.FINISHED) {
      throw new ConflictException('This match has already finished.');
    }

    const execution = await this.codeExecutionService.runCode({
      challengeId: match.challengeId,
      language: dto.language,
      sourceCode: dto.sourceCode,
    });

    const passedCount = execution.results.filter((result) => result.passed).length;
    const totalCount = execution.results.length;
    const verdict = this.getVerdict(execution.results, passedCount, totalCount);

    const submission = this.submissionRepository.create({
      matchId: match.id,
      userId: user.id,
      language: dto.language,
      sourceCode: dto.sourceCode,
      verdict,
      passedCount,
      totalCount,
      results: execution.results.map((result) => ({
        passed: result.passed,
        actual: result.actual,
        expected: result.expected,
        runtime: result.runtime,
        memoryKb: result.memoryKb ?? null,
        status: result.status ?? '',
      })),
    });

    await this.submissionRepository.save(submission);

    if (verdict === MatchVerdict.ACCEPTED) {
      match.status = MatchStatus.FINISHED;
      match.winnerId = user.id;
      match.endedAt = new Date();
      await this.matchRepository.save(match);
    }

    return this.getMatch(match.id, user);
  }

  async surrenderMatch(matchId: string, user: User) {
    const match = await this.findMatchById(matchId);
    this.ensureParticipant(match, user.id);

    if (match.status === MatchStatus.FINISHED) {
      throw new ConflictException('This match has already finished.');
    }

    const opponentId =
      match.playerOneId === user.id ? match.playerTwoId : match.playerOneId;

    match.status = MatchStatus.FINISHED;
    match.winnerId = opponentId ?? null;
    match.endedAt = new Date();

    await this.matchRepository.save(match);

    return this.getMatch(match.id, user);
  }

  private async findMatchById(matchId: string) {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: {
        challenge: true,
        playerOne: true,
        playerTwo: true,
        winner: true,
      },
    });

    if (!match) {
      throw new NotFoundException(`Match ${matchId} was not found.`);
    }

    return match;
  }

  private ensureParticipant(match: Match, userId: string) {
    if (match.playerOneId !== userId && match.playerTwoId !== userId) {
      throw new ForbiddenException('You are not a participant in this match.');
    }
  }

  private getVerdict(
    results: Array<{ passed: boolean; status?: string }>,
    passedCount: number,
    totalCount: number,
  ) {
    if (totalCount > 0 && passedCount === totalCount) {
      return MatchVerdict.ACCEPTED;
    }

    if (
      results.some((result) =>
        result.status?.toLowerCase().includes('compilation error'),
      )
    ) {
      return MatchVerdict.COMPILATION_ERROR;
    }

    if (
      results.some((result) => result.status?.toLowerCase().includes('runtime'))
    ) {
      return MatchVerdict.RUNTIME_ERROR;
    }

    return MatchVerdict.WRONG_ANSWER;
  }

  private serializeMatch(match: Match, submissions: MatchSubmission[]) {
    return {
      id: match.id,
      status: match.status,
      visibility: match.visibility,
      challenge: match.challenge
        ? {
            id: match.challenge.id,
            title: match.challenge.title,
            difficulty: match.challenge.difficulty,
            type: match.challenge.type,
          }
        : {
            id: match.challengeId,
          },
      playerOne: match.playerOne
        ? {
            id: match.playerOne.id,
            username: match.playerOne.username,
          }
        : null,
      playerTwo: match.playerTwo
        ? {
            id: match.playerTwo.id,
            username: match.playerTwo.username,
          }
        : null,
      winner: match.winner
        ? {
            id: match.winner.id,
            username: match.winner.username,
          }
        : null,
      playerOneId: match.playerOneId,
      playerTwoId: match.playerTwoId,
      winnerId: match.winnerId,
      startedAt: match.startedAt,
      endedAt: match.endedAt,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
      canViewChallenge:
        match.status !== MatchStatus.WAITING && !!match.playerTwoId,
      submissions: submissions.map((submission) => ({
        id: submission.id,
        userId: submission.userId,
        username: submission.user?.username ?? null,
        language: submission.language,
        verdict: submission.verdict,
        passedCount: submission.passedCount,
        totalCount: submission.totalCount,
        createdAt: submission.createdAt,
      })),
    };
  }

  private serializeMessage(message: MatchMessage) {
    return {
      id: message.id,
      matchId: message.matchId,
      userId: message.userId,
      username: message.user?.username ?? null,
      content: message.content,
      createdAt: message.createdAt,
    };
  }
}
