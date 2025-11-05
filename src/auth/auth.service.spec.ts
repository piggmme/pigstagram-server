import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    it('should create a new user with hashed password', async () => {
      const signUpDto = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        name: 'Test User',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 1,
        email: signUpDto.email,
        username: signUpDto.username,
        name: signUpDto.name,
      });

      const result = await service.signUp(signUpDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        signUpDto.email,
      );
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: signUpDto.email,
          username: signUpDto.username,
          name: signUpDto.name,
        }),
      );
      expect(result).toEqual({
        id: 1,
        email: signUpDto.email,
        username: signUpDto.username,
        name: signUpDto.name,
      });
    });

    it('should throw BadRequestException when email already exists', async () => {
      const signUpDto = {
        email: 'existing@example.com',
        password: 'password123',
        username: 'testuser',
        name: 'Test User',
      };

      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: signUpDto.email,
        password: 'hashed',
      });

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        'Email already exists',
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should hash password before saving', async () => {
      const signUpDto = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        name: 'Test User',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 1,
        email: signUpDto.email,
        username: signUpDto.username,
        name: signUpDto.name,
      });

      await service.signUp(signUpDto);

      const createCallArgs = mockUsersService.create.mock.calls;
      expect(createCallArgs.length).toBeGreaterThan(0);
      const firstCall = createCallArgs[0] as unknown[];
      const createCall =
        firstCall && firstCall.length > 0
          ? (firstCall[0] as { password: string })
          : undefined;
      expect(createCall?.password).toBeDefined();
      expect(createCall?.password).not.toBe(signUpDto.password);
      expect(createCall?.password).toContain('.'); // salt.hash format
      expect(createCall?.password.split('.')).toHaveLength(2);
      // Check salt length is 32 hex characters (16 bytes)
      const salt = createCall?.password.split('.')[0];
      expect(salt?.length).toBe(32);
    });
  });

  describe('signIn', () => {
    it('should return access token and user when credentials are valid', async () => {
      const signInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      // 실제 해싱을 위해 먼저 해시 생성 (새로운 파라미터: 16 bytes salt, 64 bytes hash)
      const salt = randomBytes(16).toString('hex');
      const hash = (await scrypt(signInDto.password, salt, 64)) as Buffer;
      const hashedPassword = salt + '.' + hash.toString('hex');

      const mockUser = {
        id: 1,
        email: signInDto.email,
        password: hashedPassword,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-access-token');

      const result = await service.signIn(signInDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        signInDto.email,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        user: {
          id: 1,
          email: signInDto.email,
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const signInDto = {
        email: 'notfound@example.com',
        password: 'password123',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const signInDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Create hash with different password (using new salt length: 16 bytes)
      const salt = randomBytes(16).toString('hex');
      const hash = (await scrypt('correctpassword', salt, 64)) as Buffer;
      const hashedPassword = salt + '.' + hash.toString('hex');

      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: signInDto.email,
        password: hashedPassword,
      });

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow(
        'Invalid email or password',
      );
    });
  });
});
