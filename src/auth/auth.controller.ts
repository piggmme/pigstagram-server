import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('signup')
  async signup(@Body() signUpDto: SignUpDto, @Res() res: Response) {
    const user = await this.authService.signUp(signUpDto);
    return res.status(HttpStatus.CREATED).json(user);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signIn(signInDto);

    // JWT 토큰을 쿠키에 저장
    res.cookie('access_token', result.accessToken, {
      httpOnly: true, // JavaScript로 접근 불가 (XSS 공격 방지)
      secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
      sameSite: 'strict', // CSRF 공격 방지
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일 (밀리초)
    });

    return res.json({
      user: result.user,
      message: '로그인 성공',
    });
  }

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  signOut(@Res({ passthrough: true }) res: Response) {
    // 쿠키 삭제
    res.clearCookie('access_token');
    return res.json({ message: '로그아웃 성공' });
  }

  /**
   * 현재 로그인한 사용자 정보 확인
   * 쿠키에서 토큰을 읽어서 사용자 정보를 반환
   */
  @Get('me')
  getCurrentUser(@Req() req: Request) {
    const token = (req.cookies as { access_token?: string })?.access_token;

    if (!token) {
      return { message: '로그인되지 않았습니다.', loggedIn: false };
    }

    try {
      const payload: { sub: number; email: string } =
        this.jwtService.verify(token);
      return {
        loggedIn: true,
        user: {
          id: payload.sub,
          email: payload.email,
        },
      };
    } catch {
      return { message: '유효하지 않은 토큰입니다.', loggedIn: false };
    }
  }
}
