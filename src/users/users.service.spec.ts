import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should hash password and create user', async () => {
      const dto = {
        email: 'a@a.com',
        username: 'aaa',
        name: 'A',
        password: '1234',
      };
      const hashed = 'hashed_pw';
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashed as never);
      mockPrismaService.user.create.mockResolvedValue({
        id: 1,
        email: dto.email,
        username: dto.username,
        name: dto.name,
      });

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: { ...dto, password: hashed },
        select: { id: true, email: true, username: true, name: true },
      });
      expect(result).toEqual({
        id: 1,
        email: dto.email,
        username: dto.username,
        name: dto.name,
      });
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [
        {
          id: 1,
          email: 'a@a.com',
          username: 'a',
          name: 'A',
          bio: null,
          avatarUrl: null,
        },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          bio: true,
          avatarUrl: true,
        },
      });
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('should return one user when found', async () => {
      const user = { id: 1, email: 'a@a.com', username: 'a', name: 'A' };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne(1);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          bio: true,
          avatarUrl: true,
        },
      });
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const dto = { name: 'Updated' };
      const updatedUser = { id: 1, username: 'a', name: 'Updated' };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(1, dto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
        select: {
          id: true,
          username: true,
          name: true,
          bio: true,
          avatarUrl: true,
        },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      const deletedUser = { id: 1 };
      mockPrismaService.user.delete.mockResolvedValue(deletedUser);

      const result = await service.remove(1);

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(deletedUser);
    });
  });
});
