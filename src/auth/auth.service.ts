import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
  ) {}

  
  async validateUser(
    username: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) return null;

    
    const { password, ...result } = user;
    return result;
  }

  
  async login(user: User) {
    const payload = {
    username: user.username,
    email: user.email,
    type: user.type,
    githubHandle: user.githubHandle,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
     };
     const accessToken = this.jwtService.sign(payload, {
    expiresIn: '30m',
  });

  const refreshToken = this.jwtService.sign(payload, {
    expiresIn: '7d',
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };

   
  }

  
  async signin(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    return this.login(user as User); 
  }
  async SignUp(
    username: string,
    email: string,
    password: string,
    githubHandle?: string,
  ): Promise<void> {
    return this.userService.CreateUser(username, email, password, githubHandle);
  }
}
