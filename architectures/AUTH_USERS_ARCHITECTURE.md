# Authentication & Users Module Architecture

## 📋 목차

- [개요](#개요)
- [모듈 구조](#모듈-구조)
- [인증(Authentication) 시스템](#인증authentication-시스템)
- [사용자 관리(Users) 시스템](#사용자-관리users-시스템)
- [보안 기능](#보안-기능)
- [API 엔드포인트](#api-엔드포인트)
- [데이터 흐름](#데이터-흐름)
- [모듈 의존성](#모듈-의존성)

---

## 개요

이 프로젝트는 **인증(Authentication)**과 **사용자 관리(Users)**를 분리한 모듈형 아키텍처를 사용합니다. JWT 토큰 기반 인증과 쿠키를 활용한 세션 관리를 구현했습니다.

### 주요 특징

- ✅ **관심사 분리**: 인증 로직과 사용자 관리 로직 분리
- ✅ **JWT 기반 인증**: 쿠키에 저장된 토큰으로 인증 상태 관리
- ✅ **보안 강화**: 비밀번호 해싱, 에러 메시지 통일, XSS/CSRF 방지
- ✅ **타입 안정성**: TypeScript 타입 정의로 타입 안정성 보장
- ✅ **순환 참조 해결**: `forwardRef`를 사용한 모듈 간 의존성 관리

---

## 모듈 구조

```
src/
├── auth/                          # 인증 모듈
│   ├── auth.module.ts            # AuthModule
│   ├── auth.service.ts           # 인증 비즈니스 로직
│   ├── auth.controller.ts        # 인증 API 엔드포인트
│   ├── guards/
│   │   └── auth/
│   │       └── auth.guard.ts     # JWT 인증 Guard
│   ├── decorators/
│   │   └── get-user/
│   │       └── get-user.decorator.ts  # 사용자 정보 추출 데코레이터
│   ├── types/
│   │   └── jwt-payload.type.ts   # JWT Payload 타입 정의
│   └── dto/
│       ├── signup.dto.ts        # 회원가입 DTO
│       └── signin.dto.ts        # 로그인 DTO
│
└── users/                         # 사용자 관리 모듈
    ├── users.module.ts           # UsersModule
    ├── users.service.ts          # 사용자 CRUD 비즈니스 로직
    ├── users.controller.ts       # 사용자 API 엔드포인트
    └── dto/
        ├── create-user.dto.ts    # 사용자 생성 DTO
        └── update-user.dto.ts    # 사용자 수정 DTO
```

---

## 인증(Authentication) 시스템

### AuthModule

**책임**: 사용자 인증 및 인가 처리

**의존성**:
- `UsersModule` (순환 참조 해결을 위해 `forwardRef` 사용)
- `JwtModule` (JWT 토큰 발급 및 검증)

**Export**:
- `AuthGuard`: 다른 모듈에서 인증 Guard 사용 가능
- `JwtModule`: Guard의 의존성(JwtService) 제공

```typescript
@Module({
  imports: [
    forwardRef(() => UsersModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthGuard, JwtModule],
})
export class AuthModule {}
```

### AuthService

**주요 기능**:

1. **회원가입 (signUp)**
   - 이메일 중복 검사
   - 비밀번호 해싱 (scrypt, 16 bytes salt, 64 bytes hash)
   - 사용자 생성

2. **로그인 (signIn)**
   - 이메일/비밀번호 검증
   - JWT 토큰 발급
   - 보안: 사용자 존재 여부 노출 방지 (통일된 에러 메시지)

```typescript
// 비밀번호 해싱
const salt = randomBytes(16).toString('hex');  // 16 bytes
const hash = (await scrypt(password, salt, 64)) as Buffer;  // 64 bytes
const hashedPassword = salt + '.' + hash.toString('hex');
```

### AuthController

**엔드포인트**:

- `POST /auth/signup` - 회원가입
- `POST /auth/signin` - 로그인 (쿠키에 토큰 저장)
- `POST /auth/signout` - 로그아웃 (쿠키 삭제)
- `GET /auth/me` - 현재 로그인한 사용자 정보 (인증 필요)

**쿠키 설정**:
```typescript
res.cookie('access_token', token, {
  httpOnly: true,        // XSS 공격 방지
  secure: production,    // HTTPS에서만 전송
  sameSite: 'strict',    // CSRF 공격 방지
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7일
});
```

### AuthGuard

**역할**: 요청 전에 JWT 토큰 검증

**동작 흐름**:
1. 쿠키에서 `access_token` 추출
2. JWT 토큰 검증 (`jwtService.verifyAsync`)
3. 검증 성공 시 `request.user`에 사용자 정보 저장
4. 검증 실패 시 `UnauthorizedException` 발생

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const token = this.extractTokenFromCookie(request);
  if (!token) {
    throw new UnauthorizedException('Authentication token is missing');
  }
  
  const payload = await this.jwtService.verifyAsync(token);
  request.user = payload;  // 사용자 정보 저장
  return true;
}
```

### GetUser Decorator

**역할**: 컨트롤러에서 인증된 사용자 정보를 쉽게 가져오기

```typescript
@Get('profile')
@UseGuards(AuthGuard)
getProfile(@GetUser() user: RequestUser) {
  // user.sub: 사용자 ID
  // user.email: 사용자 이메일
}
```

---

## 사용자 관리(Users) 시스템

### UsersModule

**책임**: 사용자 데이터 CRUD 작업

**의존성**:
- `AuthModule` (AuthGuard 사용을 위해 `forwardRef` 사용)
- `PrismaService` (데이터베이스 접근)

**Export**:
- `UsersService`: 다른 모듈(예: AuthModule)에서 사용 가능

```typescript
@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
```

### UsersService

**주요 메서드**:

- `create(createUserDto)` - 사용자 생성 (비밀번호는 이미 해싱된 상태로 받음)
- `findAll()` - 모든 사용자 조회
- `findByEmail(email)` - 이메일로 사용자 검색 (인증용)
- `findOne(id)` - ID로 사용자 조회
- `update(id, updateUserDto)` - 사용자 정보 수정
- `remove(id)` - 사용자 삭제

**특징**:
- `select`를 사용하여 필요한 필드만 반환 (비밀번호 제외)
- `findByEmail`만 비밀번호 포함 (인증 검증용)

### UsersController

**엔드포인트** (모두 인증 필요):

- `GET /users` - 모든 사용자 목록 조회
- `GET /users/:id` - 특정 사용자 조회
- `GET /users/me/profile` - 현재 로그인한 사용자 프로필
- `PATCH /users/:id` - 사용자 정보 수정 (본인만 가능)
- `DELETE /users/:id` - 사용자 삭제 (본인만 가능)

**권한 검증**:
```typescript
@Patch(':id')
@UseGuards(AuthGuard)
update(@Param('id') id: string, @GetUser() user: RequestUser) {
  if (+id !== user.sub) {
    throw new ForbiddenException('You can only update your own information');
  }
  // ...
}
```

---

## 보안 기능

### 1. 비밀번호 해싱

- **알고리즘**: scrypt
- **Salt**: 16 bytes (32 hex characters)
- **Hash 길이**: 64 bytes (128 hex characters)
- **저장 형식**: `salt.hexHash`

```typescript
// 해싱
const salt = randomBytes(16).toString('hex');
const hash = await scrypt(password, salt, 64);
const stored = salt + '.' + hash.toString('hex');

// 검증
const [salt, storedHash] = stored.split('.');
const hash = await scrypt(password, salt, 64);
if (storedHash !== hash.toString('hex')) {
  throw new UnauthorizedException('Invalid email or password');
}
```

### 2. JWT 토큰

- **Payload**: `{ sub: userId, email: userEmail }`
- **만료 시간**: 7일
- **저장 위치**: HttpOnly 쿠키
- **검증**: 모든 보호된 엔드포인트에서 자동 검증

### 3. 쿠키 보안 설정

- `httpOnly: true` - JavaScript 접근 불가 (XSS 방지)
- `secure: production` - HTTPS에서만 전송
- `sameSite: 'strict'` - CSRF 공격 방지

### 4. 에러 메시지 통일

로그인 실패 시 사용자 존재 여부를 노출하지 않음:
- 사용자 없음: `"Invalid email or password"`
- 비밀번호 불일치: `"Invalid email or password"`

---

## API 엔드포인트

### 인증 (Auth)

| Method | Endpoint | 인증 필요 | 설명 |
|--------|----------|----------|------|
| POST | `/auth/signup` | ❌ | 회원가입 |
| POST | `/auth/signin` | ❌ | 로그인 (쿠키에 토큰 저장) |
| POST | `/auth/signout` | ❌ | 로그아웃 (쿠키 삭제) |
| GET | `/auth/me` | ✅ | 현재 로그인한 사용자 정보 |

### 사용자 (Users)

| Method | Endpoint | 인증 필요 | 권한 | 설명 |
|--------|----------|----------|------|------|
| GET | `/users` | ✅ | - | 모든 사용자 목록 |
| GET | `/users/:id` | ✅ | - | 특정 사용자 조회 |
| GET | `/users/me/profile` | ✅ | - | 현재 사용자 프로필 |
| PATCH | `/users/:id` | ✅ | 본인만 | 사용자 정보 수정 |
| DELETE | `/users/:id` | ✅ | 본인만 | 사용자 삭제 |

---

## 데이터 흐름

### 회원가입 흐름

```
1. Client → POST /auth/signup
   Body: { email, password, username, name }

2. AuthController.signup()
   ↓
3. AuthService.signUp()
   - 이메일 중복 체크 (UsersService.findByEmail)
   - 비밀번호 해싱 (scrypt)
   - UsersService.create() 호출

4. UsersService.create()
   - Prisma로 DB에 저장
   - 비밀번호 제외한 사용자 정보 반환

5. Response: 201 Created
   Body: { id, email, username, name }
```

### 로그인 흐름

```
1. Client → POST /auth/signin
   Body: { email, password }

2. AuthController.signIn()
   ↓
3. AuthService.signIn()
   - UsersService.findByEmail()로 사용자 조회
   - 비밀번호 검증 (scrypt)
   - JWT 토큰 발급

4. AuthController.signIn()
   - 쿠키에 access_token 저장
   
5. Response: 200 OK
   Set-Cookie: access_token=...
   Body: { user: { id, email }, message: "Sign in successful" }
```

### 보호된 엔드포인트 접근 흐름

```
1. Client → GET /users
   Cookie: access_token=...

2. AuthGuard.canActivate()
   - 쿠키에서 토큰 추출
   - JWT 검증
   - request.user에 사용자 정보 저장

3. UsersController.findAll()
   - @GetUser() 데코레이터로 사용자 정보 사용 가능
   - UsersService.findAll() 호출

4. Response: 200 OK
   Body: [{ id, email, username, ... }]
```

---

## 모듈 의존성

### 순환 참조 해결

```
AuthModule ──forwardRef──> UsersModule
     ↑                          ↓
     └──forwardRef──────────────┘
```

**문제**: 
- `AuthModule`이 `UsersModule`을 import (UsersService 사용)
- `UsersModule`이 `AuthModule`을 import (AuthGuard 사용)
- 순환 참조 발생

**해결**:
- 모듈 레벨: `forwardRef(() => UsersModule)`, `forwardRef(() => AuthModule)`
- 서비스 레벨: `@Inject(forwardRef(() => UsersService))`

### 타입 정의

**JwtPayload / RequestUser**:
```typescript
interface JwtPayload {
  sub: number;    // user id
  email: string;
}

type RequestUser = JwtPayload;
```

**사용 위치**:
- `AuthGuard`: JWT 검증 후 `request.user`에 저장
- `GetUser` 데코레이터: `request.user` 반환
- 컨트롤러: `@GetUser() user: RequestUser`로 사용

---

## 보안 고려사항

### ✅ 구현된 보안 기능

1. **비밀번호 해싱**: scrypt 알고리즘 (16 bytes salt, 64 bytes hash)
2. **JWT 토큰**: HttpOnly 쿠키에 저장
3. **에러 메시지 통일**: Enumeration 공격 방지
4. **쿠키 보안**: httpOnly, secure, sameSite 설정
5. **권한 검증**: 본인만 수정/삭제 가능

### ⚠️ 추가 고려사항 (향후 개선)

1. **토큰 갱신**: Refresh Token 구현
2. **Rate Limiting**: 로그인 시도 제한
3. **비밀번호 정책**: 복잡도 검증
4. **이메일 인증**: 회원가입 시 이메일 확인
5. **로그인 기록**: 로그인 이력 추적

---

## 테스트

### 테스트 커버리지

- ✅ AuthService: 회원가입, 로그인, 에러 처리
- ✅ AuthController: 엔드포인트 동작
- ✅ UsersService: CRUD 작업
- ✅ UsersController: 권한 검증 포함

**테스트 실행**:
```bash
npm test                    # 모든 테스트
npm test -- auth            # Auth 관련 테스트만
npm test -- users           # Users 관련 테스트만
```

---

## 사용 예시

### 회원가입

```http
POST http://localhost:3008/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "username": "username",
  "name": "User Name"
}
```

### 로그인

```http
POST http://localhost:3008/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

# 응답: 쿠키에 access_token 자동 저장
```

### 보호된 엔드포인트 접근

```http
GET http://localhost:3008/users/me/profile
Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AuthGuard가 자동으로 토큰 검증
# @GetUser()로 사용자 정보 사용 가능
```

---

## 결론

이 아키텍처는 **관심사 분리**, **보안**, **확장성**을 고려하여 설계되었습니다. 인증과 사용자 관리를 분리함으로써 각 모듈의 책임이 명확하고, 순환 참조 문제를 `forwardRef`로 해결하여 모듈 간 의존성을 안전하게 관리합니다.

