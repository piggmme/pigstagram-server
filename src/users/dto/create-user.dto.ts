import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  username: string;

  @IsString()
  name?: string;

  @IsString()
  bio?: string;

  @IsString()
  avatarUrl?: string;
}
