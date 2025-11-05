import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/auth/guards/auth/auth.guard';
import { GetUser } from 'src/auth/decorators/get-user/get-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(AuthGuard) // 로그인한 사용자만 접근 가능
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard) // 로그인한 사용자만 접근 가능
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard) // 로그인한 사용자만 접근 가능
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() user: { sub: number; email: string },
  ) {
    // 본인만 수정할 수 있도록 검증
    if (+id !== user.sub) {
      throw new ForbiddenException('자신의 정보만 수정할 수 있습니다.');
    }
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard) // 로그인한 사용자만 접근 가능
  remove(
    @Param('id') id: string,
    @GetUser() user: { sub: number; email: string },
  ) {
    // 본인만 삭제할 수 있도록 검증
    if (+id !== user.sub) {
      throw new ForbiddenException('자신의 정보만 삭제할 수 있습니다.');
    }
    return this.usersService.remove(+id);
  }

  /**
   * 현재 로그인한 사용자의 프로필 조회
   * Guard에서 검증된 사용자 정보를 사용
   */
  @Get('me/profile')
  @UseGuards(AuthGuard)
  getMyProfile(@GetUser() user: { sub: number; email: string }) {
    return this.usersService.findOne(user.sub);
  }
}
