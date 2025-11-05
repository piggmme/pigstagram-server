import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule], // AuthGuard를 사용하기 위해 import
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService], // 다른 모듈에서 사용할 수 있도록 export
})
export class UsersModule {}
