import {
  BadRequestException,
  Injectable,
  Inject,
  forwardRef,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { JwtPayload } from './types/jwt-payload.type';

const scrypt = promisify(_scrypt);

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const existedUser = await this.usersService.findByEmail(signUpDto.email);
    if (existedUser) {
      throw new BadRequestException('Email already exists');
    }

    // Hash the user's password
    // Generate a salt (16 bytes for better security)
    const salt = randomBytes(16).toString('hex');

    // Hash the salt and the password together
    const hash = (await scrypt(signUpDto.password, salt, 64)) as Buffer;

    // Join the hashed result and the salt together
    const hashedPassword = salt + '.' + hash.toString('hex');

    // Create a new user and save it
    const user = await this.usersService.create({
      ...signUpDto,
      password: hashedPassword,
    });

    return user;
  }

  async signIn(signInDto: SignInDto) {
    const user = await this.usersService.findByEmail(signInDto.email);

    // 보안을 위해 사용자 존재 여부와 비밀번호 불일치를 구분하지 않음
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const [salt, storedHash] = user.password.split('.');
    const hash = (await scrypt(signInDto.password, salt, 64)) as Buffer;

    if (storedHash !== hash.toString('hex')) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // JWT 토큰 발급
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
