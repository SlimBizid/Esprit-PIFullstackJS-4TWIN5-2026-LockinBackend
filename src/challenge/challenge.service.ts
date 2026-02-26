import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { ChallengeDifficulty } from './enums/challenge-difficulty.enums';
import { ChallengeType } from './enums/challenge-type.enums';

@Injectable()
export class ChallengeService {
  constructor(
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
  ) {}

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
}
