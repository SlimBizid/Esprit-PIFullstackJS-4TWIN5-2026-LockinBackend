import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Achievement } from '../achievement/entities/achievement.entity';
import { UserCosmetic } from './entities/user-cosmetic.entity';
import { Cosmetic } from '../cosmetic/entities/cosmetic.entity';

describe('UserService', () => {
  let service: UserService;

  const mockUserRepository = {
    save: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const mockAchievementRepository = {
    find: jest.fn(),
  };
  const mockUserCosmeticRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };
  const mockCosmeticRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Achievement),
          useValue: mockAchievementRepository,
        },
        {
          provide: getRepositoryToken(UserCosmetic),
          useValue: mockUserCosmeticRepository,
        },
        {
          provide: getRepositoryToken(Cosmetic),
          useValue: mockCosmeticRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findUsernameExists', () => {
    it('should return true if username exists', async () => {
      mockUserRepository.findOneBy.mockResolvedValue({ username: 'testuser' });
      expect(await service.findUsernameExists('testuser')).toBe(true);
    });

    it('should return false if username does not exist', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      expect(await service.findUsernameExists('testuser')).toBe(false);
    });
  });

  describe('findEmailExists', () => {
    it('should return true if email exists', async () => {
      mockUserRepository.findOneBy.mockResolvedValue({
        email: 'test@test.com',
      });
      expect(await service.findEmailExists('test@test.com')).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      expect(await service.findEmailExists('test@test.com')).toBe(false);
    });
  });

  describe('CreateUser', () => {
    it('should create a user successfully', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue({});

      await service.CreateUser('testuser', 'test@test.com', 'password123');

      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should hash the password before saving', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue({});

      await service.CreateUser('testuser', 'test@test.com', 'password123');

      const savedUser = mockUserRepository.save.mock.calls[0][0];
      expect(savedUser.password).not.toBe('password123');
      expect(savedUser.password).toMatch(/^\$2b\$/);
    });

    it('should throw 409 if username already exists', async () => {
      mockUserRepository.findOneBy.mockResolvedValueOnce({
        username: 'testuser',
      });

      await expect(
        service.CreateUser('testuser', 'test@test.com', 'password123'),
      ).rejects.toThrow(
        new HttpException('Username already exists', HttpStatus.CONFLICT),
      );
    });

    it('should throw 409 if email already exists', async () => {
      mockUserRepository.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ email: 'test@test.com' });

      await expect(
        service.CreateUser('testuser', 'test@test.com', 'password123'),
      ).rejects.toThrow(
        new HttpException('Email already exists', HttpStatus.CONFLICT),
      );
    });

    it('should save with correct fields', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue({});

      await service.CreateUser(
        'testuser',
        'test@test.com',
        'password123',
        'myhandle',
      );

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          email: 'test@test.com',
          githubHandle: 'myhandle',
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('should update the password when the current password is valid', async () => {
      const hashedPassword = await bcrypt.hash('currentpass123', 10);
      const persistedUser = {
        id: 'user-1',
        password: hashedPassword,
        githubHandle: null,
      };

      mockUserRepository.findOne.mockResolvedValue(persistedUser);
      mockUserRepository.save.mockResolvedValue({
        ...persistedUser,
        password: 'new-hash',
      });

      const result = await service.changePassword({ id: 'user-1' } as User, {
        currentPassword: 'currentpass123',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      });

      expect(result).toEqual({ message: 'Password updated successfully' });
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          password: expect.not.stringMatching(/^currentpass123$/),
        }),
      );
    });

    it('should reject mismatched password confirmation', async () => {
      const hashedPassword = await bcrypt.hash('currentpass123', 10);
      mockUserRepository.findOne.mockResolvedValue({
        id: 'user-1',
        password: hashedPassword,
        githubHandle: null,
      });

      await expect(
        service.changePassword({ id: 'user-1' } as User, {
          currentPassword: 'currentpass123',
          newPassword: 'newpass123',
          confirmPassword: 'different123',
        }),
      ).rejects.toThrow(new BadRequestException('New passwords do not match'));
    });

    it('should reject GitHub-only accounts', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'user-1',
        password: null,
        githubHandle: 'octocat',
      });

      await expect(
        service.changePassword({ id: 'user-1' } as User, {
          currentPassword: 'currentpass123',
          newPassword: 'newpass123',
          confirmPassword: 'newpass123',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'GitHub-only accounts cannot update password here',
        ),
      );
    });
  });
});
