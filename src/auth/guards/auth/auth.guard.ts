import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromCookie(request);

    if (!token) {
      throw new UnauthorizedException('인증 토큰이 없습니다.');
    }

    try {
      // JWT 토큰 검증
      const payload = (await this.jwtService.verifyAsync(token)) as {
        sub: number;
        email: string;
      };
      // Request 객체에 사용자 정보 추가
      (request as Request & { user: { sub: number; email: string } }).user =
        payload;
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    return true;
  }

  /**
   * 쿠키에서 access_token 추출
   */
  private extractTokenFromCookie(request: Request): string | undefined {
    return (request.cookies as { access_token?: string })?.access_token;
  }
}
