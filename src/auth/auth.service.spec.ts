import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { EmailService } from '../email/email.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { TokenBlacklistService } from './token-blacklist/token-blacklist.service';

describe('AuthService', () => {
  let module: TestingModule;
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;
  let userService: jest.Mocked<UserService>;
  let userRepository: jest.Mocked<Repository<User>>;
  let leaderboardService: jest.Mocked<LeaderboardService>;
  let blacklistService: jest.Mocked<TokenBlacklistService>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            CreateUser: jest.fn(),
            findByEmail: jest.fn(),
            findByUsername: jest.fn(),
            findUsernameExists: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendResetEmail: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: TokenBlacklistService,
          useValue: {
            blacklist: jest.fn(),
          },
        },
        {
          provide: LeaderboardService,
          useValue: {
            createEntry: jest.fn(),
            awardLoginXp: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);
    userService = module.get(UserService);
    userRepository = module.get(getRepositoryToken(User));
    leaderboardService = module.get(LeaderboardService);
    blacklistService = module.get(TokenBlacklistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('returns null when the password is missing', async () => {
      await expect(service.validateUser('ram', null as never)).resolves.toBeNull();
    });

    it('returns null when the user does not exist', async () => {
      userService.findByUsername.mockResolvedValue(null);

      await expect(service.validateUser('ram', 'secret123')).resolves.toBeNull();
    });

    it('returns the user when the password matches', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'ram',
        password: await bcrypt.hash('secret123', 10),
      } as User;

      userService.findByUsername.mockResolvedValue(mockUser);

      await expect(service.validateUser('ram', 'secret123')).resolves.toEqual(
        mockUser,
      );
    });
  });

  describe('setTokenCookies and DTO helpers', () => {
    it('sets both auth cookies and returns a DTO', () => {
      const res = { cookie: jest.fn() } as any;
      const mockUser = {
        id: 'user-1',
        username: 'ram',
        email: 'ram@example.com',
        type: 'player',
        githubHandle: 'ramdev',
        coins: 12,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      } as User;

      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      service.setTokenCookies(res, mockUser);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(service.getUserDTO(mockUser)).toEqual(
        expect.objectContaining({
          username: 'ram',
          email: 'ram@example.com',
          githubHandle: 'ramdev',
        }),
      );
    });
  });

  describe('forgotPassword', () => {
    const expectedMessage = 'If email exists, password reset link will be sent';

    it('should return generic message if user does not exist', async () => {
      userService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nonexistent@test.com',
      });
      expect(result.message).toBe(expectedMessage);

      expect(emailService.sendResetEmail).not.toHaveBeenCalled();
    });

    it('should send reset email if user exists', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        password: 'oldpass',
      } as User;
      const mockToken = 'jwt-reset-token';

      userService.findByEmail.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue(mockToken);
      emailService.sendResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword({ email: 'test@test.com' });

      expect(result.message).toBe(expectedMessage);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { email: mockUser.email },
        { expiresIn: '1h' },
      );
      expect(emailService.sendResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockToken,
      );
    });
  });

  describe('resetPassword', () => {
    it('should throw error for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.resetPassword({ token: 'invalid', newPassword: 'newpass123' }),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw error if user not found', async () => {
      jwtService.verify.mockReturnValue({ email: 'test@test.com' } as never);
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'valid-token',
          newPassword: 'newpass123',
        }),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should reset password successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        password: 'oldpass',
      } as User;

      jwtService.verify.mockReturnValue({ email: 'test@test.com' } as never);
      userService.findByEmail.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.resetPassword({
        token: 'valid-token',
        newPassword: 'newpass123',
      });

      expect(result.message).toBe('Password reset successfully');
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('SignUp', () => {
    it('creates a user and leaderboard entry', async () => {
      const mockUser = { id: 'user-uuid', email: 'test@test.com' } as User;

      userService.CreateUser.mockResolvedValue(undefined);
      userService.findByEmail.mockResolvedValue(mockUser);

      await service.SignUp('testuser', 'test@test.com', 'password123');

      expect(userService.CreateUser).toHaveBeenCalled();
      expect(leaderboardService.createEntry).toHaveBeenCalledWith({
        userId: mockUser.id,
      });
    });

    it('does not create a leaderboard entry if user lookup fails after signup', async () => {
      userService.CreateUser.mockResolvedValue(undefined);
      userService.findByEmail.mockResolvedValue(null);

      await service.SignUp('testuser', 'test@test.com', 'password123');

      expect(leaderboardService.createEntry).not.toHaveBeenCalled();
    });
  });

  describe('findOrCreateGithubUser', () => {
    it('creates a GitHub user when one does not exist', async () => {
      const profile = {
        username: 'octocat',
        email: 'octo@example.com',
        githubHandle: 'octocat',
      };
      const createdUser = { id: 'user-1', email: profile.email } as User;

      userService.findByEmail.mockResolvedValue(null);
      userService.findUsernameExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      userService.CreateUser.mockResolvedValue(createdUser as never);

      const result = await service.findOrCreateGithubUser(profile);

      expect(userService.CreateUser).toHaveBeenCalled();
      expect(leaderboardService.createEntry).toHaveBeenCalledWith({
        userId: createdUser.id,
      });
      expect(leaderboardService.awardLoginXp).toHaveBeenCalledWith('user-1');
      expect(result).toBe(createdUser);
    });

    it('returns an existing GitHub user and still awards login XP', async () => {
      const existingUser = { id: 'user-1', email: 'octo@example.com' } as User;

      userService.findByEmail.mockResolvedValue(existingUser);

      const result = await service.findOrCreateGithubUser({
        username: 'octocat',
        email: 'octo@example.com',
      });

      expect(result).toBe(existingUser);
      expect(leaderboardService.awardLoginXp).toHaveBeenCalledWith('user-1');
    });
  });

  describe('refresh and logout', () => {
    it('blacklists the old refresh token when it is still valid', async () => {
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      const user = {
        id: 'user-1',
        username: 'ram',
        email: 'ram@example.com',
        type: 'player',
        githubHandle: null,
        coins: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      jwtService.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
      } as never);
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await service.refresh(res, user, 'old-refresh-token');
      await service.logout(res, 'old-refresh-token');

      expect(blacklistService.blacklist).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('access_token');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
    });

    it('skips blacklisting when no old refresh token is provided', async () => {
      const res = { cookie: jest.fn() } as any;
      const user = {
        id: 'user-1',
        username: 'ram',
        email: 'ram@example.com',
        type: 'player',
        githubHandle: null,
        coins: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await service.refresh(res, user, '');

      expect(blacklistService.blacklist).not.toHaveBeenCalled();
    });
  });
});
