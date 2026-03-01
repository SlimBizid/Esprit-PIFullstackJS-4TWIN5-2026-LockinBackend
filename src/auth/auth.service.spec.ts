import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { Repository } from 'typeorm';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;
  let userService: jest.Mocked<UserService>;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            CreateUser: jest.fn(),
            findByEmail: jest.fn(),
            updatePassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);
    userService = module.get(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      const mockPayload = { email: 'test@test.com' };
      jwtService.verify.mockReturnValue(mockPayload);
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'valid-token',
          newPassword: 'newpass123',
        }),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should reset password successfully', async () => {
      const mockPayload = { email: 'test@test.com' };
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        password: 'oldpass',
      } as User;

      jwtService.verify.mockReturnValue(mockPayload);
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
});
