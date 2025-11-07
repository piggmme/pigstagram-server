import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { RequestUser } from 'src/auth/types/jwt-payload.type';
import { AuthGuard } from 'src/auth/guards/auth/auth.guard';

describe('PostsController', () => {
  let controller: PostsController;
  let postsService: {
    create: jest.Mock;
    findFeed: jest.Mock;
    findByUser: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let authGuard: { canActivate: jest.Mock };

  beforeEach(async () => {
    postsService = {
      create: jest.fn(),
      findFeed: jest.fn(),
      findByUser: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    authGuard = { canActivate: jest.fn().mockReturnValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        {
          provide: PostsService,
          useValue: postsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(authGuard)
      .compile();

    controller = module.get<PostsController>(PostsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('create는 요청 유저와 DTO로 게시글을 생성한다', async () => {
    const dto: CreatePostDto = { caption: 'hi', images: ['a.jpg'] };
    const user: RequestUser = { sub: 1, email: 'user@example.com' };
    const expected = { id: 1 };
    postsService.create.mockResolvedValue(expected);

    const result = await controller.create(dto, user);

    expect(postsService.create).toHaveBeenCalledWith(user.sub, dto);
    expect(result).toBe(expected);
  });

  it('findFeed는 유저 피드를 반환한다', async () => {
    const user: RequestUser = { sub: 2, email: 'user@example.com' };
    const feed = [{ id: 1 }];
    postsService.findFeed.mockResolvedValue(feed);

    const result = await controller.findFeed(user);

    expect(postsService.findFeed).toHaveBeenCalledWith(user.sub);
    expect(result).toBe(feed);
  });

  it('findByUser는 전달된 userId로 게시글을 찾는다', async () => {
    const posts = [{ id: 1 }];
    postsService.findByUser.mockResolvedValue(posts);

    const result = await controller.findByUser('3');

    expect(postsService.findByUser).toHaveBeenCalledWith(3);
    expect(result).toBe(posts);
  });

  it('findOne은 게시글을 반환한다', async () => {
    const post = { id: 4 };
    postsService.findOne.mockResolvedValue(post);

    const result = await controller.findOne('4');

    expect(postsService.findOne).toHaveBeenCalledWith(4);
    expect(result).toBe(post);
  });

  it('update는 게시글을 수정한다', async () => {
    const user: RequestUser = { sub: 5, email: 'user@example.com' };
    const dto: UpdatePostDto = { caption: 'updated' };
    const updated = { id: 6 };
    postsService.update.mockResolvedValue(updated);

    const result = await controller.update('6', dto, user);

    expect(postsService.update).toHaveBeenCalledWith(6, user.sub, dto);
    expect(result).toBe(updated);
  });

  it('remove는 게시글을 삭제한다', async () => {
    const user: RequestUser = { sub: 7, email: 'user@example.com' };
    const response = { message: 'Post deleted' };
    postsService.delete.mockResolvedValue(response);

    const result = await controller.remove('7', user);

    expect(postsService.delete).toHaveBeenCalledWith(7, user.sub);
    expect(result).toBe(response);
  });
});
