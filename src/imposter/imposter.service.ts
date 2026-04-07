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
import { MatchVerdict } from 'src/match/enums/match-verdict.enum';
import { MatchVisibility } from 'src/match/enums/match-visibility.enum';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';

import { CreateImposterMatchDto } from './dto/create-imposter-match.dto';
import { ListPublicImposterMatchesDto } from './dto/list-public-imposter-matches.dto';
import { SubmitImposterMatchDto } from './dto/submit-imposter-match.dto';
import { VoteImposterMatchDto } from './dto/vote-imposter-match.dto';
import { ImposterMatch } from './entities/imposter-match.entity';
import { ImposterParticipant } from './entities/imposter-participant.entity';
import { ImposterSubmission } from './entities/imposter-submission.entity';
import { ImposterMatchStatus } from './enums/imposter-match-status.enum';
import { ImposterRole } from './enums/imposter-role.enum';
import { ImposterWinningSide } from './enums/imposter-winning-side.enum';

@Injectable()
export class ImposterService {
  private static readonly MIN_PLAYERS = 3;

  constructor(
    @InjectRepository(ImposterMatch)
    private readonly matchRepository: Repository<ImposterMatch>,
    @InjectRepository(ImposterParticipant)
    private readonly participantRepository: Repository<ImposterParticipant>,
    @InjectRepository(ImposterSubmission)
    private readonly submissionRepository: Repository<ImposterSubmission>,
    private readonly challengeService: ChallengeService,
    private readonly codeExecutionService: CodeExecutionService,
  ) {}

  async createMatch(dto: CreateImposterMatchDto, user: User) {
    const challenge = await this.challengeService.findOne(dto.challengeId);

    if (challenge.type !== ChallengeType.IMPOSTER) {
      throw new BadRequestException(
        'Only Coders vs Imposter challenges can use this endpoint.',
      );
    }

    const existingParticipant = await this.participantRepository
      .createQueryBuilder('participant')
      .innerJoinAndSelect('participant.match', 'match')
      .where('participant.userId = :userId', { userId: user.id })
      .andWhere('match.challengeId = :challengeId', {
        challengeId: dto.challengeId,
      })
      .andWhere('match.status IN (:...statuses)', {
        statuses: [ImposterMatchStatus.LOBBY, ImposterMatchStatus.ACTIVE],
      })
      .getOne();

    if (existingParticipant) {
      return this.getMatch(existingParticipant.matchId, user);
    }

    const match = this.matchRepository.create({
      challengeId: dto.challengeId,
      hostId: user.id,
      visibility: dto.visibility ?? MatchVisibility.PRIVATE,
      maxPlayers: dto.maxPlayers ?? 4,
      status: ImposterMatchStatus.LOBBY,
      imposterId: null,
      accusedPlayerId: null,
      winningSide: null,
    });

    const savedMatch = await this.matchRepository.save(match);

    await this.participantRepository.save(
      this.participantRepository.create({
        matchId: savedMatch.id,
        userId: user.id,
        role: ImposterRole.CODER,
      }),
    );

    return this.getMatch(savedMatch.id, user);
  }

  async listPublicMatches(dto: ListPublicImposterMatchesDto, user: User) {
    const challenge = await this.challengeService.findOne(dto.challengeId);

    if (challenge.type !== ChallengeType.IMPOSTER) {
      throw new BadRequestException(
        'Public lobbies are available only for Coders vs Imposter challenges.',
      );
    }

    const matches = await this.matchRepository.find({
      where: {
        challengeId: dto.challengeId,
        visibility: MatchVisibility.PUBLIC,
        status: ImposterMatchStatus.LOBBY,
      },
      relations: {
        host: true,
      },
      order: {
        createdAt: 'ASC',
      },
      take: 20,
    });

    const participantCounts = await this.getParticipantCounts(
      matches.map((match) => match.id),
    );
    const joinedMatchIds = new Set(
      (
        await this.participantRepository.find({
          where: matches.map((match) => ({
            matchId: match.id,
            userId: user.id,
          })),
        })
      ).map((participant) => participant.matchId),
    );

    return matches
      .map((match) => ({
        id: match.id,
        challengeId: match.challengeId,
        visibility: match.visibility,
        status: match.status,
        maxPlayers: match.maxPlayers,
        playerCount: participantCounts.get(match.id) ?? 0,
        isJoinedByCurrentUser: joinedMatchIds.has(match.id),
        host: match.host
          ? {
              id: match.host.id,
              username: match.host.username,
            }
          : null,
        createdAt: match.createdAt,
      }));
  }

  async getMatch(matchId: string, user: User) {
    const match = await this.findMatchById(matchId);
    const participants = await this.listParticipants(matchId);
    const currentParticipant = participants.find(
      (participant) => participant.userId === user.id,
    );

    if (!currentParticipant) {
      throw new ForbiddenException('You are not part of this imposter match.');
    }

    const submissions = await this.listSubmissions(matchId);

    return this.serializeMatch(match, participants, submissions, user.id);
  }

  async joinMatch(matchId: string, user: User) {
    const match = await this.findMatchById(matchId);

    if (match.status !== ImposterMatchStatus.LOBBY) {
      throw new ConflictException('This lobby is no longer open for joining.');
    }

    const participants = await this.listParticipants(matchId);

    if (participants.some((participant) => participant.userId === user.id)) {
      return this.getMatch(match.id, user);
    }

    if (participants.length >= match.maxPlayers) {
      throw new ConflictException('This lobby is already full.');
    }

    await this.participantRepository.save(
      this.participantRepository.create({
        matchId: match.id,
        userId: user.id,
        role: ImposterRole.CODER,
      }),
    );

    return this.getMatch(match.id, user);
  }

  async startMatch(matchId: string, user: User) {
    const match = await this.findMatchById(matchId);

    if (match.hostId !== user.id) {
      throw new ForbiddenException('Only the host can start this match.');
    }

    if (match.status !== ImposterMatchStatus.LOBBY) {
      throw new ConflictException('This match has already started.');
    }

    const participants = await this.listParticipants(matchId);

    if (participants.length < ImposterService.MIN_PLAYERS) {
      throw new BadRequestException(
        `At least ${ImposterService.MIN_PLAYERS} players are required to start.`,
      );
    }

    const imposterParticipant =
      participants[Math.floor(Math.random() * participants.length)];

    await Promise.all(
      participants.map((participant) => {
        participant.role =
          participant.userId === imposterParticipant.userId
            ? ImposterRole.IMPOSTER
            : ImposterRole.CODER;
        participant.voteTargetUserId = null;
        return this.participantRepository.save(participant);
      }),
    );

    match.status = ImposterMatchStatus.ACTIVE;
    match.imposterId = imposterParticipant.userId;
    match.accusedPlayerId = null;
    match.winningSide = null;
    match.startedAt = new Date();

    await this.matchRepository.save(match);

    return this.getMatch(match.id, user);
  }

  async submitToMatch(
    matchId: string,
    dto: SubmitImposterMatchDto,
    user: User,
  ) {
    const match = await this.findMatchById(matchId);
    const participants = await this.listParticipants(matchId);

    if (!participants.some((participant) => participant.userId === user.id)) {
      throw new ForbiddenException('You are not part of this imposter match.');
    }

    if (match.status !== ImposterMatchStatus.ACTIVE) {
      throw new ConflictException('This match is not accepting submissions.');
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

    const savedSubmission = await this.submissionRepository.save(submission);
    const submissions = await this.listSubmissions(match.id);

    return {
      match: this.serializeMatch(match, participants, submissions, user.id),
      submission: {
        id: savedSubmission.id,
        userId: savedSubmission.userId,
        language: savedSubmission.language,
        verdict: savedSubmission.verdict,
        passedCount: savedSubmission.passedCount,
        totalCount: savedSubmission.totalCount,
        results: savedSubmission.results,
        createdAt: savedSubmission.createdAt,
      },
    };
  }

  async vote(matchId: string, dto: VoteImposterMatchDto, user: User) {
    const match = await this.findMatchById(matchId);
    const participants = await this.listParticipants(matchId);
    const currentParticipant = participants.find(
      (participant) => participant.userId === user.id,
    );

    if (!currentParticipant) {
      throw new ForbiddenException('You are not part of this imposter match.');
    }

    if (match.status !== ImposterMatchStatus.ACTIVE) {
      throw new ConflictException('This match is not accepting votes.');
    }

    if (currentParticipant.voteTargetUserId) {
      throw new ConflictException('You already voted in this match.');
    }

    if (dto.targetUserId === user.id) {
      throw new BadRequestException('You cannot vote for yourself.');
    }

    if (!participants.some((participant) => participant.userId === dto.targetUserId)) {
      throw new NotFoundException('That player is not part of this match.');
    }

    currentParticipant.voteTargetUserId = dto.targetUserId;
    await this.participantRepository.save(currentParticipant);

    const updatedParticipants = await this.listParticipants(match.id);

    if (updatedParticipants.every((participant) => !!participant.voteTargetUserId)) {
      await this.resolveMatch(match, updatedParticipants);
    }

    return this.getMatch(match.id, user);
  }

  private async resolveMatch(
    match: ImposterMatch,
    participants: ImposterParticipant[],
  ) {
    const submissions = await this.listSubmissions(match.id, 'ASC');
    const voteCounts = new Map<string, number>();

    participants.forEach((participant) => {
      if (!participant.voteTargetUserId) {
        return;
      }

      voteCounts.set(
        participant.voteTargetUserId,
        (voteCounts.get(participant.voteTargetUserId) ?? 0) + 1,
      );
    });

    const rankedVotes = [...voteCounts.entries()].sort((a, b) => b[1] - a[1]);
    const highestVoteCount = rankedVotes[0]?.[1] ?? 0;
    const topTargets = rankedVotes
      .filter(([, count]) => count === highestVoteCount)
      .map(([userId]) => userId);
    const accusedPlayerId = topTargets.length === 1 ? topTargets[0] : null;
    const roleByUserId = new Map(
      participants.map((participant) => [participant.userId, participant.role]),
    );
    const acceptedCoderSubmission = submissions.find(
      (submission) =>
        submission.verdict === MatchVerdict.ACCEPTED &&
        roleByUserId.get(submission.userId) === ImposterRole.CODER,
    );

    match.status = ImposterMatchStatus.FINISHED;
    match.accusedPlayerId = accusedPlayerId;
    match.winningSide =
      accusedPlayerId === match.imposterId && acceptedCoderSubmission
        ? ImposterWinningSide.CODERS
        : ImposterWinningSide.IMPOSTER;
    match.endedAt = new Date();

    await this.matchRepository.save(match);
  }

  private async findMatchById(matchId: string) {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: {
        challenge: true,
        host: true,
        imposter: true,
        accusedPlayer: true,
      },
    });

    if (!match) {
      throw new NotFoundException(`Imposter match ${matchId} was not found.`);
    }

    return match;
  }

  private async listParticipants(matchId: string) {
    return this.participantRepository.find({
      where: { matchId },
      relations: {
        user: true,
        voteTarget: true,
      },
      order: {
        joinedAt: 'ASC',
      },
    });
  }

  private async listSubmissions(
    matchId: string,
    order: 'ASC' | 'DESC' = 'DESC',
  ) {
    return this.submissionRepository.find({
      where: { matchId },
      relations: {
        user: true,
      },
      order: {
        createdAt: order,
      },
    });
  }

  private async getParticipantCounts(matchIds: string[]) {
    if (matchIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await this.participantRepository
      .createQueryBuilder('participant')
      .select('participant.matchId', 'matchId')
      .addSelect('COUNT(*)', 'count')
      .where('participant.matchId IN (:...matchIds)', { matchIds })
      .groupBy('participant.matchId')
      .getRawMany<{ matchId: string; count: string }>();

    return new Map(rows.map((row) => [row.matchId, parseInt(row.count, 10)]));
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

  private serializeMatch(
    match: ImposterMatch,
    participants: ImposterParticipant[],
    submissions: ImposterSubmission[],
    currentUserId: string,
  ) {
    const currentParticipant = participants.find(
      (participant) => participant.userId === currentUserId,
    );
    const latestSubmissionByUser = new Map<string, ImposterSubmission>();

    submissions.forEach((submission) => {
      if (!latestSubmissionByUser.has(submission.userId)) {
        latestSubmissionByUser.set(submission.userId, submission);
      }
    });

    const acceptedCoderSubmission = [...submissions]
      .reverse()
      .find((submission) => {
        const participant = participants.find(
          (current) => current.userId === submission.userId,
        );

        return (
          submission.verdict === MatchVerdict.ACCEPTED &&
          participant?.role === ImposterRole.CODER
        );
      });

    return {
      id: match.id,
      status: match.status,
      visibility: match.visibility,
      maxPlayers: match.maxPlayers,
      minimumPlayers: ImposterService.MIN_PLAYERS,
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
      host: match.host
        ? {
            id: match.host.id,
            username: match.host.username,
          }
        : null,
      currentUserRole:
        match.status === ImposterMatchStatus.LOBBY
          ? null
          : (currentParticipant?.role ?? null),
      imposter:
        match.status === ImposterMatchStatus.FINISHED && match.imposter
          ? {
              id: match.imposter.id,
              username: match.imposter.username,
            }
          : null,
      accusedPlayer: match.accusedPlayer
        ? {
            id: match.accusedPlayer.id,
            username: match.accusedPlayer.username,
          }
        : null,
      winningSide: match.winningSide,
      acceptedSolver: acceptedCoderSubmission?.user
        ? {
            id: acceptedCoderSubmission.user.id,
            username: acceptedCoderSubmission.user.username,
          }
        : null,
      participants: participants.map((participant) => {
        const latestSubmission = latestSubmissionByUser.get(participant.userId);

        return {
          userId: participant.userId,
          username: participant.user?.username ?? 'Unknown user',
          isHost: participant.userId === match.hostId,
          hasVoted: !!participant.voteTargetUserId,
          currentUserVoteTargetId:
            participant.userId === currentUserId
              ? participant.voteTargetUserId
              : null,
          latestSubmission: latestSubmission
            ? {
                id: latestSubmission.id,
                verdict: latestSubmission.verdict,
                passedCount: latestSubmission.passedCount,
                totalCount: latestSubmission.totalCount,
                language: latestSubmission.language,
                createdAt: latestSubmission.createdAt,
              }
            : null,
        };
      }),
      playerCount: participants.length,
      votesIn: participants.filter((participant) => !!participant.voteTargetUserId)
        .length,
      canViewChallenge: match.status !== ImposterMatchStatus.LOBBY,
      createdAt: match.createdAt,
      startedAt: match.startedAt,
      endedAt: match.endedAt,
      updatedAt: match.updatedAt,
    };
  }
}
