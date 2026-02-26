import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { ChallengeDifficulty } from './enums/challenge-difficulty.enums';
import { ChallengeType } from './enums/challenge-type.enums';

@Injectable()
export class ChallengeService {
  constructor(
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    challenge_difficulty?: ChallengeDifficulty,
    challenge_type?: ChallengeType,
    search?: string,
  ) {
    if (page <= 0) page = 1;
    if (limit <= 0) limit = 10;

    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Challenge> = {};

    if (challenge_difficulty) where.challenge_difficulty = challenge_difficulty;

    if (challenge_type) where.challenge_type = challenge_type;

    if (search) where.challenge_title = ILike(`%${search}%`);

    const [challenges, total] = await this.challengeRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { challenge_title: 'DESC' },
    });

    const data = challenges.map((challenge) => {
      return challenge;
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findById(id: number) {
    return await this.challengeRepository.findOne({
      where: { id },
    });
  }

  async findByTitle(challenge_title: string) {
    return await this.challengeRepository.findOne({
      where: { challenge_title },
    });
  }

  async findByType(challenge_type: ChallengeType) {
    return await this.challengeRepository.find({
      where: { challenge_type },
    });
  }

  async findByDifficulty(challenge_difficulty: ChallengeDifficulty) {
    return await this.challengeRepository.find({
      where: { challenge_difficulty },
    });
  }

  async createChallenge(
    challenge_title: string,
    challenge_content: string,
    challenge_difficulty: ChallengeDifficulty,
    challenge_type: ChallengeType,
    challenge_acceptance_rate?: number,
  ) {
    if (await this.findByTitle(challenge_title)) {
      throw new HttpException(
        `A challenge with the title "${challenge_title}" already exists, if the content is different, change the name and post again`,
        HttpStatus.CONFLICT,
      );
    }
    await this.challengeRepository.save({
      challenge_title,
      challenge_content,
      challenge_difficulty,
      challenge_type,
      challenge_acceptance_rate,
    });
  }

  async updateChallenge(
    id: number,
    challenge_title?: string,
    challenge_content?: string,
    challenge_difficulty?: ChallengeDifficulty,
    challenge_type?: ChallengeType,
  ) {
    if (!(await this.findById(id)))
      throw new NotFoundException(
        `Failed to find this challenge, can't update.`,
      );

    await this.challengeRepository.update(id, {
      challenge_title,
      challenge_content,
      challenge_difficulty,
      challenge_type,
    });
  }
}
