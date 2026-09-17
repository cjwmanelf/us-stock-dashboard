@AGENTS.md

# 프로젝트 컨텍스트 (새 대화 이어가기용 · 압축본)

> 상세 스펙·변경이력은 `PRD.md` 참고. 이 문서는 요점·주의사항·포인터만 담은 토큰 절약용 프라이머다.

## 한 줄 요약
미국주식 투자자용 공개 웹서비스 — 내 자산(총액·손익·환차손익) 확인 + 관심 종목 뉴스/공시/실적. **배포·운영 중.**

## 스택 / 배포
- Next.js 16(App Router, TS, Tailwind v4) + Supabase(Auth·Postgres·RLS) + Vercel.
- 공개 URL: https://us-stock-dashboard-modu-rich.vercel.app
- repo: github.com/cjwmanelf/us-stock-dashboard (**비공개**), `main` push → Vercel 자동 배포(~30초). gh CLI 로그인됨(cjwmanelf).
- 로컬: `npm run dev` (localhost:3000). 배포 확인: `npx vercel ls`.

## ⚠️ 필수 주의사항 (재실수 방지)
1. **Next.js 16 = Middleware가 Proxy로 개명** — `src/proxy.ts`, 함수 `proxy`, Node 런타임. 코드 작성 전 `node_modules/next/dist/docs/` 확인(AGENTS.md).
2. **비밀값은 코드 금지, 환경변수만.** `.env*`·`.vercel`는 git 제외 확인됨. 프로덕션 키는 Vercel 환경변수.
3. **이 PC는 install/시스템 변경 전 "샌드박스 해제해서 진행할까?" 물어볼 것.**
4. **등락 색상 한국식**: 빨강=상승/수익(`text-up`), 파랑=하락/손실(`text-down`).
5. **미리보기 검증**: 이 환경은 스크린샷 타임아웃 + Suspense 스트리밍 reveal 미완료. `read_page`/`get_page_text`/`javascript_tool`로 검증. 임시 라우트는 `zXXX` 이름(언더스코어 X — private 폴더라 404), 확인 후 삭제.
6. 프로젝트가 OneDrive 동기화 폴더 안에 있음(바탕 화면). `.env.local`이 개인 OneDrive에 동기화됨(공개 아님).

## 코드 지도
- 페이지: `src/app/{page(홈),dashboard,portfolio,feed,login,forgot-password,reset-password}/`
- 서버액션: `src/app/{portfolio,feed,login}/actions.ts` (모두 `getUser()` 인증 + RLS + `.eq(user_id)`)
- 로직: `src/lib/{quotes(Finnhub),fx(Frankfurter),feed,portfolio(computePortfolio),validation,types}.ts`
- Supabase 클라: `src/lib/supabase/{client,server,admin,proxy}.ts`
- 컴포넌트: `AppHeader,HeaderNav,ThemeToggle,Card,AddHoldingForm,HoldingsTable,EditableHoldingRow,PortfolioSummary,WeightDonut,AssetHistoryChart,WatchlistManager,AddWatchForm,FeedList,SubmitButton,Spinner,SignOutButton`
- DB: `supabase/schema.sql`(RLS, 라이브에 이미 적용). cron: `src/app/api/cron/{snapshot,feed}/route.ts` + `vercel.json`(22:00 UTC).
- 테마: `globals.css`(토큰 + `data-theme` 다크변형), `layout.tsx`(쿠키 기반 테마 + Noto Sans KR).
- 브랜딩: `src/app/icon.png`(파비콘=CKF 로고), `public/logo.png`(헤더).

## 환경변수 (`.env.local` / Vercel)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`(cron), `STOCK_API_KEY`(Finnhub), `MARKETAUX_API_KEY`(뉴스감성, 선택), `SEC_USER_AGENT`, `CRON_SECRET`. Supabase 메일=Gmail SMTP.

## 작업 단위별 현황 (전부 완료)
1. 기획(8결정 인터뷰) → 스캐폴딩(Next16 Proxy)
2. 인증(회원/로그인/로그아웃) + 포트폴리오 CRUD(추가/수정/삭제)
3. 시세 Finnhub(/quote, 15분 캐시) + 환율 Frankfurter(USD→KRW)
4. 대시보드: 스탯카드 + 도넛(SVG) + 자산추이 그래프(방문+cron 스냅샷 누적)
5. 피드: 뉴스(Finnhub+**Marketaux 감성뱃지**, URL중복제거) + 공시(SEC EDGAR) + 실적(Finnhub). **소스별 5초 타임아웃**(AbortSignal)
6. 환차손익 분리(주식손익/환차손익, buy_fx_rate)
7. 입력검증(validation.ts) — 서버측 + DB CHECK 이중
8. Vercel 배포(팀슬러그 modu-rich, 배포보호 해제)
9. 비밀번호 재설정(Gmail SMTP + token_hash)
10. 디자인: 토스풍 테마 + 다크토글(쿠키·시스템자동) + 공용헤더 + CKF 로고 + 홈 골드 아이콘. "둘러보기" 버튼 제거
11. 보안점검(4항목 통과) + cron/feed 인증 가드 강화. DB는 전부 파라미터화(ORM/쿼리빌더), 비번 bcrypt(Supabase)
12. 보호 라우트 일관화: Proxy(`src/lib/supabase/proxy.ts`)에 `/feed` 추가해 비로그인 접근 시 `/login` 리다이렉트 통일

## 백로그 / 보류
- **뉴스 AI 한글 요약** (보류): Claude API(claude-opus-4-8 기본, Haiku 후보) + 지연호출·DB캐싱 설계 논의됨. 유료 `ANTHROPIC_API_KEY` 필요. 재개 시 사용자 확인 후.
- 정식 오픈 전: Supabase "Confirm email" 다시 ON.
- 개선 여지: quotes_cache/feed_items DB캐싱 + 수집 cron, 커스텀 도메인.

## 작업 방식 (사용자 선호)
- 변경 후 대개 "PRD 정리 + 커밋 & 배포"를 원함. 커밋 메시지 한국어 OK, 끝에 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- 미리보기로 실제 동작/색상 검증 후 보고. 임시 검증 파일은 삭제.
