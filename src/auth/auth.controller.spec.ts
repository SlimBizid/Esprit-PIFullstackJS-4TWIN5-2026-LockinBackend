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
          useValue: { SignUp: jest.fn() },
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
});
