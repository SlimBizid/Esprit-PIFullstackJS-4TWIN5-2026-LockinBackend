import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';

import { Cosmetic } from './entities/cosmetic.entity';
import { CreateCosmeticDto } from './dto/create-cosmetic.dto';
import { UpdateCosmeticDto } from './dto/update-cosmetic.dto';
import { Achievement } from 'src/achievement/entities/achievement.entity';
import { User } from 'src/user/entities/user.entity';
import { UserCosmetic } from 'src/user/entities/user-cosmetic.entity';

@Injectable()
export class CosmeticService {
  constructor(
    @InjectRepository(Cosmetic)
    private readonly cosmeticRepository: Repository<Cosmetic>,
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserCosmetic)
    private readonly userCosmeticRepository: Repository<UserCosmetic>,
  ) {}

  private async resolveAchievement(
    achievementId?: string | null,
  ): Promise<Achievement | null | undefined> {
    if (achievementId === undefined) {
      return undefined;
    }

    if (achievementId === null) {
      return null;
    }

    const achievement = await this.achievementRepository.findOne({
      where: { id: achievementId },
    });

    if (!achievement) {
      throw new NotFoundException(`Achievement ${achievementId} not found`);
    }

    return achievement;
  }

  private assertRewardPriceCompatibility(
    price: number | null | undefined,
    achievement: Achievement | null | undefined,
  ) {
    if (achievement && price != null) {
      throw new BadRequestException(
        'A cosmetic linked to an achievement cannot have a price',
      );
    }
  }

  async create(dto: CreateCosmeticDto): Promise<Cosmetic> {
    const achievement =
      (await this.resolveAchievement(dto.achievementId)) ?? null;
    const price: number | undefined = dto.price ?? undefined;

    this.assertRewardPriceCompatibility(price, achievement);

    return await this.cosmeticRepository.save({
      imageUrl: dto.imageUrl,
      cosmeticTitle: dto.cosmeticTitle,
      cosmeticDescription: dto.cosmeticDescription,
      cosmeticRarity: dto.cosmeticRarity,
      achievement,
      price,
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
      relations: ['achievement'],
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
    const cosmetic = await this.cosmeticRepository.findOne({
      where: { id },
      relations: ['achievement'],
    });
    if (!cosmetic) {
      throw new NotFoundException(`Cosmetic ${id} not found`);
    }
    return cosmetic;
  }

  async findOneForUser(id: string, userId: string): Promise<Cosmetic & { owned: boolean }> {
    const cosmetic = await this.findOne(id);
    const ownership = await this.userCosmeticRepository.findOne({
      where: {
        user: { id: userId },
        cosmetic: { id },
      },
    });

    return {
      ...cosmetic,
      owned: !!ownership,
    };
  }

  async findShopCosmetics(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Cosmetic[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.cosmeticRepository.findAndCount({
      where: {
        achievement: IsNull(),
        price: Not(IsNull()),
      },
      relations: ['achievement'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const ownedCosmetics = await this.userCosmeticRepository.find({
      where: {
        user: { id: userId },
      },
      relations: ['cosmetic'],
    });

    const ownedIds = new Set(
      ownedCosmetics.map((userCosmetic) => userCosmetic.cosmetic.id),
    );
    const filteredData = data.filter((cosmetic) => !ownedIds.has(cosmetic.id));

    return {
      data: filteredData,
      total: filteredData.length,
      page,
      lastPage: Math.ceil(filteredData.length / limit),
    };
  }

  async findAvailableRewards(): Promise<Cosmetic[]> {
    return this.cosmeticRepository.find({
      where: {
        achievement: IsNull(),
        price: IsNull(),
      },
      relations: ['achievement'],
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

    const pricedCosmetic = cosmetics.find((cosmetic) => cosmetic.price != null);
    if (pricedCosmetic) {
      throw new BadRequestException(
        `Cosmetic ${pricedCosmetic.cosmeticTitle} (${pricedCosmetic.id}) already has a price and cannot be used as an achievement reward`,
      );
    }

    await this.cosmeticRepository.save(
      cosmetics.map((cosmetic) => ({
        ...cosmetic,
        achievement,
        price: null,
      })),
    );
  }

  async update(id: string, dto: UpdateCosmeticDto): Promise<Cosmetic> {
    const cosmetic = await this.findOne(id);
    const nextAchievement = await this.resolveAchievement(dto.achievementId);
    const achievement =
      nextAchievement === undefined ? cosmetic.achievement : nextAchievement;
    const price = dto.price === undefined ? cosmetic.price : dto.price;

    this.assertRewardPriceCompatibility(price, achievement);

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
        achievement,
      }),
      ...(dto.price !== undefined && { price }),
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

  async buy(userId: string, cosmeticId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const cosmetic = await this.findOne(cosmeticId);

    if (cosmetic.price == null || cosmetic.achievementId != null) {
      throw new BadRequestException(
        'This cosmetic is not available for purchase',
      );
    }

    const existingOwnership = await this.userCosmeticRepository.findOne({
      where: {
        user: { id: user.id },
        cosmetic: { id: cosmetic.id },
      },
      relations: ['user', 'cosmetic'],
    });

    if (existingOwnership) {
      throw new BadRequestException('You already own this cosmetic');
    }

    if (user.coins < cosmetic.price) {
      throw new BadRequestException('Not enough coins');
    }

    user.coins -= cosmetic.price;
    await this.userRepository.save(user);

    const ownership = await this.userCosmeticRepository.save({
      user,
      cosmetic,
      equipped: false,
    });

    return {
      message: 'Cosmetic purchased successfully',
      coins: user.coins,
      cosmetic: ownership.cosmetic,
      ownershipId: ownership.id,
    };
  }
}
