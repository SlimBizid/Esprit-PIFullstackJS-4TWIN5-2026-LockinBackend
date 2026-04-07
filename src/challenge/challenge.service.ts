import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, IsNull, Not, Repository } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { UserType } from 'src/user/enums/user-type.enum';
import { ChallengeQueryDto } from './dto/get-challenges-query.dto';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';

@Injectable()
export class ChallengeService {
  constructor(
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
  ) {}

  async findAll(queryDto: ChallengeQueryDto, role: UserType) {
    const {
      page = 1,
      limit = 10,
      difficulty,
      type,
      search,
      deleted,
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Challenge> = {};

    if (difficulty) where.difficulty = difficulty;
    if (type) where.type = type;

    if (search) where.title = ILike(`%${search}%`);

    const isAdminQueryingDeleted = deleted === true && role === UserType.ADMIN;

    if (isAdminQueryingDeleted) {
      where.deletedAt = Not(IsNull());
    }

    const [items, total] = await this.challengeRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      withDeleted: isAdminQueryingDeleted,
    });

    return {
      data: items,
      meta: {
        totalItems: total,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async findOne(
    id: number,
    role: UserType = UserType.PLAYER,
  ): Promise<Challenge> {
    const challenge = await this.challengeRepository.findOne({
      where: { id },
      withDeleted: role === UserType.ADMIN,
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID #${id} not found.`);
    }

    return challenge;
  }

  async findByTitle(title: string): Promise<Challenge | null> {
    return await this.challengeRepository.findOne({
      where: { title },
      withDeleted: true,
    });
  }

  async create(createDto: CreateChallengeDto): Promise<Challenge> {
    const existingChallenge = await this.findByTitle(createDto.title);
    if (existingChallenge) {
      throw new ConflictException(
        `A challenge with the title "${createDto.title}" already exists. Please choose a unique name.`,
      );
    }

    const newChallenge = this.challengeRepository.create({
      ...createDto,
      acceptanceRate: createDto.acceptanceRate ?? 100,
    });

    try {
      return await this.challengeRepository.save(newChallenge);
    } catch {
      throw new InternalServerErrorException(
        `An unexpected error occurred while saving the challenge. `,
      );
    }
  }

  async bulkCreate(
    createDtos: CreateChallengeDto[],
  ): Promise<{ successCount: number; failureCount: number; errors: string[] }> {
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < createDtos.length; i++) {
      const dto = createDtos[i];
      try {
        const existing = await this.findByTitle(dto.title);
        if (existing) {
          throw new ConflictException(`Title "${dto.title}" is already taken.`);
        }

        const newChallenge = this.challengeRepository.create({
          title: dto.title,
          content: dto.content,
          examples: dto.examples,
          constraints: dto.constraints,
          conditions: dto.conditions,
          cases: dto.cases,
          type: dto.type,
          difficulty: dto.difficulty,
          topics: dto.topics,
          acceptanceRate: dto.acceptanceRate ?? 100,
        });

        await this.challengeRepository.save(newChallenge);
        successCount++;
      } catch (error) {
        failureCount++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${i + 1}: ${errorMessage}`);
      }
    }

    return { successCount, failureCount, errors };
  }

  async update(id: number, updateDto: UpdateChallengeDto): Promise<Challenge> {
    const challenge = await this.findOne(id, UserType.ADMIN);

    if (updateDto.title && updateDto.title !== challenge.title) {
      const existing = await this.findByTitle(updateDto.title);
      if (existing) {
        throw new ConflictException(
          `Title "${updateDto.title}" is already taken.`,
        );
      }
    }

    const updatedChallenge = await this.challengeRepository.preload({
      id: id,
      ...updateDto,
    });

    if (!updatedChallenge) {
      throw new NotFoundException(`Challenge #${id} could not be preloaded.`);
    }

    return await this.challengeRepository.save(updatedChallenge);
  }

  async softDelete(id: number): Promise<void> {
    await this.findOne(id, UserType.ADMIN);
    await this.challengeRepository.softDelete(id);
  }

  async restore(id: number): Promise<void> {
    const result = await this.challengeRepository.restore(id);

    if (result.affected === 0) {
      throw new NotFoundException(
        `Challenge #${id} not found or is not currently deleted.`,
      );
    }
  }
}
