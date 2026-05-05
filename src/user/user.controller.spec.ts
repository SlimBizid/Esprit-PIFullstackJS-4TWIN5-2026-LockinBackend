import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserType } from './enums/user-type.enum';
import { ForbiddenException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            findAll: jest.fn(),
            updateUserRole: jest.fn(),
            changePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateRole', () => {
    it("should throw ForbiddenException 403 if requester is not an admin. contact Ram A.S.A.P if it doesn't happen", async () => {
      const mockReq = { user: { type: UserType.PLAYER } };
      const targetId = 'grilled-cheese-obama-sandwich-67';
      const newRole = UserType.ADMIN;

      await expect(
        controller.updateRole(targetId, newRole, mockReq as any),
      ).rejects.toThrow(ForbiddenException);

      expect(service.updateUserRole).not.toHaveBeenCalled();
    });

    it('should allow an admin to update a role', async () => {
      const mockReq = { user: { type: UserType.ADMIN } };
      const targetId = 'grilled-cheese-obama-sandwich-67';
      const newRole = UserType.ADMIN;

      const mockUpdateUser = { id: targetId, type: newRole };
      jest
        .spyOn(service, 'updateUserRole')
        .mockResolvedValue(mockUpdateUser as any);

      const result = await controller.updateRole(
        targetId,
        newRole,
        mockReq as any,
      );

      expect(result).toEqual(mockUpdateUser);
      expect(service.updateUserRole).toHaveBeenCalledWith(targetId, newRole);
    });
  });

  describe('findAll', () => {
    it('should pass the correct role to the service', async () => {
      const mockReq = { user: { type: UserType.PLAYER } };
      const mockResponse = { data: [], total: 0, page: 1, lastPage: 0 };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockResponse);

      await controller.findAll(mockReq as any, 1, 10);

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        UserType.PLAYER,
        undefined,
        undefined,
      );
    });
  });

  describe('changePassword', () => {
    it('should forward the authenticated user and payload to the service', async () => {
      const mockReq = { user: { id: 'user-1' } };
      const payload = {
        currentPassword: 'oldpass123',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      };

      jest
        .spyOn(service, 'changePassword')
        .mockResolvedValue({ message: 'Password updated successfully' });

      const result = await controller.changePassword(mockReq as any, payload);

      expect(result).toEqual({ message: 'Password updated successfully' });
      expect(service.changePassword).toHaveBeenCalledWith(
        mockReq.user,
        payload,
      );
    });
  });
});
