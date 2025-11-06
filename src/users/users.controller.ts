import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
  Body,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/auth/guards/auth/auth.guard';
import { GetUser } from 'src/auth/decorators/get-user/get-user.decorator';
import { RequestUser } from 'src/auth/types/jwt-payload.type';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(Number(id));
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() user: RequestUser,
  ) {
    // Only allow users to update their own information
    if (Number(id) !== user.sub) {
      throw new ForbiddenException('You can only update your own information');
    }
    return this.usersService.update(Number(id), updateUserDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @GetUser() user: RequestUser) {
    // Only allow users to delete their own account
    if (Number(id) !== user.sub) {
      throw new ForbiddenException('You can only delete your own account');
    }
    return this.usersService.remove(Number(id));
  }

  /**
   * Get current logged-in user's profile
   * Uses authenticated user information from Guard
   */
  @Get('me/profile')
  @UseGuards(AuthGuard)
  getMyProfile(@GetUser() user: RequestUser) {
    return this.usersService.findOne(user.sub);
  }
}
