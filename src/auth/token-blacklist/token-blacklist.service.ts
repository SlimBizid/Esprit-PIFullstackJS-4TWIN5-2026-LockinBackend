import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { BlacklistedToken } from './token-blacklist.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TokenBlacklistService {
  constructor(
    @InjectRepository(BlacklistedToken)
    private blacklistedTokenRepository: Repository<BlacklistedToken>,
  ) {}

  async blacklist(token: string, expiresIn: number): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await this.blacklistedTokenRepository.save({ token, expiresAt });
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const entry = await this.blacklistedTokenRepository.findOne({
      where: { token },
    });
    if (!entry) return false;
    if (entry.expiresAt < new Date()) {
      await this.blacklistedTokenRepository.delete({ token });
      return false;
    }
    return true;
  }
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeExpired(): Promise<void> {
    await this.blacklistedTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
