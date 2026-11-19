# 랭킹 서버: 유출 비밀번호 차단 꺼짐, PRODUCT.md 경계와 충돌

**Symptom**: 두 가지가 정리되지 않았다.
- Supabase advisors가 `auth_leaked_password_protection` 경고를 낸다. 유출된 비밀번호로도 가입할 수 있다.
- PRODUCT.md는 "설정과 사용 기록은 사용자의 PC 밖으로 내보내지 않는다"고 하는데, 랭킹 서버는 사용자가 명령을 직접 실행했을 때 하루 단위 숫자를 Supabase로 보낸다.

**Observed evidence**: 2026-11-19 `npx supabase db advisors --remote --type security`. 나머지 경고 5개는 `ranking_period_stats`, `ranking_submit_with_token`, `ranking_issue_token`처럼 의도한 공개 RPC다. 각 함수는 토큰이나 `auth.uid()`를 확인한다.

**Suspected cause**: 유출 비밀번호 차단은 대시보드 Auth 설정이며 기본값이 꺼져 있다. 경계 충돌은 랭킹 기능 요청이 제품 정의보다 나중에 나와서 생겼다.

**What was tried**: 둘 다 바꾸지 않았다. 유출 비밀번호 차단은 AGENTS.md 예산상 범위 밖인 운영 하드닝이고, PRODUCT.md 수정은 제품 정의 변경이다.

**Proposed next step**: `define-product`로 "숫자만, 사용자가 직접 보낼 때만 PC 밖으로 나간다"는 예외를 PRODUCT.md 경계에 넣을지 정한다. 배포 전에는 Supabase Auth 설정에서 유출 비밀번호 차단을 켤지 정한다. 이 프로젝트(`feedme-clone`)는 다른 앱과 함께 쓰므로 그 앱에도 영향이 있다.
