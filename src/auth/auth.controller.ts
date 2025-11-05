import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { AuthGuard } from './guards/auth/auth.guard';
import { GetUser } from './decorators/get-user/get-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
   * AuthGuard를 통해 인증된 사용자 정보 반환
   */
  @Get('me')
  @UseGuards(AuthGuard)
  getCurrentUser(@GetUser() user: { sub: number; email: string }) {
    return {
      loggedIn: true,
      user: {
        id: user.sub,
        email: user.email,
      },
    };
  }
}
