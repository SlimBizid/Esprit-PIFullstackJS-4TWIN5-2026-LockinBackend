import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 🔴 Soft Delete
  async softRemove(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.softRemove(user);

    return { message: 'User deactivated successfully' };
  }

  // 🟢 Restore
  async restore(id: string) {
    const result = await this.userRepository.restore(id);

    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }

    return { message: 'User restored successfully' };
  }
}