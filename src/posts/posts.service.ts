import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        caption: dto.caption,
        authorId: userId,
        images: {
          create: dto.images.map((url) => ({ url })),
        },
      },
      include: { images: true },
    });
    return post;
  }

  async findFeed(userId: number) {
    // 1️⃣ 내가 팔로우하고 있는 유저 ID 목록 가져오기
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    // 2️⃣ 나 자신의 게시글도 포함 (보통 자기 글도 피드에 보여요)
    followingIds.push(userId);

    // 3️⃣ 해당 유저들의 게시글만 조회
    return this.prisma.post.findMany({
      where: {
        authorId: { in: followingIds },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        images: true,
        likes: true,
        comments: true,
      },
    });
  }

  async findByUser(userId: number) {
    return this.prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: { images: true },
    });
  }

  async findOne(postId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        images: true,
        comments: {
          include: { author: { select: { id: true, username: true } } },
        },
        likes: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async update(postId: number, userId: number, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { images: true },
    });

    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Not allowed');

    // 1️⃣ 이미지 수정 처리 (MVP에선 전체 교체)
    if (dto.images && dto.images.length > 0) {
      // 기존 이미지 삭제
      await this.prisma.postImage.deleteMany({
        where: { postId: postId },
      });

      // 새 이미지 추가
      await this.prisma.postImage.createMany({
        data: dto.images.map((url) => ({
          postId,
          url,
        })),
      });
    }

    // 2️⃣ 캡션 수정
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { caption: dto.caption },
      include: { images: true },
    });

    return updatedPost;
  }

  async delete(postId: number, userId: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Not allowed');

    await this.prisma.post.delete({ where: { id: postId } });
    return { message: 'Post deleted' };
  }
}
