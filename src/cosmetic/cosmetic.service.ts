import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { Cosmetic } from './entities/cosmetic.entity';
import { CreateCosmeticDto } from './dto/create-cosmetic.dto';
import { UpdateCosmeticDto } from './dto/update-cosmetic.dto';
import { Achievement } from 'src/achievement/entities/achievement.entity';

@Injectable()
export class CosmeticService {
  constructor(
    @InjectRepository(Cosmetic)
    private readonly cosmeticRepository: Repository<Cosmetic>,
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
  ) {}

  async create(dto: CreateCosmeticDto): Promise<Cosmetic> {
    let achievement: Achievement | undefined = undefined;
    if (dto.achievementId) {
      const nachievement = await this.achievementRepository.findOne({
        where: { id: dto.achievementId },
      });

      if (!nachievement) {
        throw new NotFoundException(
          `Achievement ${dto.achievementId} not found`,
        );
      }
      achievement = nachievement;
    }

    return await this.cosmeticRepository.save({
      imageUrl: dto.imageUrl,
      cosmeticTitle: dto.cosmeticTitle,
      cosmeticDescription: dto.cosmeticDescription,
      cosmeticRarity: dto.cosmeticRarity,
      achievement: achievement,
      cosmeticType: dto.cosmeticType,
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Cosmetic[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.cosmeticRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Cosmetic> {
    const cosmetic = await this.cosmeticRepository.findOne({ where: { id } });
    if (!cosmetic) {
      throw new NotFoundException(`Cosmetic ${id} not found`);
    }
    return cosmetic;
  }

  async findAvailableRewards(): Promise<Cosmetic[]> {
    return this.cosmeticRepository.find({
      where: {
        achievement: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findRewardConflicts(cosmeticIds: string[]): Promise<Cosmetic[]> {
    if (cosmeticIds.length === 0) {
      return [];
    }

    return this.cosmeticRepository
      .find({
        where: {
          id: In(cosmeticIds),
        },
        relations: ['achievement'],
      })
      .then((cosmetics) =>
        cosmetics.filter((cosmetic) => cosmetic.achievement != null),
      );
  }

  async assignAchievementToCosmetics(
    cosmeticIds: string[],
    achievement: Achievement,
  ): Promise<void> {
    if (cosmeticIds.length === 0) {
      return;
    }

    const cosmetics = await this.cosmeticRepository.find({
      where: {
        id: In(cosmeticIds),
      },
    });

    if (cosmetics.length !== cosmeticIds.length) {
      const foundIds = new Set(cosmetics.map((cosmetic) => cosmetic.id));
      const missingId = cosmeticIds.find((id) => !foundIds.has(id));
      throw new NotFoundException(`Cosmetic ${missingId} not found`);
    }

    await this.cosmeticRepository.save(
      cosmetics.map((cosmetic) => ({
        ...cosmetic,
        achievement,
      })),
    );
  }

  async update(id: string, dto: UpdateCosmeticDto): Promise<Cosmetic> {
    const cosmetic = await this.findOne(id);

    if (dto.achievementId !== undefined) {
      // TODO: Check if achievement with this UUID exists before updating cosmetic.
      // Throw an error if it doesn't.
    }

    Object.assign(cosmetic, {
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.cosmeticTitle !== undefined && {
        cosmeticTitle: dto.cosmeticTitle,
      }),
      ...(dto.cosmeticDescription !== undefined && {
        cosmeticDescription: dto.cosmeticDescription,
      }),
      ...(dto.cosmeticRarity !== undefined && {
        cosmeticRarity: dto.cosmeticRarity,
      }),
      ...(dto.achievementId !== undefined && {
        achievementId: dto.achievementId,
      }),
      ...(dto.cosmeticType !== undefined && {
        cosmeticType: dto.cosmeticType,
      }),
    });
    return this.cosmeticRepository.save(cosmetic);
  }

  async remove(id: string): Promise<void> {
    const cosmetic = await this.findOne(id);
    await this.cosmeticRepository.remove(cosmetic);
  }
}
