import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            SignUp: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
            logout: jest.fn(),
            refresh: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call SignUp with correct arguments', async () => {
    authService.SignUp.mockResolvedValue(undefined);

    await controller.signUp({
      username: 'testuser',
      email: 'test@test.com',
      password: 'password123',
      githubHandle: 'myhandle',
    });

    expect(authService.SignUp).toHaveBeenCalledWith(
      'testuser',
      'test@test.com',
      'password123',
      'myhandle',
    );
  });

  it('should work without githubHandle', async () => {
    authService.SignUp.mockResolvedValue(undefined);

    await controller.signUp({
      username: 'testuser',
      email: 'test@test.com',
      password: 'password123',
      githubHandle: undefined,
    });

    expect(authService.SignUp).toHaveBeenCalledWith(
      'testuser',
      'test@test.com',
      'password123',
      undefined,
    );
  });

  it('should throw if SignUp throws', async () => {
    authService.SignUp.mockRejectedValue(new Error('Username already exists'));

    await expect(
      controller.signUp({
        username: 'testuser',
        email: 'test@test.com',
        password: 'password123',
        githubHandle: 'sl',
      }),
    ).rejects.toThrow('Username already exists');
  });

  it('forwards forgot-password to the service', async () => {
    authService.forgotPassword.mockResolvedValue({
      message: 'If email exists, password reset link will be sent',
    });

    await expect(
      controller.forgotPassword({ email: 'ram@example.com' }),
    ).resolves.toEqual({
      message: 'If email exists, password reset link will be sent',
    });
  });

  it('forwards reset-password to the service', async () => {
    authService.resetPassword.mockResolvedValue({
      message: 'Password reset successfully',
    });

    await expect(
      controller.resetPassword({
        token: 'token-1',
        newPassword: 'secret123',
      }),
    ).resolves.toEqual({
      message: 'Password reset successfully',
    });
  });

  it('logs out and returns ok', async () => {
    const res = {} as any;
    authService.logout.mockResolvedValue(undefined);

    await expect(
      controller.logout(
        { cookies: { refresh_token: 'refresh-1' } } as any,
        res,
      ),
    ).resolves.toEqual({ ok: true });
  });

  it('forwards refresh calls to the service', async () => {
    const dto = { id: 'user-1', username: 'ram' } as any;
    authService.refresh.mockResolvedValue(dto);

    await expect(
      controller.refresh(
        {
          user: { id: 'user-1' },
          cookies: { refresh_token: 'refresh-1' },
        } as any,
        {} as any,
      ),
    ).resolves.toBe(dto);
  });
});
