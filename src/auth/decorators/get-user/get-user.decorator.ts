import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Request 객체에서 사용자 정보를 추출하는 데코레이터
 * AuthGuard에서 설정한 request.user를 반환
 * 
 * @example
 * @Get('profile')
 * @UseGuards(AuthGuard)
 * getProfile(@GetUser() user: { sub: number; email: string }) {
 *   return this.usersService.findOne(user.sub);
 * }
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return (request as { user?: { sub: number; email: string } }).user;
  },
);
