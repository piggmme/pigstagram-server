/**
 * JWT Token Payload 타입
 */
export interface JwtPayload {
  sub: number; // user id
  email: string;
}

/**
 * Request 객체에 추가되는 사용자 정보 타입
 */
export type RequestUser = JwtPayload;

