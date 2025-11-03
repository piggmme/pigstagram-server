import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
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
      expect(createCall?.password).toContain('.'); // salt.hash 형식
      expect(createCall?.password.split('.')).toHaveLength(2);
    });
  });

  describe('signIn', () => {
    it('should return user when credentials are valid', async () => {
      const signInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      // 실제 해싱을 위해 먼저 해시 생성
      const salt = randomBytes(8).toString('hex');
      const hash = (await scrypt(signInDto.password, salt, 32)) as Buffer;
      const hashedPassword = salt + '.' + hash.toString('hex');

      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: signInDto.email,
        password: hashedPassword,
      });

      const result = await service.signIn(signInDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        signInDto.email,
      );
      expect(result).toEqual({
        id: 1,
        email: signInDto.email,
        password: hashedPassword,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const signInDto = {
        email: 'notfound@example.com',
        password: 'password123',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException when password is invalid', async () => {
      const signInDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // 다른 비밀번호로 해시 생성
      const salt = randomBytes(8).toString('hex');
      const hash = (await scrypt('correctpassword', salt, 32)) as Buffer;
      const hashedPassword = salt + '.' + hash.toString('hex');

      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: signInDto.email,
        password: hashedPassword,
      });

      await expect(service.signIn(signInDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });
});
