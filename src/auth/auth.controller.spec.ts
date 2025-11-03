import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    signUp: jest.fn(),
    signIn: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('should call authService.signUp with signUpDto', async () => {
      const signUpDto = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        name: 'Test User',
      };

      const expectedResult = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
      };

      mockAuthService.signUp.mockResolvedValue(expectedResult);

      const result = await controller.signup(signUpDto);

      expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpDto);
      expect(mockAuthService.signUp).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('signIn', () => {
    it('should call authService.signIn with signInDto', async () => {
      const signInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResult = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed',
      };

      mockAuthService.signIn.mockResolvedValue(expectedResult);

      const result = await controller.signIn(signInDto);

      expect(mockAuthService.signIn).toHaveBeenCalledWith(signInDto);
      expect(mockAuthService.signIn).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });
});
