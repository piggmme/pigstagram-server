import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    signUp: jest.fn(),
    signIn: jest.fn(),
  };

  const mockResponse = {
    status: jest.fn(() => mockResponse),
    json: jest.fn(() => mockResponse),
    cookie: jest.fn(() => mockResponse),
    clearCookie: jest.fn(() => mockResponse),
  } as unknown as Response;

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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('should call authService.signUp and return user with 201 status', async () => {
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

      await controller.signup(signUpDto, mockResponse);

      expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpDto);
      expect(mockAuthService.signUp).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe('signIn', () => {
    it('should call authService.signIn, set cookie and return user', async () => {
      const signInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const serviceResult = {
        accessToken: 'mock-token',
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      mockAuthService.signIn.mockResolvedValue(serviceResult);

      await controller.signIn(signInDto, mockResponse);

      expect(mockAuthService.signIn).toHaveBeenCalledWith(signInDto);
      expect(mockAuthService.signIn).toHaveBeenCalledTimes(1);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'mock-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
        }),
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        user: serviceResult.user,
        message: '로그인 성공',
      });
    });
  });

  describe('signOut', () => {
    it('should clear access_token cookie and return success message', () => {
      controller.signOut(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: '로그아웃 성공',
      });
    });
  });
});
