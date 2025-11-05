import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload, RequestUser } from '../../types/jwt-payload.type';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromCookie(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      // JWT 토큰 검증
      const payload = (await this.jwtService.verifyAsync(
        token,
      )) as JwtPayload;
      // Request 객체에 사용자 정보 추가
      (request as Request & { user: RequestUser }).user = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
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
