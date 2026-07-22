# PRD — 미국주식 자산관리 & 기업정보 웹서비스

> 최종 정리: 2026-07-17 · 상태: **배포 완료 · 운영 중**
> 공개 URL: https://us-stock-dashboard-modu-rich.vercel.app
> 이 문서는 실제 구현된 내용(as-built) 기준입니다. 초기 기획본은 상위 폴더 `PRD_미국주식자산뉴스서비스.md` 참고. 변경 이력은 11장 참고.

---

## 1. 개요

### 문제 정의
미국주식에 투자하는 한국 개인투자자는 두 가지 불편을 겪는다.
1. **자산 현황 파악의 어려움** — 증권사 앱마다 흩어진 잔고를 모아 보기 어렵고, 원화 기준 손익을 볼 때 **주가 등락과 환율 변동이 섞여** 실제 수익의 원인(주식손익 vs 환차손익)을 구분하기 힘들다.
2. **정보 수집의 번거로움** — 관심 종목의 뉴스·공식 공시(SEC)·실적 일정을 확인하려면 **여러 사이트를 각각 돌아다녀야** 한다.

→ 이 서비스는 **흩어진 자산 현황(환차손익 분리 포함)과 관심 종목 소식을 하나의 대시보드로 통합**해 이 문제를 해결한다.

### 서비스 정의
미국주식 투자자가 **자신의 보유 자산(총액·손익·환차손익)을 한눈에 확인**하고,
**관심 기업의 뉴스·공식 공시·실적 일정을 자동으로 모아보는** 공개 웹서비스.

- **주 사용자**: 미국주식을 보유한 한국 개인투자자
- **핵심 가치**: 흩어진 자산 현황 + 관심 종목 소식을 하나의 대시보드로
- **한 줄 정의**: "내 미국주식 포트폴리오 + 관심 종목 소식을 한 곳에서"
- **현황**: Vercel에 공개 배포·운영 중. 자산확인·소식 두 축 MVP + 환차손익·추이 그래프·비밀번호 재설정·입력검증·보안점검까지 완료.
- **브랜딩/디자인**: CKF 로고(파비콘·헤더), 토스풍 테마(라이트/다크 + 시스템 자동 + 토글), Noto Sans KR.

---

## 2. 확정 결정사항

| 항목 | 결정 |
|------|------|
| 사용 대상 | 불특정 다수 (공개 서비스, 회원 인증) |
| 자산 입력 | 수동 입력 (티커·수량·매수단가·매수환율) |
| 시세 | 지연 시세 (약 15분, 무료 API) |
| 정보 소스 | 뉴스(Finnhub + Marketaux 감성분석) + 공식 공시(SEC) + 실적 캘린더 |
| 언어 | 원문 그대로 (영어) — AI 한글요약은 보류(11-25) |
| 표시 통화 | USD / KRW 둘 다 + **환차손익 분리** |
| 추이 기록 | **구현 완료** — 방문 기반 + cron(매일 22:00 UTC) 일별 스냅샷 누적 → SVG 추이 그래프 |
| 디자인 | 토스풍 테마 · 다크 토글(쿠키 기반) · CKF 로고 |
| 기술 스택 | Next.js 16 + Supabase + Vercel (배포 완료) |

---

## 3. 구현 완료 기능 (MVP)

### 3-1. 인증
- 이메일/비밀번호 **회원가입 · 로그인 · 로그아웃** (Supabase Auth, bcrypt 해시)
- **비밀번호 재설정**: `/forgot-password` → 메일 링크 → `/reset-password` (Gmail SMTP + token_hash)
- 이메일 확인 흐름(`/auth/confirm`) — 개발 편의로 현재 OFF, **정식 오픈 전 ON 권장**
- Proxy(구 Middleware)로 세션 갱신 + 보호 경로(`/dashboard`, `/portfolio`) 접근 제어
- 입력 검증: 이메일·비밀번호 서버 검증(`validation.ts`)

### 3-2. 포트폴리오 (자산 관리)
- 보유 종목 **추가 / 수정 / 삭제** (RLS로 본인 데이터만, 서버 액션 인증)
  - 필드: 티커 · 수량 · 평균 매수단가(USD) · 매수 시점 환율
  - **티커 자동완성**: 입력하는 대로 미국 종목(심볼+회사명)을 드롭다운으로 보여주고 골라 넣음. 회사명("apple")으로도 검색. 미국 종목 전체 목록을 서버 메모리에 하루 1회 캐시해 메모리 필터링(~수ms) + 브라우저 쿼리 캐시로 빠르게 응답
  - 각 행 "수정"으로 수량·평균단가·매수환율 일괄 편집
  - 입력 검증(상한·형식) + DB CHECK 제약 이중 방어
- 종목별 **현재가 · 평가금액 · 평가손익 · 수익률** (지연 시세)
- 상단 요약 카드: **총 평가금액(USD/KRW) · 총 평가손익**
- **환차손익 분리 표시**
  - 주식손익 = 수량 × (현재가 − 매수가) × 현재환율
  - 환차손익 = 수량 × 매수가 × (현재환율 − 매수환율)
- 색상: 한국식 (빨강=수익 / 파랑=손실)

### 3-3. 대시보드
- 스탯 카드: **총 자산(USD/KRW) · 전일 대비 등락 · 총 평가손익(환차 포함)**
- **종목 비중 도넛 차트** (순수 SVG, 색맹 안전 팔레트, 9개↑는 "기타"로 묶음)
- **자산 추이 그래프** (SVG 라인) — 방문 기반 + cron 일별 스냅샷 누적, 첫날은 0-기준선 표시. **일/주/월/연 단위 전환**(각 기간말 잔액 집계) + 각 점에 기록 날짜 라벨(자동 솎음·기울임)

### 3-4. 관심 & 소식 피드
- **관심 종목 관리** (추가/삭제) + 보유 종목 자동 포함
- 통합 피드 (원문 그대로, 최신순, 미래 실적 일정 상단):
  - **뉴스**: Finnhub company-news + Marketaux(감성분석 뱃지: 긍정 빨강/부정 파랑, 선택), URL 중복 제거
  - **공시**: SEC EDGAR (8-K, 10-Q, 10-K 등 주요 서식, 실제 문서 링크)
  - **실적**: Finnhub earnings calendar (예정 실적 + EPS 예상)
- 필터 탭: 전체 / 뉴스 / 공시 / 실적
- **소스별 5초 타임아웃**: 느린 소스는 건너뛰고 받은 정보부터 표시

### 3-5. 디자인 · UX
- **토스풍 테마**: 토큰 기반(카드·라운드·그림자), 등락색 한국식. 라이트/다크 + 시스템 자동 + 토글(쿠키)
- **공용 헤더**: 브랜드(CKF 로고) + 네비(활성 탭 강조) + 테마 토글 + 로그인/로그아웃
- **브랜딩**: CKF 로고 파비콘(`icon.png`) + 헤더 로고(`logo.png`), 홈 카드 골드 로고톤 아이콘
- **로딩 표시**: 페이지 전환 스피너(`loading.tsx`) + 폼/버튼 진행 표시

---

## 4. 기술 아키텍처

```
[Next.js 16 (App Router, TS, Tailwind)]  — Vercel 배포 완료 (modu-rich)
        │
        ├─ Supabase Auth        인증 (+ Gmail SMTP 커스텀 메일)
        ├─ Supabase Postgres    데이터 + RLS
        └─ Vercel Cron          일별 자산 스냅샷 배치 (매일 22:00 UTC, service_role)
                 │
                 ├─ Finnhub       시세(/quote) · 뉴스 · 실적 캘린더 · 심볼목록(/stock/symbol, 자동완성)
                 ├─ Marketaux     뉴스 + 감성분석 (선택, 무료 100회/일)
                 ├─ Frankfurter   환율 USD→KRW (키 불필요)
                 └─ SEC EDGAR     공시 (키 불필요, User-Agent 필요)
```

- 시세/뉴스/환율은 **서버 사이드 fetch + revalidate 캐시**(시세 15분, 환율 1시간, 뉴스 30분)로 무료 한도 보호
- 피드 외부 요청은 **소스별 5초 타임아웃**(`AbortSignal.timeout`)으로 느린 소스가 전체를 막지 않게 함
- 계산 로직은 `src/lib/portfolio.ts`(`computePortfolio`)로 공통화
- 테마는 **쿠키 기반 서버 렌더링**(레이아웃이 `theme` 쿠키 읽어 `data-theme` 선렌더) → 깜빡임·하이드레이션 경고 없음
- 배포: GitHub `main` push → Vercel 자동 배포. 환경변수로 키 관리(코드 하드코딩 없음)

### 주요 파일
| 영역 | 경로 |
|------|------|
| Supabase 클라이언트 | `src/lib/supabase/{client,server,admin,proxy}.ts` |
| 세션/보호경로 | `src/proxy.ts` |
| 시세·환율·피드·검증·심볼검색 | `src/lib/{quotes,fx,feed,portfolio,validation,symbols}.ts` |
| 인증 UI | `src/app/{login,forgot-password,reset-password}/`, `src/app/auth/confirm/`, `src/components/AuthForm.tsx` |
| 포트폴리오 | `src/app/portfolio/`, `src/components/{AddHoldingForm,TickerAutocomplete,HoldingsTable,EditableHoldingRow,PortfolioSummary}.tsx` |
| 심볼 검색 API | `src/app/api/symbols/search/route.ts` (자동완성, 인증 필수) |
| 대시보드 | `src/app/dashboard/`, `src/components/{WeightDonut,AssetHistoryChart}.tsx` |
| 피드 | `src/app/feed/`, `src/components/{WatchlistManager,AddWatchForm,FeedList}.tsx` |
| 배치(cron, 구현완료) | `src/app/api/cron/{snapshot,feed}/route.ts`, `vercel.json` |
| 디자인/테마 | `src/app/globals.css`(토큰·다크변형), `src/app/layout.tsx`(쿠키 테마·Noto Sans KR), `src/components/{AppHeader,HeaderNav,ThemeToggle,Card}.tsx` |
| 브랜딩 | `src/app/icon.png`(파비콘), `public/logo.png`(헤더 로고) — CKF 로고 |

> ⚠️ Next.js 16 주의: Middleware → **Proxy**(`src/proxy.ts`, Node.js 런타임)로 명칭 변경됨.

---

## 5. 데이터 모델 (`supabase/schema.sql`)

| 테이블 | 내용 | 비고 |
|--------|------|------|
| `holdings` | 보유 종목 (ticker, quantity, avg_price, **buy_fx_rate**) | RLS: 본인만 |
| `watchlist` | 관심 종목 (user_id, ticker) | RLS: 본인만 |
| `portfolio_snapshots` | 일별 자산 스냅샷 | 배치 미구현(테이블만) |
| `quotes_cache` | 시세 캐시 | 현재 미사용(향후 cron) |
| `feed_items` | 뉴스/공시/실적 캐시 | 현재 미사용(현재는 실시간 fetch) |

- 인증은 Supabase 내장 `auth.users` 사용
- `quotes_cache` / `feed_items` 쓰기는 service_role만 (RLS 쓰기 정책 없음)

---

## 6. 외부 API (검증 완료)

| 용도 | 서비스 | 키 | 무료 한도 |
|------|--------|-----|-----------|
| 시세 | Finnhub `/quote` | 필요 (STOCK_API_KEY) | 60회/분 |
| 뉴스 | Finnhub `/company-news` | 동일 키 | 60회/분 |
| 뉴스(감성분석) | **Marketaux** `/v1/news/all` | 선택 (MARKETAUX_API_KEY) | 100회/일, 요청당 3건 |
| 실적 | Finnhub `/calendar/earnings` | 동일 키 | 무료 확인됨 |
| 환율 | Frankfurter (ECB) | 불필요 | 제한 없음 수준 |
| 공시 | SEC EDGAR | 불필요 (User-Agent) | 공식·무료 |

> 뉴스는 Finnhub + Marketaux를 함께 가져와 **URL 기준 중복 제거**. Marketaux 기사는 **감성점수(긍정=빨강/부정=파랑, ±0.15 이내 중립 숨김)** 뱃지 표시. 두 뉴스 키 모두 없으면 공시(SEC)만 표시.

---

## 7. 화면 구성

1. **홈** (`/`) — 서비스 소개 + 네비게이션 + 로그인
2. **로그인** (`/login`) — 로그인/회원가입 탭
3. **대시보드** (`/dashboard`) — 총자산·전일대비·손익 카드 + 비중 차트
4. **포트폴리오** (`/portfolio`) — 요약 카드 + 종목 추가 폼 + 보유 목록(수정/삭제)
5. **관심 & 소식** (`/feed`) — 관심종목 관리 + 필터 탭 + 통합 피드

---

## 8. 로드맵 (남은 작업)

### 배포
- [ ] **Vercel 배포** + 환경변수 등록
- [ ] Supabase **이메일 확인 재활성화**
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` 설정

### v1.1 (안정화)
- [ ] `quotes_cache` DB 캐싱 + 시세 수집 cron (service_role)
- [ ] `feed_items` 캐싱 (현재 실시간 fetch → 캐시로)
- [ ] 일별 **자산 스냅샷 배치** (`portfolio_snapshots` 채우기)

### v2 (확장)
- [ ] 자산 총액 **과거 추이 그래프** (스냅샷 활용)
- [ ] **AI 한글 요약·번역** (뉴스·공시)
- [ ] 주가 급등락 알림
- [ ] 배당 캘린더, 세금(양도세) 추정

---

## 9. 리스크 & 유의사항

- **면책**: "투자 참고용, 투자자문 아님" 고지 (앱에 표시 중)
- **시세 정확성**: 지연 시세임을 UI에 명시
- **API 한도**: 사용자 증가 시 서버 캐싱→DB캐시+cron으로 전환 필요
- **개인정보**: 로그인 정보만 수집, 증권사 연동 없음 (민감정보 최소화)
- **뉴스 링크**: Finnhub 무료 티어는 원문으로 리다이렉트하는 URL 제공

### 9-1. 보안 점검 (2026-07-17 코드 기준 확인)

| 항목 | 상태 | 근거 |
|------|------|------|
| 비밀값을 코드가 아닌 환경변수로 | ✅ | 하드코딩 0건, 전부 `process.env`. service_role 키는 `NEXT_PUBLIC_` 아님·cron 라우트(서버)에서만 사용. `.env*`/`.vercel` git 제외 |
| 백엔드 입력 검증 | ✅ | `"use server"` 액션이 `validation.ts`로 재검증(티커·수량·단가·환율 상한 포함) + DB CHECK 제약(`quantity>0`, `avg_price>=0`) 이중 방어 |
| Supabase RLS | ✅ | 5개 테이블 모두 RLS 활성. holdings/watchlist/snapshots는 `auth.uid()=user_id`, quotes_cache/feed_items는 읽기만(쓰기 정책 없음 → service_role만) |
| 인가(권한 확인) | ✅ | 모든 액션이 `auth.getUser()` 확인 후 거부, 변경은 `.eq("user_id", user.id)`+RLS 이중. Proxy가 `/dashboard`·`/portfolio` 보호. `getSession` 대신 `getUser()` 사용 |

- **적용된 하드닝**: `cron/feed` 라우트가 `CRON_SECRET` 미설정 시 `Bearer undefined`로 우회되던 문제 수정 → `if (!process.env.CRON_SECRET || ...)` 가드로 전원 차단(snapshot 라우트와 동일). 401 차단 검증 완료.
- **남은 권장**: 배포 전 Supabase "Confirm email" 재활성화, 공유 캐시 테이블 쓰기는 계속 service_role로만.

---

## 10. 로컬 실행

```bash
cd us-stock-dashboard
npm run dev        # http://localhost:3000
```
- `.env.local`에 Supabase 키 + `STOCK_API_KEY` 필요
- `supabase/schema.sql`을 Supabase SQL Editor에서 실행

---

## 11. 작업 이력 (요청 → 진행/결과)

아이디어부터 배포·운영까지 사용자 요청과 진행 내역을 시간순으로 정리한 로그.

### 11-1. 기획
- **요청**: "미국주식 투자자 자산확인 + 뉴스/기업정보 웹서비스"의 PRD를 위해 정할 것을 하나씩 물어봐 줘.
- **진행**: 8가지 핵심 결정을 하나씩 질의응답 → 초기 PRD(`PRD_미국주식자산뉴스서비스.md`) 작성.
  - 공개 서비스 / 수동 입력 / 지연 시세 / 뉴스+공시+실적 / 원문 그대로 / USD·KRW 둘 다 / 추이 단계적 / Next.js+Supabase.

### 11-2. 기술 선택
- **요청**: 어떤 프레임워크가 좋을지 3개 이상 장단점과 함께 추천.
- **진행**: Next.js / SvelteKit / Nuxt / (Python 백엔드) 비교 → **Next.js + Supabase** 추천·확정.

### 11-3. 프로젝트 세팅
- **요청**: Next.js + Supabase 초기 세팅.
- **진행**: `create-next-app`(TS·Tailwind·App Router) + `@supabase/ssr` 설치. 클라이언트 4종(client/server/admin/proxy), 라우트 뼈대, `schema.sql`(RLS) 작성. 빌드·라우트 검증.
- **발견**: 설치된 Next.js가 16.2 → **Middleware가 Proxy로 개명**(`src/proxy.ts`, Node 런타임). 규칙 맞춰 작성.

### 11-4. 포트폴리오 입력/목록
- **요청**: 종목 입력 폼 + 보유 목록 테이블.
- **진행**: Server Actions(추가·삭제, 인증+RLS), 입력 폼(useActionState), 보유 테이블(매수금액·합계). 검증은 빌드/렌더까지, 실동작은 Supabase+로그인 필요.

### 11-5. 로그인 UI
- **요청**: 로그인 UI.
- **진행**: 이메일/비번 로그인·회원가입(탭 전환)·로그아웃, 이메일 확인 콜백(`/auth/confirm`), Proxy 보호 라우트 리다이렉트.

### 11-6. Supabase 설정 (함께 단계별)
- **요청**: 같이 단계별로 진행.
- **진행**: 계정·프로젝트 생성 → API 키 3개 확보 → `.env.local` 입력(service_role는 그때 비워둠) → `schema.sql` 실행 → 개발 편의로 "Confirm email" OFF. 회원가입→로그인→종목추가 실동작 확인.
- **트러블슈팅**: SQL 실행 시 한글 주석의 멀티바이트+줄바꿈이 클립보드에서 깨져 `for select` 문법오류 → 주석을 전부 영어로, drop-if-exists로 재작성해 해결.

### 11-7. 시세 연동
- **요청**: 시세 API 연동부터.
- **진행**: **Finnhub** `/quote`(지연 시세, 현재가+전일종가) 선정. `STOCK_API_KEY` 발급·입력. 포트폴리오 테이블에 현재가·평가금액·평가손익(수익률) 표시(한국식 빨강수익/파랑손실). API 키 유효성 실제 호출로 검증.

### 11-8. 환율 연동
- **요청**: 환율 연동.
- **진행**: **Frankfurter**(키 불필요, ECB) USD→KRW. 상단 요약 카드에 USD/KRW 총액·손익 표시. 계산을 `computePortfolio`로 공통화.

### 11-9. 대시보드
- **요청**: 대시보드.
- **진행**: 총자산(USD/KRW)·전일 대비 등락(전일종가 활용)·종목 비중 **도넛 차트**(순수 SVG, dataviz 스킬의 검증된 팔레트). 미리보기 라우트로 시각 검증 후 삭제.

### 11-10. 뉴스·공시·실적 피드
- **요청**: 뉴스/공시/실적 피드.
- **진행**: 뉴스(Finnhub company-news) + 공시(SEC EDGAR, 티커→CIK, 8-K/10-Q 등, URL HTTP 200 검증) + 실적(Finnhub earnings calendar). 관심종목(watchlist) CRUD, 필터 탭. 원문(영어) 그대로. 미리보기로 22건 렌더 검증.

### 11-11. 환차손익
- **요청**: 환차손익 구현.
- **진행**: `holdings.buy_fx_rate`(매수 시점 환율) 컬럼 추가. 주식손익=수량×(현재가−매수가)×현재환율, 환차손익=수량×매수가×(현재환율−매수환율)로 분해. 요약카드·대시보드에 표시. 종목 추가 시 선택 입력(비우면 현재 환율).

### 11-12. 종목 수정
- **요청**: 기존 종목의 수량·평균단가(및 매수환율)도 수정 가능하게.
- **진행**: 행 단위 "수정" 토글(EditableHoldingRow) + `updateHolding`으로 통합. 매수환율 전용 편집(BuyFxCell)은 여기에 흡수·정리.

### 11-13. 최종 PRD 정리
- **요청**: 작업 전부 반영한 PRD 정리.
- **진행**: 실제 구현 기준 `PRD.md`(이 문서) 작성. 두 PRD 차이(기획본 vs as-built) 설명.

### 11-14. 보안/설정 점검
- **요청**: API 키·DB 정보를 코드가 아닌 환경변수로, `.env`는 git 제외. 비밀번호 해시 여부 확인.
- **진행**: 코드에 하드코딩 없음(전부 `process.env`), `.gitignore`가 `.env*` 차단, git 추적 `.env` 0개 확인. 비밀번호는 Supabase Auth가 bcrypt 해시로 저장(우리 코드는 원문 미접근) 설명.

### 11-15. 입력 검증
- **요청**: 사용자 입력 검증.
- **진행**: `src/lib/validation.ts` 공용 검증기(티커·수량·단가·환율·이메일·비번, 상한값·트림·정규화). 조용히 실패하던 종목수정·관심종목추가를 useActionState로 바꿔 오류 메시지 표시. 20개 케이스 실제 테스트.

### 11-16. Vercel 배포
- **요청**: Vercel 배포 진행.
- **진행**: 프로덕션 빌드 검증 → GitHub **비공개** repo 생성·push(gh CLI) → Vercel 연결 → 환경변수 입력 → 배포. cron 스텁은 배포 오류 방지로 vercel.json 제거(후에 재추가).
- **트러블슈팅**: 배포 보호(로그인 잠금) 해제, 깨끗한 `us-stock-dashboard.vercel.app`은 선점되어 스코프 접미사 붙음.

### 11-17. 비밀번호 재설정
- **요청**: 방문자 비밀번호 찾기(아이디 찾기는 이메일=아이디라 미구현).
- **진행**: `/forgot-password`(resetPasswordForEmail) + `/reset-password`(재설정) + 로그인 링크.
- **트러블슈팅**: 기본 메일 발송 제한 → **Gmail SMTP** 커스텀 연결(앱 비밀번호). SMTP 붙이니 템플릿 편집 잠금 해제 → Reset Password 템플릿을 `token_hash` 방식으로 수정 → 안정 작동.

### 11-18. 자산 추이 그래프 + 자동 기록(cron)
- **요청**: 자산 추이 그래프 만들기 + cron 자동 기록 + 첫날부터 0-기준선으로 즉시 표시.
- **진행**: 방문 시 오늘 자산 스냅샷 upsert(RLS insert/update 정책 추가) + SVG 추이 그래프. 1점만 있으면 0에서 시작하는 선 표시. 이후 `/api/cron/snapshot` 배치 구현(service_role) + `vercel.json` 매일 22:00 UTC 크론, 수동 호출로 recorded:1 검증.

### 11-19. UX 개선
- **요청**: 로딩 표시 / 홈에서 로그인 상태 표시 / 반복된 주소 정리.
- **진행**: 페이지 이동 스피너(loading.tsx) + 삭제·제거 버튼 진행표시(SubmitButton). 홈에 로그인 시 이메일+로그아웃 표시. Vercel 팀 슬러그를 `modu-rich`로 변경해 주소 정리 → Supabase Site URL/Redirect URLs 갱신.

### 11-20. 뉴스 소스 추가 (Marketaux)
- **요청**: 소식 가져올 다른 API 검토 → Tiingo 시도 → 무료 대안 Marketaux로 확정.
- **진행**: 처음 Tiingo를 붙였으나 계정에 News API 권한 없음(403 확인) → 무료 티어에서 실제 뉴스가 나오는 **Marketaux**로 교체. `getMarketauxNews`(선택 키 `MARKETAUX_API_KEY`, 종목당 3건, 30분 캐시), `FeedItem.sentiment` 필드 + FeedList **감성 뱃지**(긍정 빨강/부정 파랑, ±0.15 중립 숨김). Finnhub와 URL 중복 제거. 실제 키로 HTTP 200·응답 구조 일치 검증.
- **주의**: 무료 100회/일, 요청당 3건. 프로덕션은 Vercel 환경변수에 `MARKETAUX_API_KEY` 추가 필요.

### 11-21. GUI 디자인 (토스 스타일 테마)
- **요청**: GUI를 자산관리 테마로 꾸미기 → 토스 스타일(밝고 깔끔) + 시스템 자동 감지 + 다크 토글로 확정.
- **진행**:
  - **테마 토큰 시스템**(`globals.css`): 토스풍 팔레트(배경 `#F2F4F6`·카드 흰색·포인트 블루 `#3182F6`·라운드 16px·부드러운 그림자), 라이트/다크 양쪽 CSS 변수. 등락색은 한국식 유지(상승 `#F04452`/하락 `#3182F6`). 유틸 노출: `bg-surface`·`text-fg`·`text-muted`·`border-line`·`text-up`·`text-down` 등.
  - **다크 모드**: **쿠키 기반 서버 렌더링**(루트 레이아웃이 `theme` 쿠키를 읽어 `data-theme` 선렌더) → 로드 깜빡임·하이드레이션 경고 없음. 쿠키 없으면 CSS 미디어쿼리로 시스템 자동. `ThemeToggle`(클릭 시 `data-theme`+쿠키 1년 저장). Tailwind `dark:` 변형도 속성/미디어 양쪽 대응.
  - **폰트**: Noto Sans KR(한국어), 메타데이터·타이틀 "모두리치".
  - **공용 헤더**(`AppHeader`+`HeaderNav`+`ThemeToggle`): 브랜드(₩ 모두리치)+네비(활성 탭 강조)+토글+로그인/로그아웃, sticky+블러. 페이지마다 있던 `← 홈`·이메일·로그아웃 줄을 헤더로 일원화.
  - **전 페이지 리디자인**: 홈(히어로+아이콘 네비 카드), 대시보드(스탯카드·도넛·추이), 포트폴리오(요약·입력폼·표·행편집), 관심&소식(관심목록·피드+감성뱃지), 로그인·비밀번호(카드형 중앙정렬). 공용 `Card` 컴포넌트.
- **검증**: 미리보기(목데이터)로 라이트/다크 양쪽 색·카드·표·뱃지 확인, 콘솔 에러 0, 프로덕션 빌드 성공.

### 11-22. 보안 점검 & 하드닝
- **요청**: 4대 보안 체크(비밀값 환경변수화 / 백엔드 검증 / RLS / 인가) 확인.
- **진행**: 코드로 4항목 모두 충족 확인(→ 9-1 표). 발견한 소소한 취약점 1건 수정 — `cron/feed`가 `CRON_SECRET` 미설정 시 `Bearer undefined`로 우회 가능하던 것을 snapshot 라우트와 동일한 `!process.env.CRON_SECRET` 가드로 차단. 401 응답 검증 완료.

### 11-23. 브랜딩 (로고 · 파비콘)
- **요청**: 탭 아이콘(파비콘) 변경 → 처음엔 ₩ 파란 사각형 SVG로 만들었다가, 사용자 제공 **CKF 로고**(네이비+골드, 지구본·회로·상승 화살표)로 교체.
- **진행**: `src/app/icon.png`(512×512, App Router 파일 컨벤션 → 자동 파비콘)로 적용. 헤더 브랜드 마크의 ₩ 사각형도 동일 로고(`public/logo.png`)로 교체([AppHeader](src/components/AppHeader.tsx)) → 탭·헤더 로고 통일. `format.ts`의 ₩는 원화 통화기호라 유지. 로드 200·콘솔 에러 0 검증.
- **홈 아이콘/버튼 정리**: 결국 같은 로그인으로 가던 "둘러보기" 버튼 제거(시작하기만 유지). 홈 카드 아이콘을 이모지 → **고해상도 SVG 라인 아이콘**(차트·서류가방·신문)으로 교체하고, 후보 비교(라인/솔리드/골드) 후 **로고 톤(연한 골드 배경 #f7efd2 + 네이비 아이콘 #1e3a5f)**으로 확정.

### 11-24. 피드 로딩 개선 (소스별 타임아웃)
- **요청**: 관심&소식 로딩이 5초 넘어가면 가능한 정보부터 보여주기.
- **진행**: 뉴스(Finnhub·Marketaux)·공시(SEC)·실적(Finnhub) 각 외부 요청에 `AbortSignal.timeout(5000)` 적용 → 5초 안에 응답 못 한 소스는 취소·건너뛰고, `getFeed`가 받은 소스들만으로 반환. 한 소스가 느려도 전체가 멈추지 않고 최대 ~5초 내 "가능한 정보부터" 표시. 로딩 중엔 기존 loading.tsx 스피너.
- **참고**: Suspense 스트리밍(뼈대 먼저)도 시도했으나 프리뷰 환경에서 reveal이 완료되지 않아(검증 불가) 제외. 실배포 확인 후 재적용 여지 있음.

### 11-26. 자산 추이 그래프 — 날짜 라벨 + 기간 단위 전환
- **요청**: (1) X축 각 점에 기록 날짜 표시 → (2) 일/주/월/연 단위로 전환하며 보기.
- **진행**: `AssetHistoryChart`를 클라이언트 컴포넌트로 전환(`useState`).
  - **X축 날짜 라벨**: 각 점 아래 눈금+날짜(-45° 기울임). 라벨이 많으면 양 끝 포함 균등 간격으로 자동 솎음(최소 34px), `overflow=visible`로 첫 라벨 잘림 방지.
  - **기간 단위 전환**: 세그먼트 버튼(일별/주별/월별/연도별). 주/월/연은 각 기간의 **마지막(기간말) 잔액**으로 집계(Map last-wins, 오름차순 입력). 라벨 표기 일·주=`M/D`, 월=`YY.M`, 연=`YYYY`. 타임존 영향 없이 UTC 기준 버킷. 점이 2개 미만이 되는 단위는 버튼 자동 비활성.
- **검증**: 로컬 임시 라우트(2024-12~2026-07, 60점)로 4단위 전환·집계·라벨 형식·겹침·영역이탈·콘솔에러 확인 후 라우트 삭제.

### 11-27. 티커 자동완성 (심볼 검색)
- **요청**: 포트폴리오 종목 추가 시 티커를 올바르게 입력하도록 돕는 기능 → 자동완성(심볼 검색)으로 결정.
- **진행**: `src/lib/symbols.ts`(Finnhub 심볼 검색) + 인증 라우트 `src/app/api/symbols/search/route.ts` + 클라이언트 콤보박스 `TickerAutocomplete`(디바운스·키보드/마우스·대문자정규화·a11y·graceful). `AddHoldingForm`의 티커 입력을 교체(성공 시 리마운트 초기화). 회사명으로도 검색됨. 서버측 `parseTicker` 백스톱 유지.
- **성능 개선**: 처음엔 Finnhub `/search`를 쿼리마다 호출 → 캐시 미스 시 260~700ms로 느림(측정). **미국 종목 전체 목록(/stock/symbol, ~3만개)을 서버 메모리에 하루 1회 캐시하고 메모리에서 필터링**하는 방식으로 전환 → 검색 3~7ms. 페이지 로드 시 목록 프리워밍(`?warm=1`) + 브라우저 쿼리 캐시 + 디바운스 180ms. 회사명 우선·정식주식 우선·짧은 이름 우선 랭킹으로 실제 회사가 최상위(tesla→TSLA, apple→AAPL, microsoft→MSFT 등).
- **검증**: 로컬 임시 라우트로 Finnhub 연동·속도(3~7ms)·캐시 히트(재입력 시 네트워크 0)·랭킹·키보드/마우스/Escape/결과없음·인증 401 확인 후 임시 파일 삭제. DB·환경변수 변경 없음(기존 `STOCK_API_KEY` 재사용).

### 11-25. 진행 중 / 보류
- **AI 한글 요약**(뉴스 원문 요약): 착수했으나 진행 중 보류. Claude API(사용량 과금, Haiku 후보) + 캐싱·지연호출 설계까지 논의.

---

### 최종 배포 정보
- **공개 URL**: https://us-stock-dashboard-modu-rich.vercel.app
- **저장소**: github.com/cjwmanelf/us-stock-dashboard (비공개), `main` push 시 Vercel 자동 배포
- **외부 연동**: Supabase(인증·DB), Finnhub(시세·뉴스·실적), Frankfurter(환율), SEC EDGAR(공시), Gmail SMTP(메일)
