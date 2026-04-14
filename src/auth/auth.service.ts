import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Response, response } from 'express';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { UserDTO } from './dto/user.dto';
import { TokenBlacklistService } from './token-blacklist/token-blacklist.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private leaderboardService: LeaderboardService,
    private tokenBlacklistService: TokenBlacklistService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async validateUser(username: string, pass: string): Promise<User | null> {
    if (pass == null) return null;
    const user = await this.userService.findByUsername(username);
    if (!user) return null;
    let isMatch = false;
    if (user.password != null) {
      isMatch = await bcrypt.compare(pass, user.password);
    }
    if (!isMatch) return null;
    return user;
  }

  setTokenCookies(res: Response, user: User) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      type: user.type,
      githubHandle: user.githubHandle,
      createdAt: user.createdAt,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '30m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 30,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
  }

  getUserDTO(user: User): UserDTO {
    return {
      id: user.id,
      username: user.username,
      githubHandle: user.githubHandle,
      email: user.email,
      type: user.type,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
  async SignUp(
    username: string,
    email: string,
    password: string,
    githubHandle?: string,
  ): Promise<void> {
    await this.userService.CreateUser(username, email, password, githubHandle);
    const newUser = await this.userService.findByEmail(email);
    if (newUser) {
      await this.leaderboardService.createEntry({ userId: newUser.id });
    }
  }
  async findOrCreateGithubUser(profile: any): Promise<User> {
    const user = await this.userService.findByEmail(profile.email);

    if (!user) {
      let usernameExists = await this.userService.findUsernameExists(
        profile.username,
      );
      while (usernameExists) {
        profile.username = `${profile.username}${Math.floor(100 + Math.random() * 900)}`;
        usernameExists = await this.userService.findUsernameExists(
          profile.username,
        );
      }
      const user = await this.userService.CreateUser(
        profile.username,
        profile.email,
        undefined,
        profile.githubHandle,
      );
      if (!user) {
        throw new Error('User creation failed');
      }
      await this.leaderboardService.createEntry({ userId: user.id });
      await this.awardLoginXp(user.id);
      return user;
    }
    await this.awardLoginXp(user.id);
    return user;
  }
  async awardLoginXp(userId: string): Promise<void> {
    await this.leaderboardService.awardLoginXp(userId);
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.userService.findByEmail(email);

    if (user) {
      const resetToken = this.jwtService.sign(
        { email: user.email },
        { expiresIn: '1h' },
      );

      await this.emailService.sendResetEmail(user.email, resetToken);
    }
    return {
      message: 'If email exists, password reset link will be sent',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    try {
      const payload = this.jwtService.verify(token);
      const email = payload.email;

      const user = await this.userService.findByEmail(email);

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;

      await this.userRepository.save(user);

      return { message: 'Password reset successfully' };
    } catch (error) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }
  //terrible type-checking
  async refresh(
    res: Response,
    user: User,
    oldRefreshToken: string,
  ): Promise<UserDTO> {
    if (oldRefreshToken) {
      const payload = this.jwtService.decode(oldRefreshToken);
      const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) {
        await this.tokenBlacklistService.blacklist(oldRefreshToken, expiresIn);
      }
    }
    this.setTokenCookies(res, user);
    return this.getUserDTO(user);
  }

  async logout(res: Response, refreshToken: string): Promise<void> {
    if (refreshToken) {
      const payload = this.jwtService.decode(refreshToken);
      const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) {
        await this.tokenBlacklistService.blacklist(refreshToken, expiresIn);
      }
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }
}
