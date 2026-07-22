# 모두리치 · 미국주식 자산 대시보드

미국주식 투자자용 공개 웹서비스 — 내 자산 현황(총액·손익·**환차손익**)을 한눈에 보고, 관심·보유 종목의 뉴스·공시·실적을 한 곳에 모아 봅니다.

🔗 **서비스**: https://us-stock-dashboard-modu-rich.vercel.app/
📄 상세 스펙·변경이력은 `PRD.md` 참고.

> **상태: 배포·운영 중** (아래 기능 전부 구현 완료)

## 스택

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Supabase** (Auth · Postgres · RLS · service_role 배치)
- **Vercel** 배포 + Vercel Cron
- **외부 API**: Finnhub(시세·뉴스·실적·심볼검색) · Frankfurter(환율) · SEC EDGAR(공시) · Marketaux(뉴스 감성분석, 선택)

> ⚠️ Next.js 16 주의: Middleware 는 **Proxy**(`src/proxy.ts`)로 이름이 바뀌었고 Node.js 런타임에서 동작합니다.
> 코드를 크게 바꾸기 전에는 `node_modules/next/dist/docs/` 의 최신 문서를 확인하세요.

## 주요 기능

- **인증**: 이메일/비밀번호 회원가입·로그인·로그아웃(Supabase Auth) + 비밀번호 재설정(Gmail SMTP)
- **포트폴리오**: 보유 종목 추가/수정/삭제(RLS로 본인 데이터만)
  - 티커·수량·평균 매수단가·매수환율 입력, **티커 자동완성**(미국 종목 심볼·회사명 검색, 존재하지 않는 티커 차단)
  - 종목별 현재가·평가금액·평가손익·수익률(지연 시세)
  - **환차손익 분리 표시**(주식손익 / 환차손익)
- **대시보드**: 총자산·전일대비·손익 스탯 카드 + 종목 비중 도넛(SVG) + **자산 추이 그래프**(일/주/월/연 단위 전환, cron 일별 스냅샷 누적)
- **관심 & 소식 피드**: 관심 종목 관리 + 보유 종목 자동 포함
  - 뉴스(Finnhub + Marketaux 감성뱃지) · 공시(SEC EDGAR 8-K/10-Q/10-K 등) · 실적(예정 실적 + **발표된 분기 실적** EPS·서프라이즈)
  - 필터 탭(전체/뉴스/공시/실적), 소스별 5초 타임아웃
- **디자인**: 토스풍 테마, 다크 모드(쿠키 기반 + 시스템 자동 + 토글), CKF 로고, 한국식 등락색(빨강=상승/파랑=하락)

## 폴더 구조

```
src/
  proxy.ts                       # (구 middleware) Supabase 세션 갱신 + 보호경로
  lib/
    types.ts                     # 도메인 타입 (schema.sql 대응)
    quotes.ts                    # 시세 (Finnhub /quote, 15분 캐시)
    fx.ts                        # 환율 (Frankfurter USD→KRW)
    feed.ts                      # 뉴스·공시·실적 피드
    portfolio.ts                 # 평가손익·환차손익 계산 (computePortfolio)
    validation.ts                # 입력 검증 (서버 액션 공용)
    symbols.ts                   # 티커 자동완성·존재확인 (Finnhub 심볼목록 메모리 캐시)
    supabase/{client,server,admin,proxy}.ts
  app/
    page.tsx                     # 홈
    login/ forgot-password/ reset-password/ auth/confirm/   # 인증
    dashboard/page.tsx           # 스탯카드·도넛·자산추이
    portfolio/{page,actions}.ts  # 보유 종목 CRUD
    feed/{page,actions}.ts       # 소식 피드 + 관심종목
    api/
      symbols/search/route.ts    # 티커 자동완성 검색 (인증 필수)
      cron/snapshot/route.ts     # 일별 자산 스냅샷 배치
      cron/feed/route.ts         # 피드 수집 배치 (stub)
  components/                    # AppHeader, HeaderNav, ThemeToggle, Card,
                                 # AddHoldingForm, TickerAutocomplete, HoldingsTable,
                                 # EditableHoldingRow, PortfolioSummary, WeightDonut,
                                 # AssetHistoryChart, WatchlistManager, AddWatchForm,
                                 # FeedList, SubmitButton, Spinner, SignOutButton
supabase/schema.sql              # DB 스키마 + RLS 정책
vercel.json                      # Cron 스케줄 (매일 22:00 UTC)
```

## 세팅 순서

1. **환경변수**: `.env.example` → `.env.local` 복사 후 값 채우기
2. **Supabase 프로젝트** 생성 → Settings > API 에서 URL / anon / service_role 키 복사
3. **DB 스키마**: Supabase SQL Editor 에 `supabase/schema.sql` 붙여넣고 실행
4. **인증**: Supabase Auth 에서 이메일 로그인 활성화 (커스텀 메일은 Gmail SMTP 연결)
5. 개발 서버 실행:

```bash
npm run dev
```
→ http://localhost:3000

### 환경변수

| 변수 | 용도 | 필수 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | cron 배치용 (RLS 우회) | ✅ |
| `STOCK_API_KEY` | Finnhub (시세·뉴스·실적·심볼검색) | ✅ |
| `SEC_USER_AGENT` | SEC EDGAR 요청 User-Agent | ✅ |
| `CRON_SECRET` | Vercel Cron 인증 | ✅ |
| `MARKETAUX_API_KEY` | 뉴스 감성분석 | 선택 |

## 배포

- GitHub `main` 에 push → **Vercel 자동 배포**.
- 비밀값은 코드에 하드코딩하지 않고 Vercel 환경변수로 관리.

## 참고

- 투자 참고용이며 투자자문이 아님(지연 시세 약 15분).
- 무료 API 한도 보호를 위해 시세·뉴스·환율은 서버에서 캐싱(사용자 직접 호출 금지).
