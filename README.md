# 미국주식 자산 대시보드

미국주식 투자자용 공개 웹서비스 — 내 자산 현황(총액·변동) + 관심 종목 뉴스/공시/실적 일정.
PRD: 상위 폴더의 `PRD.md` 참고.

웹서비스 링크: https://us-stock-dashboard-modu-rich.vercel.app/

## 스택

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **Supabase** (Auth · Postgres · service_role 배치)
- **Vercel** 배포 + Vercel Cron

> ⚠️ Next.js 16 주의: Middleware 는 **Proxy**(`src/proxy.ts`)로 이름이 바뀌었고 Node.js 런타임에서 동작합니다.
> 코드를 크게 바꾸기 전에는 `node_modules/next/dist/docs/` 의 최신 문서를 확인하세요.

## 폴더 구조

```
src/
  proxy.ts                     # (구 middleware) Supabase 세션 갱신
  lib/
    types.ts                   # 도메인 타입 (schema.sql 대응)
    supabase/
      client.ts                # 브라우저 클라이언트 (anon)
      server.ts                # 서버 컴포넌트/액션 클라이언트 (anon + 쿠키)
      admin.ts                 # service_role 클라이언트 (cron 전용, RLS 우회)
      proxy.ts                 # 세션 갱신 헬퍼
  app/
    page.tsx                   # 홈 (네비게이션)
    dashboard/page.tsx         # 총 자산·비중 차트
    portfolio/page.tsx         # 보유 종목 입력·평가손익
    feed/page.tsx              # 뉴스·공시·실적 피드
    api/cron/
      snapshot/route.ts        # 일별 자산 스냅샷 배치
      feed/route.ts            # 뉴스/공시/실적 수집 배치
supabase/
  schema.sql                   # DB 스키마 + RLS 정책
vercel.json                    # Cron 스케줄
```

## 세팅 순서

1. **환경변수**: `.env.example` → `.env.local` 복사 후 값 채우기
2. **Supabase 프로젝트** 생성 → Settings > API 에서 URL / anon / service_role 키 복사
3. **DB 스키마**: Supabase SQL Editor 에 `supabase/schema.sql` 붙여넣고 실행
4. **인증**: Supabase Auth 에서 이메일/소셜 로그인 활성화
5. 개발 서버 실행:

```bash
npm run dev
```
→ http://localhost:3000


## 남은 개발 (MVP)

- [ ] 로그인/회원가입 UI (Supabase Auth)
- [ ] 포트폴리오: 종목 추가 폼(Server Action) + 보유 목록 테이블
- [ ] 시세 연동: `quotes_cache` 갱신 로직 + 외부 시세 API 선정
- [ ] 환율(USD→KRW) 연동
- [ ] 대시보드: 총액 계산 + 비중 파이차트
- [ ] 피드: watchlist + EDGAR/뉴스/실적 수집(`api/cron/feed`) 구현
- [ ] 스냅샷 배치(`api/cron/snapshot`) 구현
- [ ] 외부 API 무료 티어 실제 검증

## 참고

- 투자 참고용이며 투자자문이 아님을 UI에 고지할 것
- 무료 API 한도 보호를 위해 시세·뉴스는 서버에서 캐싱(사용자 직접 호출 금지)
