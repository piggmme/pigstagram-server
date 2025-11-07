import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { AuthGuard } from 'src/auth/guards/auth/auth.guard';
import { GetUser } from 'src/auth/decorators/get-user/get-user.decorator';
import { RequestUser } from 'src/auth/types/jwt-payload.type';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createPostDto: CreatePostDto, @GetUser() user: RequestUser) {
    return this.postsService.create(user.sub, createPostDto);
  }

  @Get('feed')
  @UseGuards(AuthGuard)
  findFeed(@GetUser() user: RequestUser) {
    return this.postsService.findFeed(user.sub);
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard)
  findByUser(@Param('userId') userId: string) {
    return this.postsService.findByUser(Number(userId));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(Number(id));
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @GetUser() user: RequestUser,
  ) {
    return this.postsService.update(Number(id), user.sub, updatePostDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @GetUser() user: RequestUser) {
    return this.postsService.delete(Number(id), user.sub);
  }
}
