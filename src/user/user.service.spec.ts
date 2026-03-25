import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;

  const mockUserRepository = {
    save: jest.fn(),
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
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
});
