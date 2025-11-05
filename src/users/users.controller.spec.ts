import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthGuard } from 'src/auth/guards/auth/auth.guard';
import { ForbiddenException } from '@nestjs/common';
import { RequestUser } from 'src/auth/types/jwt-payload.type';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: AuthGuard,
          useValue: mockAuthGuard,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const expectedResult = [
        {
          id: 1,
          email: 'test@example.com',
          username: 'testuser',
          name: 'Test User',
        },
      ];

      mockUsersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      const userId = '1';
      const expectedResult = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
      };

      mockUsersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(userId);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a user when user is the owner', async () => {
      const userId = '1';
      const updateUserDto = {
        name: 'Updated Name',
      };
      const mockUser: RequestUser = { sub: 1, email: 'test@example.com' };

      const expectedResult = {
        id: 1,
        username: 'testuser',
        name: 'Updated Name',
      };

      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(userId, updateUserDto, mockUser);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.update).toHaveBeenCalledWith(1, updateUserDto);
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const userId = '1';
      const updateUserDto = {
        name: 'Updated Name',
      };
      const mockUser: RequestUser = { sub: 2, email: 'other@example.com' };

      try {
        await controller.update(userId, updateUserDto, mockUser);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(mockUsersService.update).not.toHaveBeenCalled();
      }
    });
  });

  describe('remove', () => {
    it('should delete a user when user is the owner', async () => {
      const userId = '1';
      const mockUser: RequestUser = { sub: 1, email: 'test@example.com' };
      const expectedResult = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
      };

      mockUsersService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(userId, mockUser);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.remove).toHaveBeenCalledWith(1);
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const userId = '1';
      const mockUser: RequestUser = { sub: 2, email: 'other@example.com' };

      try {
        await controller.remove(userId, mockUser);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(mockUsersService.remove).not.toHaveBeenCalled();
      }
    });
  });

  describe('getMyProfile', () => {
    it('should return current user profile', async () => {
      const mockUser: RequestUser = { sub: 1, email: 'test@example.com' };
      const expectedResult = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        bio: null,
        avatarUrl: null,
      };

      mockUsersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.getMyProfile(mockUser);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
    });
  });
});
