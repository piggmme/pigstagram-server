import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const hashed = await bcrypt.hash(createUserDto.password, 10);
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashed,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
      },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        bio: true,
        avatarUrl: true,
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        bio: true,
        avatarUrl: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatarUrl: true,
      },
    });
  }

  remove(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }
}
