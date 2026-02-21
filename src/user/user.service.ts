import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
      select: ['id', 'username', 'password', 'email' ,'type'], 
    });
  }

  
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'username', 'password', 'email' ,'type'],
    });
  }

  
    async validatePassword(user: User, plaintextPassword: string): Promise<boolean> {
    return bcrypt.compare(plaintextPassword, user.password);
  }
}