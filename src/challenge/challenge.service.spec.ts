import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChallengeService } from './challenge.service';
import { Challenge } from './entities/challenge.entity';
import { UserType } from 'src/user/enums/user-type.enum';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('ChallengeService', () => {
  let service: ChallengeService;

  const mockRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    preload: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengeService,
        {
          provide: getRepositoryToken(Challenge),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ChallengeService>(ChallengeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated data', async () => {
      const queryDto = { page: 1, limit: 10 };
      const items = [{ id: 1, title: 'Test' }];
      const total = 1;

      mockRepository.findAndCount.mockResolvedValue([items, total]);

      const result = await service.findAll(queryDto as any, UserType.PLAYER);

      expect(result.data).toEqual(items);
      expect(result.meta.totalItems).toBe(total);
      expect(mockRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a challenge if found', async () => {
      const challenge = { id: 1, title: 'Test' };
      mockRepository.findOne.mockResolvedValue(challenge);

      const result = await service.findOne(1, UserType.PLAYER);
      expect(result).toEqual(challenge);
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new challenge', async () => {
      const createDto = { title: 'New Challenge' };
      const newChallenge = { ...createDto, id: 1 };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(newChallenge);
      mockRepository.save.mockResolvedValue(newChallenge);

      const result = await service.create(createDto as any);
      expect(result).toEqual(newChallenge);
      expect(mockRepository.save).toHaveBeenCalledWith(newChallenge);
    });

    it('should throw ConflictException if title exists', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, title: 'Existing' });
      await expect(
        service.create({ title: 'Existing' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on save failure', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(new Error('DB Fail'));

      await expect(service.create({ title: 'Title' } as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    it('should update a challenge successfully', async () => {
      const existing = { id: 1, title: 'Old' };
      const updateDto = { title: 'New' };

      mockRepository.findOne.mockResolvedValueOnce(existing);
      mockRepository.findOne.mockResolvedValueOnce(null);
      mockRepository.preload.mockResolvedValue({ ...existing, ...updateDto });
      mockRepository.save.mockResolvedValue({ ...existing, ...updateDto });

      const result = await service.update(1, updateDto as any);
      expect(result.title).toBe('New');
    });
  });

  describe('softDelete', () => {
    it('should call softDelete if challenge exists', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1 });
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.softDelete(1);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('restore', () => {
    it('should restore a deleted challenge', async () => {
      mockRepository.restore.mockResolvedValue({ affected: 1 });
      await service.restore(1);
      expect(mockRepository.restore).toHaveBeenCalledWith(1);
    });

    it('should throw NotFound if nothing was restored', async () => {
      mockRepository.restore.mockResolvedValue({ affected: 0 });
      await expect(service.restore(1)).rejects.toThrow(NotFoundException);
    });
  });
});
