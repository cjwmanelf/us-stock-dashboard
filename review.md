# AIFFEL Campus Code Peer Review Templete 1
- 코더 : 최종우
- 리뷰어 : 이인석 + Claude

- **검토일**: 2026-07-20
- **검토 대상 커밋**: `3a85a22` (docs: PRD 1-4장 현재 배포 상태로 최신화)
- **검토 방법**: 소스 전체 정독(인증/서버 액션/API 라우트/DB 스키마) + `npm install`·`tsc --noEmit`·`next build` 실행 + 실제 배포된 프로덕션 사이트(https://us-stock-dashboard-modu-rich.vercel.app) 접속 확인
- **범위 밖**: 실제 로그인이 필요한 화면(대시보드 수치 표시, 종목 추가/수정, 관심종목 피드 렌더링)은 계정 생성·비밀번호 입력을 대신 수행하지 않는다는 원칙에 따라 로그인 상태에서의 화면은 직접 조작해 확인하지 못했습니다. 이 부분은 실제 계정으로 한 번 더 훑어보시길 권장합니다.

## 총평

PRD(`PRD.md`)에 적힌 "구현 완료" 항목과 실제 코드가 대체로 일치하고, 보안 항목(환경변수화·RLS·인가·입력검증)도 코드로 확인됩니다. 심각한 취약점은 발견하지 못했습니다. 아래는 등급(치명/중간/경미)별 발견 사항과 실제로 동작을 확인한 결과입니다.

---

## 1) 보안 점검

### ✅ PRD가 주장하는 4대 보안 항목 — 코드로 확인됨

| 항목 | 확인 내용 |
|---|---|
| 비밀값 환경변수화 | 하드코딩된 키 없음. `grep`으로 전체 스캔해도 `process.env.*` 외 리터럴 토큰 없음. `.gitignore`가 `.env*`를 두 번(중복) 차단하고 있고 git 이력에도 `.env` 계열 파일 없음 |
| 서버 검증 | `"use server"` 액션(`src/app/portfolio/actions.ts`, `src/app/feed/actions.ts`, `src/app/login/actions.ts`) 모두 `src/lib/validation.ts`로 재검증 후 DB 접근. `holdings` 테이블도 `quantity>0`, `avg_price>=0` CHECK 제약 이중 방어([schema.sql:24-25](supabase/schema.sql#L24-L25)) |
| Supabase RLS | 5개 테이블 모두 `enable row level security` + 정책 존재. `quotes_cache`/`feed_items`는 SELECT 정책만 있고 쓰기 정책이 없어 anon/authenticated 모두 쓰기 불가 → service_role(cron)만 가능, 의도한 설계와 일치 |
| 인가 확인 | 모든 서버 액션이 `supabase.auth.getUser()`로 세션을 서버에서 재검증(`getSession()` 아님 — 쿠키 위조에 취약한 패턴을 피함). `updateHolding`/`deleteHolding`은 `.eq("id", id).eq("user_id", user.id)` + RLS로 이중 스코프 |

### ✅ 실제 배포 사이트에서 재현 검증

- `/api/cron/snapshot`을 인증 헤더 없이 호출 → `{"error":"Unauthorized"}` (401) 확인. `route.ts` 코드의 `if (!process.env.CRON_SECRET || auth !== ...)` 가드([snapshot/route.ts:12-15](src/app/api/cron/snapshot/route.ts#L12-L15), [feed/route.ts:10-13](src/app/api/cron/feed/route.ts#L10-L13))가 실제로 살아있음을 배포본에서 확인 — PRD 11-22에서 언급한 "`CRON_SECRET` 미설정 시 `Bearer undefined`로 우회되던 문제"가 실제로 막혀 있습니다.
- 비로그인 상태로 `/dashboard`, `/portfolio` 접근 → `/login`으로 정상 리다이렉트 확인(`src/proxy.ts`).
- 클라이언트로 내려오는 네트워크 요청을 확인한 결과 Finnhub/Marketaux/SEC API 키가 브라우저로 노출되지 않음(모두 서버 사이드 fetch).
- `FeedList`의 외부 링크는 `target="_blank" rel="noopener noreferrer"`를 사용해 tabnabbing을 방지([FeedList.tsx:78-82](src/components/FeedList.tsx#L78-L82)). `dangerouslySetInnerHTML`/`eval` 등 XSS 위험 패턴은 프로젝트 전체에서 0건.

### ⚠️ 경미 — 개선 권장 (치명적이지 않음)

1. **`/feed` 페이지는 Proxy 레벨 보호 대상이 아님** — `src/proxy.ts`의 `protectedPaths`는 `["/dashboard", "/portfolio"]`뿐이고 `/feed`는 빠져 있습니다([proxy.ts:36](src/proxy.ts#L36)). 실제로는 `feed/page.tsx` 내부에서 `getUser()` 체크 후 데이터 조회 자체를 막고 있어 **데이터 유출은 없습니다**(배포 사이트에서 `/feed`를 비로그인으로 열면 리다이렉트 대신 "로그인이 필요합니다" 텍스트만 표시되는 것으로 확인). 다만 세 보호 페이지의 동작 방식이 다른 것은 보안 구멍이라기보다 **일관성 문제**이니, `protectedPaths`에 `/feed`도 추가해 나머지 두 페이지와 동일하게 리다이렉트하는 걸 권장합니다.
2. **비밀번호 최소 길이 6자** (`src/lib/validation.ts:93`) — 공개 서비스치고 다소 낮습니다. Supabase Auth 기본값이긴 하나, 8자 이상 + 복잡도 권장 문구 정도는 추가할 만합니다.
3. **이메일 확인(Confirm email) 기능이 운영 환경에서도 OFF 상태로 보임** — PRD 3-1, 8, 9-1에 "개발 편의로 현재 OFF, 정식 오픈 전 ON 권장"이라고 이미 스스로 인지하고 있는 항목입니다. 공개 서비스로 실사용자를 받는다면 타인 이메일로 가입해 알림을 도용하는 등의 오남용이 가능하므로, 실제 운영 전환 시 최우선으로 처리하시길 권장합니다(이미 로드맵에 있으므로 새로운 지적이라기보단 리마인더).
4. **서버 액션에 요청 빈도 제한(rate limit) 없음** — `addHolding`/`addWatch`/`updateHolding` 등은 인증된 사용자면 횟수 제한 없이 반복 호출 가능합니다. RLS로 본인 데이터만 건드릴 수 있어 타인 피해는 없지만, 한 계정이 대량의 행을 삽입해 DB 용량을 소모하거나 Finnhub/Marketaux 무료 API 한도를 빠르게 소진시킬 수 있습니다. 지금 규모에서는 급하지 않지만 사용자가 늘면 Vercel/Supabase 레벨의 rate limit을 고려하세요.
5. **SEC EDGAR `User-Agent` 기본값이 `example@example.com`** ([feed.ts:31](src/lib/feed.ts#L31)) — `SEC_USER_AGENT` 환경변수가 없으면 이 더미 값으로 요청을 보냅니다. 보안 이슈는 아니지만 SEC의 Fair Access 정책은 실제 연락 가능한 값을 요구하므로, 운영 환경에는 반드시 실제 값을 설정해두었는지 확인이 필요합니다.

**결론**: 제출물이 자체적으로 밝힌 보안 점검 내용은 실제 코드·배포본과 일치하며, 검토 중 새로 발견된 항목 중 치명적이거나 익스플로잇 가능한 취약점은 없었습니다. 위 5가지는 모두 "더 단단하게 만들면 좋은" 수준의 하드닝 권장 사항입니다.

---

## 2) 백엔드 동작이 의도(PRD)와 일치하는지

### ✅ 일치하는 부분

- 포트폴리오 손익 계산식이 PRD 3-2에 적힌 공식과 정확히 일치합니다. `computePortfolio()`([portfolio.ts:92-104](src/lib/portfolio.ts#L92-L104))의 `stockGainKrw = quantity × (price − avg_price) × fxRate`, `fxGainKrw = quantity × avg_price × (fxRate − buy_fx_rate)` 계산이 PRD 3-2의 정의와 동일합니다.
- 일별 스냅샷은 PRD가 설명한 "방문 기반 + cron 이중 기록" 방식 그대로 구현되어 있습니다: `dashboard/page.tsx`가 페이지를 볼 때마다 오늘자 스냅샷을 upsert하고([dashboard/page.tsx:90-103](src/app/dashboard/page.tsx#L90-L103)), 별도로 `/api/cron/snapshot`이 Vercel Cron(`vercel.json`, 매일 22:00 UTC)으로 동일 로직을 서버에서 재실행합니다. 두 경로 모두 `(user_id, snapshot_date)` unique + upsert라 중복 기록 걱정은 없습니다.
- 피드 소스별 5초 타임아웃(PRD 3-4, 11-24)도 `src/lib/feed.ts`의 각 fetch에 `signal: AbortSignal.timeout(5000)`으로 실제 적용되어 있습니다([feed.ts:54,101,153,192,260](src/lib/feed.ts#L54)).

### ⚠️ PRD 문서와 실제 코드 사이의 불일치 (문서 정리 필요)

1. **`PRD.md` 5장 표의 오기**: "`portfolio_snapshots` | 일별 자산 스냅샷 | **배치 미구현(테이블만)**"([PRD.md:126](PRD.md#L126))이라고 되어 있는데, 바로 위 3장·4장·11-18절에는 스냅샷 배치가 "구현 완료"라고 명시되어 있어 서로 모순됩니다. 코드 확인 결과 실제로는 구현되어 있으므로(위 항목 참고), 5장의 해당 줄이 갱신되지 않은 낡은 문구로 보입니다.
2. **`/api/cron/feed`는 실제로는 빈 스텁(TODO)** — 라우트 코드가 인증만 확인하고 실제 작업 없이 `{ ok:true, ran:"feed", todo:true }`만 반환합니다([feed/route.ts:17-20](src/app/api/cron/feed/route.ts#L17-L20)). PRD 로드맵(8장)에 "`feed_items` 캐싱은 v1.1 예정"이라고 명시되어 있고 실제 뉴스/공시/실적은 `feed/page.tsx`가 매 요청마다 실시간으로 가져오는 방식(`getFeed()`)이라 **서비스 동작 자체는 의도와 일치**합니다. 다만 `vercel.json`에도 등록되어 있지 않은 죽은 라우트가 레포에 남아 있어, 나중에 누군가 "cron이 있으니 캐싱도 되겠지"라고 오해할 여지가 있습니다 — 주석에 "미사용 스텁"임을 명시하거나 정리하는 걸 권장합니다.
3. **`README.md`의 "남은 개발(MVP)" 목록이 완전히 낡음** — 로그인 UI, 포트폴리오 폼, 시세/환율 연동, 대시보드, 피드, 스냅샷 배치가 전부 "미구현"으로 체크박스가 비어 있는데([README.md:54-63](README.md#L54-L63)), `PRD.md` 기준으로는 전부 구현·배포까지 완료된 상태입니다. 신규 협업자나 검토자가 `README.md`만 보면 프로젝트가 초기 단계라고 오해할 수 있으니 `PRD.md`와 맞춰 갱신하시길 권장합니다.

### 코드 품질 관련 사소한 관찰

- `updateHolding` 서버 액션은 대상 `id`가 실제로 해당 유저 소유인지 사전 조회 없이 바로 `update().eq("id", id).eq("user_id", user.id)`를 실행합니다. RLS와 이중으로 스코프되어 있어 **보안적으로는 문제 없지만**, 존재하지 않는/타인 소유 id를 넘겨도 에러 없이 조용히 0행 업데이트로 끝나 사용자에게는 "성공"으로 보일 수 있습니다(현재 UI는 성공 시 편집모드만 닫힘). 큰 문제는 아니지만 실제 반영 행 수(`count`)를 확인해 실패 메시지를 주는 것도 고려할 만합니다.

---

## 3) 서비스가 직관적이고 의도대로 동작하는지

실제 배포된 프로덕션 사이트(https://us-stock-dashboard-modu-rich.vercel.app)에 접속해 비로그인 상태에서 확인 가능한 범위를 점검했습니다.

### ✅ 정상 확인

- 홈 화면: 서비스 소개 문구, "시작하기" CTA, 대시보드/포트폴리오/관심&소식 3개 카드 네비게이션, 면책 문구("투자 참고용이며 투자자문이 아닙니다")까지 PRD 설명과 일치. 콘솔 에러 0건.
- `/dashboard`, `/portfolio` 비로그인 접근 시 `/login`으로 자동 리다이렉트 — 자연스러운 흐름.
- 로그인 페이지: 로그인/회원가입 탭 전환 시 안내 문구·제출 버튼 라벨이 즉시 바뀜("로그인" ↔ "회원가입"), "비밀번호를 잊으셨나요?" 링크 정상 연결.
- `/forgot-password` 페이지 정상 렌더링, 이메일 입력 폼 존재.
- 다크모드 토글 클릭 시 `<html data-theme>` 속성이 즉시 `dark`로 전환됨 — 깜빡임 없이 동작(쿠키 기반 서버 렌더링 설계 의도와 일치).
- `/api/cron/*` 엔드포인트가 브라우저로 직접 열어도 JSON 401 에러만 반환하고 크래시하지 않음.

### ⚠️ 개선하면 좋은 점

1. **위 1)-보안 항목 3번과 동일** — `/feed`만 비로그인 시 리다이렉트가 아니라 페이지 안에 "로그인이 필요합니다" 텍스트만 뜨는 점이 `/dashboard`·`/portfolio`와 다르게 느껴집니다. 사용자가 헤더의 "로그인" 링크를 스스로 찾아 클릭해야 하는데, 다른 두 페이지처럼 바로 로그인 폼으로 넘겨주는 편이 더 일관되고 직관적입니다.
2. **로그인 없이는 핵심 기능을 전혀 미리 볼 수 없음** — 대시보드/포트폴리오/피드가 어떤 모습인지 비로그인 사용자는 텍스트 안내만 볼 뿐 스크린샷이나 데모 데이터를 볼 수 없습니다. 신규 방문자의 전환율을 고려하면 홈 화면이나 별도 데모 경로에 목업 스크린샷 한 장 정도 추가하는 것도 고려해볼 만합니다(단, 현재 MVP 범위에서는 필수는 아님).
3. 로그인 이후 실제 데이터 흐름(종목 추가 → 평가손익 계산 → 대시보드 반영 → 피드 표시)은 이번 검토에서 실제 계정으로 조작해보지 못했습니다. 코드 레벨에서는 로직이 올바르게 보이지만, 다음 항목은 실제 로그인 상태로 한 번 더 직접 확인해보시길 권장합니다.
   - 종목 추가 후 대시보드 도넛 차트·추이 그래프가 기대한 모양으로 그려지는지
   - 환차손익 분리 표시가 매수환율 입력/미입력 케이스 모두에서 자연스러운 문구로 보이는지
   - Marketaux 키가 없는 환경에서 감성 뱃지가 자연스럽게 숨겨지는지

---

## 요약 체크리스트

| 구분 | 결과 |
|---|---|
| 하드코딩된 비밀값 | 없음 |
| RLS / 인가 | 정상 |
| Cron 인증 가드 (배포본 실측) | 정상 (401 확인) |
| 보호 라우트 리다이렉트 (배포본 실측) | `/dashboard`, `/portfolio` 정상 / `/feed`만 예외 |
| 프로덕션 빌드 (`next build`) | 성공 |
| 타입 체크 (`tsc --noEmit`) | 에러 없음 |
| PRD ↔ 코드 정합성 | 대체로 일치, `PRD.md` 5장 한 줄 + `README.md` 로드맵 표가 낡음 |
| 치명적 보안 취약점 | 없음 |
