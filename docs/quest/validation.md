# 평가 도구 검증 기록

2026-11-09, Windows PowerShell, Node v24.18.0. 유료 모델·live endpoint·원격 쓰기 없음. 실제 응답 관찰은 0건이다.

| 직접 실행 | 작업 위치 | 결과 |
|---|---|---|
| 원본 복사 후 `node --test` | tools/quest-evaluation | 원본 12개 통과, 실패 0 |
| 통합 변경 후 `node --test` | tools/quest-evaluation | 14개 통과, 실패 0; 원본 12개와 토큰/원본결합 2개 |
| `node src/cli.mjs collect --version briefing-v1` | tools/quest-evaluation | dry-run; plannedRequests 3, completed 0, failed 0, 네트워크 0 |
| `node src/cli.mjs collect --local-eval --allow-local-http --version briefing-v1` | tools/quest-evaluation | dry-run; plannedRequests 3, completed 0, failed 0, live 아님 |
| `node smoke.mjs` | tools/quest-evaluation | snapshot 재저장 동일 hash, join 통과, 실제 관찰 0, 합성 record 1, 후보 0, 합성 pair 1, unchanged 6, 네트워크 0 |

추가 테스트는 명시적 로컬 모드에서만 비밀 헤더 전송, 비로컬/배포/HTTPS 전송 거부, cookie 필수, 예외 문자열에 포함된 토큰 미저장, 기본 모드 헤더 생략을 검증했다. 결합 테스트는 trace·질문/종목·asOf·origin·version 불일치 거부와 원본 ticker 보존을 확인했다. 모든 fetch는 mock이다. 스냅샷 수정 탐지와 fixture SHA-256, 중복 trace 거부는 원본 테스트에 포함된다.

초기 명령 한 번은 잘못된 작업 위치인 저장소 부모에서 `node --test`를 실행했다. 광범위 자동 탐색 결과 34개 중 32개 통과, 2개 실패였으며 `quest-observability/test/adapter.test.ts`, `sdk.test.ts`의 직접 Node 실행에서 빌드된 `.js` 모듈을 찾지 못했다. 이를 앱 실패나 전역 테스트 성공으로 간주하지 않았다. 이후 의도한 tools 폴더에서 제한된 명령을 실행했고 위 14개가 통과했다. 다른 담당 파일은 수정하지 않았다.

앱 담당 Q601의 build/TypeScript/focused lint/로컬 보호 경로 점검 통과 및 Q603의 mocked/in-memory SDK 9개 통과는 코디네이터를 통한 별도 보고다. 이 기록의 직접 실행과 구별하며, 인증된 Supabase·실제 LLM·Langfuse ingestion·production 배포 검증을 의미하지 않는다.

최종 독립검토 반영 후 `node --test`: **17개 통과, 실패 0**. 추가 3개 회귀 테스트는 frozen asOf 누락·응답 시각 불일치·trace/conversation 재사용 거부, 운영 오류의 품질 후보 제외와 HTTP 200 비정상 응답 유지, UUID·HTTPS URL 검증을 확인했다. 이 재현 역시 모의 객체이며 실제 LLM 관찰 후보가 아니다. 최종 `node smoke.mjs`도 snapshot/join/report/compare 통과했다.

`git check-ignore`는 tools/quest-evaluation/private/example.json, traces/example.json, .env.local 및 .briefing-eval/example.json 모두 제외됨을 확인했다. 코디네이터는 계측 보완 후 최종 `npm run build` exit 0, TypeScript 통과, 21페이지 생성을 직접 확인했다고 전달했다. Q605의 실제 service→bridge→SDK 인메모리 회귀 경로도 성공·실패·생략·재생 단계에서 측정된 span 및 generation usage 전달을 확인했다는 별도 보고이며 원격 수집은 아니다.

설치에서 보고된 dependency audit finding은 18개(중간 9, 높음 8, 치명 1)라는 담당자 보고를 반영했다. 전체가 기존 문제라는 baseline 귀속은 확인되지 않았다. BRIEFING.md의 해당 문장을 코디네이터의 명시적 추가 권한으로 정정했다.
