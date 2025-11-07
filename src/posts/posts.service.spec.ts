import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: {
    post: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    follow: {
      findMany: jest.Mock;
    };
    postImage: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      post: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      follow: {
        findMany: jest.fn(),
      },
      postImage: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a post with images', async () => {
    const dto = { caption: 'hello', images: ['a.jpg', 'b.jpg'] };
    const expectedPost = { id: 1 };
    prisma.post.create.mockResolvedValue(expectedPost);

    const result = await service.create(10, dto);

    expect(prisma.post.create).toHaveBeenCalledWith({
      data: {
        caption: dto.caption,
        authorId: 10,
        images: {
          create: dto.images.map((url) => ({ url })),
        },
      },
      include: { images: true },
    });
    expect(result).toBe(expectedPost);
  });

  it('retrieves feed posts for following users and self', async () => {
    const feed = [{ id: 1 }];
    prisma.follow.findMany.mockResolvedValue([{ followingId: 2 }]);
    prisma.post.findMany.mockResolvedValue(feed);

    const result = await service.findFeed(1);

    expect(prisma.follow.findMany).toHaveBeenCalledWith({
      where: { followerId: 1 },
      select: { followingId: true },
    });
    expect(prisma.post.findMany).toHaveBeenCalledWith({
      where: { authorId: { in: [2, 1] } },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        images: true,
        likes: true,
        comments: true,
      },
    });
    expect(result).toBe(feed);
  });

  it('throws if a post is not found', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a post when found', async () => {
    const post = { id: 1 };
    prisma.post.findUnique.mockResolvedValue(post);

    const result = await service.findOne(1);

    expect(prisma.post.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        images: true,
        comments: {
          include: { author: { select: { id: true, username: true } } },
        },
        likes: true,
      },
    });
    expect(result).toBe(post);
  });

  it('throws if a non-author attempts to update', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 1,
      authorId: 20,
      images: [],
    });

    await expect(
      service.update(1, 10, { caption: 'hi', images: [] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates images and caption for the author', async () => {
    const dto = { caption: 'new', images: ['x.jpg'] };
    const existing = {
      id: 1,
      authorId: 10,
      images: [{ id: 1, url: 'old.jpg' }],
    };
    const updated = {
      ...existing,
      caption: dto.caption,
      images: [{ id: 2, url: 'x.jpg' }],
    };

    prisma.post.findUnique.mockResolvedValue(existing);
    prisma.post.update.mockResolvedValue(updated);

    const result = await service.update(1, 10, dto);

    expect(prisma.postImage.deleteMany).toHaveBeenCalledWith({
      where: { postId: 1 },
    });
    expect(prisma.postImage.createMany).toHaveBeenCalledWith({
      data: dto.images.map((url) => ({ postId: 1, url })),
    });
    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { caption: dto.caption },
      include: { images: true },
    });
    expect(result).toBe(updated);
  });

  it('deletes a post after verifying author', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 1,
      authorId: 10,
    });
    prisma.post.delete.mockResolvedValue(undefined);

    const result = await service.delete(1, 10);

    expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual({ message: 'Post deleted' });
  });

  it('throws if a non-author attempts to delete', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 1,
      authorId: 20,
    });

    await expect(service.delete(1, 10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
