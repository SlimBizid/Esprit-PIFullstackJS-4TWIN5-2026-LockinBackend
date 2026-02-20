import {
  HttpException,
  Injectable,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { UserType } from './enums/user-type.enum';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findUsernameExists(username: string): Promise<Boolean> {
    const user = await this.userRepository.findOneBy({ username });
    if (user) {
      return true;
    } else {
      return false;
    }
  }
  async findEmailExists(email: string): Promise<Boolean> {
    const user = await this.userRepository.findOneBy({ email });
    if (user) {
      return true;
    } else {
      return false;
    }
  }
  async CreateUser(
    username: string,
    email: string,
    plaintextpassword: string,
    githubhandle?: string,
  ) {
    if (await this.findUsernameExists(username)) {
      throw new HttpException('Username already exists', HttpStatus.CONFLICT);
    }
    if (await this.findEmailExists(email)) {
      throw new HttpException('Email already exists', HttpStatus.CONFLICT);
    }
    const password = await bcrypt.hash(plaintextpassword, 10);
    await this.userRepository.save({
      username,
      email,
      password,
      githubhandle,
    });
  }
}
