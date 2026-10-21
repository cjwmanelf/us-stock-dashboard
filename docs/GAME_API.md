# FarmTwin Game API v1 (P751a)

조회 전용, 본인·소수 지인용. Base URL: https://us-stock-dashboard-modu-rich.vercel.app (배포 전에는 로컬 서버). 모든 JSON 필드는 camelCase. 수치는 number, 미확보 값은 null이며 0으로 대체하지 않는다.

## 로그인 / 갱신
게임이 Supabase Auth REST로 직접 로그인하므로 별도 서버 로그인 API는 없다.
- POST `{SUPABASE_URL}/auth/v1/token?grant_type=password`, `apikey: <public anon key>`, `Content-Type: application/json`, body `{"email":"...","password":"..."}`.
- 갱신: 같은 URL의 `grant_type=refresh_token`, body `{"refresh_token":"..."}`.
- Supabase 응답의 access_token, refresh_token, expires_in 사용. 비밀번호는 저장하지 않고 refresh token은 OS 보안 저장소에 보관한다. WebGL은 메모리 보관을 기본으로 한다. 로그아웃 시 토큰을 삭제한다.
- 게임 API 요청: `Authorization: Bearer <access_token>`. 401이면 한 번 갱신 후 재시도, 실패 시 재로그인. 쿠키 사용 안 함. Supabase URL과 public anon key만 클라이언트 설정에 넣으며 service-role/provider 키는 금지.

## GET /api/game/summary
```json
{"asOf":"2026-10-21T03:00:00.000Z","quoteAsOf":null,"quoteCacheSeconds":900,"delayed":true,"fx":{"rate":1400,"date":"2026-10-20"},"totals":{"totalUsd":100,"totalKrw":140000,"costUsd":90,"gainUsd":10,"gainPct":11.11,"dayChangeUsd":2,"dayChangePct":2.04,"stockGainKrw":14000,"fxGainKrw":900,"gainKrw":14900,"valuedAll":true,"dayChangeAvailable":true,"fxBreakdownAvailable":true},"holdings":[{"ticker":"AAPL","quantity":1,"avgPrice":90,"price":100,"valueUsd":100,"gainUsd":10,"gainPct":11.11,"weightPct":100,"quoteAsOf":null}]}
```
`asOf`는 서버 응답 생성 시각(UTC ISO8601), 거래 시각이 아니다. `quoteAsOf`는 가장 오래된 공급자 시세 시각(UTC ISO8601), 공급자 시각 미확보 시 null. 보유별 quoteAsOf도 제공. 시세는 지연/캐시될 수 있어 실시간이라고 표시하지 않는다. fx.date는 ECB 기준일. 전체 평가 불가 시 합계 평가/손익은 null, 개별 보유는 확보된 값만 제공. 비중은 전체 평가 가능할 때만 계산. 하루 변동은 전일 종가 대비 USD이며 환율의 일간 변동은 포함하지 않는다. 환차 분해 불가 시 해당 합계는 null.

## GET /api/game/history?range=day|week|month|year
기본 day. range는 조회 기간 제한이 아니라 UTC 버킷 단위이며 월요일 시작 주/월/연 각각 마지막 스냅샷을 반환한다. 기존 일별 저장 기록만 읽고 새 기록을 만들지 않는다. 없는 날과 과거는 생성/보간하지 않는다.
```json
{"asOf":"2026-10-21T03:00:00.000Z","range":"month","points":[{"date":"2026-10-20","usd":100,"krw":140000,"fxRate":1400}],"truncated":false}
```
최신 10000개 일별 기록까지 읽고 시간 오름차순으로 반환. truncated=true면 더 오래된 기록이 생략됨. 빈 계정 points=[].

## GET /api/game/feed?tab=watchlist|market
기본 watchlist. watchlist는 보유+관심 종목 합집합, market은 기존 매체별 증시 헤드라인이다.
```json
{"asOf":"2026-10-21T03:00:00.000Z","tab":"watchlist","items":[{"id":"example","ticker":"AAPL","type":"news","title":"Example","url":"https://example.com/news","source":"Example","timestamp":1792551600000,"dateLabel":"2026-10-21","publishedAt":"2026-10-21T03:00:00.000Z"}],"groups":[]}
```
items: id/ticker/type/title/source/dateLabel는 string, type=news|filing|earnings, url는 string|null, timestamp는 Unix ms, publishedAt는 ISO8601. sentiment는 선택 number|null. market에서는 items=[]; groups는 `{source:string,label:string,items:위와 동일 배열}[]`. 소스 실패 시 기존 feed 함수처럼 일부/빈 결과가 가능하다. earnings의 시각은 예정일일 수 있다.

## 오류 / 캐시 / 호출 한도
모든 응답 `Cache-Control: no-store`, 오류 `{"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}`.
- 400 INVALID_QUERY, 401 UNAUTHORIZED(토큰 누락/무효), 403 ORIGIN_NOT_ALLOWED, 429 RATE_LIMITED(Retry-After 초), 500 INTERNAL_ERROR, 503 NOT_CONFIGURED.
- 사용자당 60초 30회 기본, 세 엔드포인트 합산; GAME_API_RATE_LIMIT_PER_MINUTE로 양의 정수 설정 가능. 실행 인스턴스 메모리 기반이므로 재시작/다중 인스턴스에서 전역 강제는 보장하지 않는다. 공개 확대 전 공유 저장소 제한 필요. 게임은 화면 진입 시 호출하고 60초 이상 간격 새로고침 권장.
- upstream 시세 900초, 환율 3600초, 피드는 기존 소스별 15분~6시간 캐시. 개인 응답 캐시 없음.

## CORS / 서버 설정
`GAME_API_ALLOWED_ORIGINS`는 쉼표 구분 allowlist. 미설정 기본값: `https://farmtwin-web.vercel.app,https://farmtwin-web-l7ehs4alsa-uc.a.run.app,http://localhost:*,http://127.0.0.1:*`. wildcard는 위 두 loopback HTTP 호스트 포트에만 지원. 설정 시 기본 목록을 교체한다. Origin 없는 Unity PC 요청 허용, Origin null/그 외 출처 거부. OPTIONS는 인증 없이 204, GET/Authorization/Content-Type만 허용, credentials 쿠키 미지원. 환경변수 설정 후 코디네이터의 승인된 배포 필요.

## 1단계 한계
투자/주문 기능 없음. 거래 의사결정용 실시간 시세가 아니다. Finnhub 무료 키 공유·재배포·상업 이용 권한은 별도 약관/계약 확인 필요. CNBC/Bloomberg RSS 헤드라인 재표시 역시 약관 확인 전 광범위 공개 금지. Marketaux 무료 100회/일 한도는 기존 캐시만으로 다수 사용자를 수용하지 못한다. 공급자 약관을 충족했다고 단정하지 않으며 1단계는 본인·소수 지인용이다. Supabase 이메일 인증 등 운영 설정을 변경하지 않는다.
