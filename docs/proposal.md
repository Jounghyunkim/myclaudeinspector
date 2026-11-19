# My Claude Inspector — 서비스 제안서

> 강의에서 배운 Claude Code 개념(설정 계층, CLAUDE.md, Memory, Skill, Subagent, MCP, Hook, 권한 모드 등)을
> **내 컴퓨터에 실제로 깔린 설정**을 보여 주면서 설명해 주는 로컬 대시보드.

## 1. 해결하려는 문제

- 강의와 교육자료로 배운 개념이 **내 환경에서는 어디에 어떻게 있는지** 연결되지 않는다.
  예: "Skill은 필요할 때만 꺼내 쓰는 매뉴얼"이라고 배웠지만, 지금 내 프로젝트에 어떤 Skill이 있고 언제 불리는지는 폴더를 직접 뒤져야 안다.
- 설정이 여러 곳(`~/.claude`, 프로젝트 `.claude`, `settings.local.json`, 관리형 정책, CLI 플래그)에 흩어져 있어 **최종적으로 어떤 값이 적용되는지** 알기 어렵다.
- 숨은 기능과 꿀팁(`/compact`, Plan Mode, worktree 병렬 작업, `claude doctor`, `claude agents` 등)은 강의를 들은 사람만 안다.

## 2. 한 줄 컨셉

**"내 Claude 설정을 엑스레이로 찍고, 찍힌 부분마다 강의 노트가 붙어 있는 화면"**

사용자는 Claude 설치 경로(`~/.claude`)와 프로젝트 경로만 입력한다. 서비스가 두 폴더를 읽어서
① 무엇이 있는지(인벤토리), ② 어떤 순서로 합쳐지는지(계층), ③ 그게 무슨 뜻이고 어떻게 더 잘 쓰는지(설명·추천)를 보여 준다.

## 3. 실행 형태 — 권장안: localhost Next.js 앱

| 방식 | 폴더 접근 | 장점 | 한계 |
|---|---|---|---|
| **A. localhost Next.js 서버 (권장)** | 서버(Node `fs`)가 직접 읽음 | `~/.claude` 같은 숨김 폴더, `~/.claude.json`도 읽을 수 있음. 이 저장소(Next.js 16)를 그대로 쓸 수 있음 | 내 PC에서 `bun run dev` 또는 `bun start` 실행 필요 |
| B. 순수 브라우저 앱 | File System Access API | 설치 없이 열기만 하면 됨 | Chromium 전용. 숨김·시스템 폴더 선택이 막히는 경우가 많고, 경로를 문자열로 입력할 수 없음 |
| C. 원격 서버 서비스 | 내 PC에 에이전트 설치 필요 | 어디서나 접속 | 보안 부담 큼(설정 파일을 외부로 보내야 함). 1차 범위에서는 제외 |

**결정 제안:** A로 시작한다. 서버는 `127.0.0.1`에만 바인딩한다. 원격에서 보고 싶으면 나중에 Tailscale 같은 사설망이나
Claude 앱 Remote Control처럼 "내 PC가 서버, 원격은 뷰어"인 구조로 확장한다. 설정 데이터는 PC 밖으로 나가지 않는다.

## 4. 읽어 들이는 정보 (데이터 소스)

| 범위 | 위치 | 보여 줄 것 |
|---|---|---|
| 사용자 | `~/.claude/settings.json` | 권한 규칙, 모델, 출력 스타일, hooks, env(값은 마스킹) |
| 사용자 | `~/.claude/CLAUDE.md` | 모든 프로젝트에 적용되는 지침 |
| 사용자 | `~/.claude/skills/`, `agents/`, `commands/` | 개인 Skill / Subagent / 슬래시 명령 |
| 사용자 | `~/.claude/plugins/installed_plugins.json`, `known_marketplaces.json` | 설치된 플러그인과 마켓플레이스 |
| 사용자 | `~/.claude.json` | MCP 서버 목록, 프로젝트별 상태(필요한 키만 선별) |
| 사용자 | `~/.claude/projects/<프로젝트>/memory/` | Auto Memory 파일과 `MEMORY.md` 인덱스 |
| 관리형 | `remote-settings.json`, `policy-limits.json` | 조직 정책(읽기 전용 표시, "회사가 정한 값" 배지) |
| 프로젝트 | `CLAUDE.md`, `AGENTS.md`, 하위 폴더 `CLAUDE.md` | 지침과 `@import` 연결 |
| 프로젝트 | `.claude/settings.json`, `settings.local.json` | 팀 공유 설정과 개인 설정 |
| 프로젝트 | `.claude/skills/`, `agents/`, `commands/`, `output-styles/`, `.mcp.json` | 프로젝트 전용 확장 |
| 프로젝트 | `.agents/skills/`, `skills-lock.json` | 다른 에이전트(Codex)와 공유하는 Skill, 설치 출처 |

**절대 읽지 않는 것:** `~/.claude/.credentials.json`, 토큰·API 키 값, 대화 기록 본문. 이 목록은 코드에 하드코딩해서 막는다.

## 5. 핵심 화면

### 5-1. 홈 대시보드 — "내 Claude 한눈에"
- 카드(숫자는 예시): Skill 29개 · Subagent 0개 · MCP n개 · 플러그인 n개 · Hook n개 · Memory n개
- 각 카드에 한 줄 설명과 "강의 Chapter 5에서 배운 내용" 같은 링크가 붙는다.
- 건강 점수: 아래 5-5의 진단 결과를 요약해서 보여 준다.

### 5-2. 설정 계층 뷰 — "이 값은 어디서 왔나요?"
```
관리형 정책 (회사)          ← 가장 강함, 덮어쓸 수 없음
  └ CLI 플래그 (--model 등)
     └ 프로젝트 로컬  .claude/settings.local.json
        └ 프로젝트 공유  .claude/settings.json
           └ 사용자  ~/.claude/settings.json   ← 가장 약함
```
- 설정 키마다 **최종 적용값**과 **출처 파일**을 표시한다. 덮어써진 값은 흐리게 보여 준다.
- 권한 규칙(allow / ask / deny)은 계층별로 합쳐서 보여 주고 "왜 이 명령이 막혔는지"를 설명한다.
  (예: 이번 세션에서 `git push`가 막힌 이유를 찾는 데 바로 쓸 수 있다.)

### 5-3. 컨텍스트 트리 — "Claude가 세션 시작 때 읽는 것"
- `~/.claude/CLAUDE.md` → 프로젝트 `CLAUDE.md` → `@AGENTS.md` import → 하위 폴더 `CLAUDE.md`를 트리로 그린다.
- 파일마다 대략적인 토큰 수를 막대로 보여 주고, 너무 길면 "Context Window를 아끼려면 Skill로 옮기세요" 같은 팁을 띄운다.
- Memory 파일 목록과 각 파일의 `name`, `description`, `type`을 보여 준다.

### 5-4. Skill · Subagent 탐색기
- 목록: 이름, `description`(Claude가 언제 부를지 판단하는 문장), 범위(사용자/프로젝트/플러그인), 설치 출처.
- 상세: `SKILL.md` 렌더링, 함께 들어 있는 파일, `.claude`와 `.agents` 복사본이 같은지 여부.
- 기능: 검색, "이 Skill을 부르려면 이렇게 말하세요" 예시 문장, `/skill-name` 복사 버튼.

### 5-5. 진단과 추천 — "더 잘 쓰는 꿀팁"
정적 규칙으로 내 설정을 점검하고, 고치는 방법을 강의 링크와 함께 보여 준다.

| 진단 예시 | 추천 |
|---|---|
| `CLAUDE.md`가 너무 김 | 자주 안 쓰는 절차는 Skill로 분리 |
| Skill `description`이 비었거나 너무 짧음 | Claude가 자동으로 고르지 못함. 트리거 문장을 추가 |
| 권한 규칙이 없음 | 자주 쓰는 읽기 전용 명령을 allow에 추가(`/fewer-permission-prompts`) |
| `.claude`와 `.agents` Skill 내용이 다름 | `update-project-skills`로 다시 동기화 |
| git 사용자 정보 없음 | 커밋 전에 설정 |
| `settings.local.json`이 `.gitignore`에 없음 | 개인 설정이 커밋될 위험 |

### 5-6. 명령 도우미 — CLI 치트시트
- [CLI 참조](https://code.claude.com/docs/ko/cli-reference)를 상황별로 묶는다:
  "이어서 하기"(`claude -c`, `-r`), "점검"(`claude doctor`, `claude auth status`), "병렬"(`claude agents`, `--worktree`), "자동화"(`claude -p`).
- 플래그를 체크박스로 고르면 명령 문자열을 만들어 복사하게 해 준다. 실행은 사용자가 직접 한다.

### 5-7. 학습 모드 — 강의 목차와 내 설정 연결
- [강의 목차](https://docs.claude-hunt.com/next)의 각 Lesson(CLAUDE.md, Memory, Skills, Subagent, MCP, Worktree, /goal, 예약 작업 …) 옆에
  **"내 환경에서는"** 칸을 둔다. 예: "Memory — 이 프로젝트에 n개 있음, 보기".
- 아직 안 써 본 기능은 "시도해 보기" 체크리스트로 보여 준다. 예: Subagent 0개 → "첫 Subagent 만들어 보기".

## 6. 단계별 범위

| 단계 | 포함 | 완료 기준 |
|---|---|---|
| **MVP** | 경로 입력, 인벤토리 대시보드(5-1), Skill 탐색기(5-4), 설정 계층 뷰(5-2, 설정 키와 권한만) | 내 PC의 `~/.claude`와 이 저장소를 넣으면 Skill 29개와 설정 출처가 맞게 나옴 |
| 2단계 | 컨텍스트 트리(5-3), 진단·추천(5-5), 개념 설명 카드 | 진단 6종 동작, 각 항목에 강의 링크 |
| 3단계 | CLI 명령 도우미(5-6), 학습 모드(5-7), 여러 프로젝트 비교 | 프로젝트 2개를 나란히 비교 |
| 확장 | 파일 변경 감시(실시간 갱신), 원격 뷰어, 설정 편집(쓰기) | 쓰기 기능은 별도 결정 후 진행 |

## 7. 기술 구성(초안)

- **앱:** 이 저장소의 Next.js 16 App Router + shadcn/ui(rhea 프리셋)
- **읽기 계층:** 서버 전용 모듈 `lib/inspector/`가 경로를 받아 파일을 읽고, 정규화된 JSON(`Inventory`, `SettingsLayer[]`, `ContextNode` 트리)을 돌려준다. 클라이언트는 파일 시스템에 직접 접근하지 않는다.
- **시각화:** 계층·트리는 shadcn `Card`, `Tabs`, `Collapsible`, `Badge`로 만들고, 그래프가 필요하면 React Flow 등을 검토한다.
- **보안:** 읽기 전용, `127.0.0.1` 바인딩, 비밀 파일 차단 목록, env와 토큰 값 마스킹, 입력 경로 정규화(상위 폴더 탈출 방지).
- **설명 콘텐츠:** 개념 설명과 팁을 `content/*.md`로 관리해서 강의 자료가 바뀌어도 코드 수정 없이 갱신한다.

## 8. 정해야 할 것

1. 1차 사용자: 나 혼자 쓰는 도구인가, 같은 강의 수강생에게 배포할 도구인가? (배포한다면 `bunx` 한 줄 실행 패키지가 필요하다.)
2. 설정 **편집** 기능까지 갈 것인가, 끝까지 읽기 전용으로 둘 것인가?
3. 강의 자료 내용을 앱에 얼마나 담을 것인가? (링크만 둘지, 요약 설명을 직접 쓸지. 저작권을 고려하면 직접 쓴 요약과 링크를 권장한다.)
4. Windows 경로(`C:\Users\...`)와 macOS 경로를 모두 지원할 것인가? (현재 개발 환경은 Windows.)
