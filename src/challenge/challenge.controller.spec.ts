import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeController } from './challenge.controller';
import { ChallengeService } from './challenge.service';
import { UserType } from 'src/user/enums/user-type.enum';
import { ForbiddenException } from '@nestjs/common';

describe('ChallengeController', () => {
  let controller: ChallengeController;

  const mockChallengeService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    restore: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChallengeController],
      providers: [
        {
          provide: ChallengeService,
          useValue: mockChallengeService,
        },
      ],
    }).compile();

    controller = module.get<ChallengeController>(ChallengeController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getChallenges', () => {
    it('should call service.findAll with player role', async () => {
      const mockReq = { user: { role: UserType.PLAYER } };
      const queryDto = { page: 1, limit: 10 };

      await controller.getChallenges(mockReq as any, queryDto as any);

      expect(mockChallengeService.findAll).toHaveBeenCalledWith(
        queryDto,
        UserType.PLAYER,
      );
    });
  });

  describe('postChallenge (Admin Only)', () => {
    const createDto = { title: 'New' };
    const adminReq = { user: { role: UserType.ADMIN } };
    const playerReq = { user: { role: UserType.PLAYER } };

    it('should allow Admin to create', async () => {
      await controller.postChallenge(createDto as any, adminReq as any);

      expect(mockChallengeService.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ForbiddenException for Players', async () => {
      await expect(
        controller.postChallenge(createDto as any, playerReq as any),
      ).rejects.toThrow(ForbiddenException);

      expect(mockChallengeService.create).not.toHaveBeenCalled();
    });
  });

  describe('patchChallenge (Admin Only)', () => {
    const updateDto = { title: 'Updated' };
    const adminReq = { user: { role: UserType.ADMIN } };
    const playerReq = { user: { role: UserType.PLAYER } };

    it('should allow Admin to edit', async () => {
      await controller.patchChallenge(1, updateDto as any, adminReq as any);

      expect(mockChallengeService.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw ForbiddenException for Players', async () => {
      await expect(
        controller.patchChallenge(1, updateDto as any, playerReq as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('restoreChallenge', () => {
    it('should call service.restore for Admin', async () => {
      const adminReq = { user: { role: UserType.ADMIN } };

      await controller.restoreChallenge(1, adminReq as any);

      expect(mockChallengeService.restore).toHaveBeenCalledWith(1);
    });
  });

  describe('deleteChallenge', () => {
    it('should call service.softDelete for Admin', async () => {
      const adminReq = { user: { role: UserType.ADMIN } };

      await controller.deleteChallenge(1, adminReq as any);

      expect(mockChallengeService.softDelete).toHaveBeenCalledWith(1);
    });
  });
});
