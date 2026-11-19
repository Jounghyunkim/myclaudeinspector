import type { ReactNode } from "react";

export const DOC = "https://docs.claude-hunt.com/next/";
const IMG = (file: string) => `https://docs.claude-hunt.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2F${file}&w=1080&q=75`;

export type TopicSlug = "usage" | "context" | "sessions" | "cli" | "mcp" | "skills" | "claudemd" | "memory";
export type Figure = { src: string; alt: string; caption: string; lesson: string };
export type Topic = {
  slug: TopicSlug;
  nav: string;
  title: string;
  lead: string;
  figure?: Figure;
  diagram?: "usage" | "cli" | "mcp" | "skills";
  easy: ReactNode[];
  figure2?: Figure;
  tips: { title: string; text: string; code?: string }[];
  lessons: { path: string; title: string; chapter: string; external?: boolean }[];
};

export const TOPICS: Topic[] = [
  {
    slug: "usage", nav: "토큰 사용량", title: "토큰 사용량",
    lead: "Claude를 얼마나 썼는지 보여 주는 두 가지 값이에요. 플랜 한도 사용률을 먼저 보고, 토큰 수는 자세히 볼 때 써요.",
    diagram: "usage",
    easy: [
      <>Claude 구독 플랜에는 쓸 수 있는 양이 정해져 있어요. 휴대폰 데이터 요금제처럼 <b>5시간 동안 쓸 수 있는 양</b>과 <b>일주일 동안 쓸 수 있는 양</b>이 따로 있어요. 대시보드의 %는 그중 얼마나 썼는지예요.</>,
      <>토큰은 Claude가 글을 읽고 쓰는 단위예요. 내가 보낸 말(입력), Claude가 쓴 답(출력), 다시 읽으려고 저장해 둔 내용(캐시)이 모두 토큰으로 세어져요.</>,
      <>같은 일도 어떤 모델에게 맡기느냐에 따라 한도가 줄어드는 속도가 달라요. 간단한 일은 Sonnet이나 Haiku에게 맡기면 한도를 아낄 수 있어요.</>,
    ],
    tips: [
      { title: "남은 양 확인하기", text: "Claude Code 안에서 지금 사용량과 초기화 시각을 바로 볼 수 있어요.", code: "/usage" },
      { title: "가벼운 모델로 바꾸기", text: "문구 수정이나 간단한 질문은 가벼운 모델로도 충분해요.", code: "/model sonnet" },
    ],
    lessons: [
      { path: "learning-to-delegate/getting-started/setup-and-first-run", title: "Claude Code 실행하기 | 모델과 사용량", chapter: "Part 1 · Chapter 1" },
      { path: "references/copilot-cli-fallback", title: "토큰 소진 시 Copilot CLI로 이어가기", chapter: "참고 자료" },
    ],
  },
  {
    slug: "context", nav: "컨텍스트 윈도", title: "컨텍스트 윈도",
    lead: "Claude가 답 하나를 만들 때 함께 읽는 범위예요. 책상에 비유하면 이해하기 쉬워요.",
    figure: { src: IMG("context-window-desk.0ou6rzuva26tk.png"), alt: "메시지 카드, 펼친 문서, 출력한 종이가 놓인 파란 책상 앞에 앉아 자료를 읽는 사람", caption: "Claude의 책상. 대화, 읽은 파일, 명령 결과가 모두 이 위에 쌓여요.", lesson: "learning-to-delegate/context-management/context-window" },
    easy: [
      <>Claude는 자료를 펼쳐 둔 <b>책상</b>에서 일해요. 내가 보낸 메시지, Claude가 읽은 파일, 명령을 실행한 결과가 모두 책상 위에 쌓여요. 이 책상이 컨텍스트 윈도예요.</>,
      <>책상 크기에는 한계가 있어요. 그리고 Claude는 답할 때마다 책상 전체를 다시 읽어요. 그래서 상관없는 자료가 많이 쌓이면 중요한 규칙을 놓치거나 고친 실수를 다시 하기도 해요.</>,
      <>책상이 70% 넘게 찼다면 정리할 때예요. 다른 일로 넘어가면 <code>/clear</code>로 새로 시작하고, 같은 일을 이어 가야 하면 <code>/compact</code>로 요약 한 장만 남겨요.</>,
    ],
    figure2: { src: IMG("task-sizing-desk-choices.32th7caj73nwv.png"), alt: "지난 일의 자료가 놓인 책상이, 아무것도 없는 책상과 파란 요약 한 장만 놓인 책상으로 나뉘는 모습", caption: "책상을 정리하는 두 가지 방법. 모두 치우거나(/clear), 요약 한 장으로 바꾸거나(/compact).", lesson: "learning-to-delegate/context-management/task-sizing" },
    tips: [
      { title: "책상에 무엇이 쌓였는지 보기", text: "지금 세션에 무엇이 얼마나 쌓였는지 종류별로 보여 줘요.", code: "/context" },
      { title: "다른 일로 넘어갈 때", text: "앞 대화 없이 새로 시작해요. 앞 세션은 지워지지 않고 목록에 남아요.", code: "/clear" },
      { title: "같은 일을 이어 갈 때", text: "지금까지의 대화를 요약으로 바꿔 책상을 비워요.", code: "/compact" },
    ],
    lessons: [
      { path: "learning-to-delegate/context-management/context-window", title: "긴 대화에서 답이 어긋나는 이유 | Context Window", chapter: "Part 1 · Chapter 2" },
      { path: "learning-to-delegate/context-management/task-sizing", title: "새로 시작할 때와 줄일 때 | 새 세션과 /compact", chapter: "Part 1 · Chapter 2" },
      { path: "learning-to-delegate/skills-and-subagents/subagents", title: "따로 쓰고 버리는 Context Window | Subagent", chapter: "Part 1 · Chapter 5" },
    ],
  },
  {
    slug: "sessions", nav: "세션", title: "세션",
    lead: "Claude와 나누는 대화 한 묶음이에요. 세션을 여러 개 열면 Claude에게 여러 일을 동시에 맡길 수 있어요.",
    figure: { src: IMG("new-session-controls.11rxsy1xfxau4.png"), alt: "Claude 데스크톱 앱 Code 탭의 새 세션 화면과 입력창 아래 설정 항목", caption: "Desktop 앱 Code 탭의 새 세션 화면. 폴더, 모델, 권한 모드를 고르고 시작해요.", lesson: "delegating-in-parallel/desktop/claude-code-desktop" },
    easy: [
      <><code>claude</code>를 실행하거나 Desktop 앱에서 새 세션을 열면 대화 하나가 시작돼요. 이 대화 하나가 세션이에요. 세션마다 책상(컨텍스트 윈도)이 따로 있어요.</>,
      <><b>일 하나에 세션 하나</b>가 기본이에요. 버그를 고친 세션에서 새 기능을 이어 만들면, 상관없는 버그 기록이 책상에 남은 채 시작해요.</>,
      <>오래 걸리는 일은 세션을 나눠 동시에 맡겨요. 한 세션이 일하는 동안 다른 세션에 다음 일을 맡기면 기다리는 시간이 줄어요. 같은 파일을 건드리는 일이라면 Worktree로 세션마다 폴더를 나눠요.</>,
    ],
    figure2: { src: IMG("agent-view-dashboard.0c05kjsy3_lkq.png"), alt: "Agent View 메인 대시보드", caption: "Agent View에서는 여러 세션의 상태를 한 화면에서 볼 수 있어요.", lesson: "references/agent-view" },
    tips: [
      { title: "이어 하던 세션 다시 열기", text: "터미널에서 지난 세션 목록을 골라 이어서 할 수 있어요.", code: "claude --resume" },
      { title: "세션에 이름 붙이기", text: "Desktop 앱에서는 세션 이름을 바꿔 두면 여러 세션 사이를 오가기 쉬워요." },
    ],
    lessons: [
      { path: "delegating-in-parallel/desktop/claude-code-desktop", title: "여러 세션을 한 화면에서 | Claude Code Desktop", chapter: "Part 2 · Chapter 7" },
      { path: "delegating-in-parallel/parallel-work/worktree", title: "여러 세션에 나눠 맡기기 | Worktree", chapter: "Part 2" },
      { path: "references/agent-view", title: "여러 세션 한눈에 보기 | Agent View", chapter: "참고 자료" },
    ],
  },
  {
    slug: "cli", nav: "CLI", title: "CLI",
    lead: "터미널에서 명령어로 쓰는 프로그램이에요. 내 PC에 설치하고 로그인해 둔 CLI는 Claude도 그대로 써요.",
    diagram: "cli",
    easy: [
      <><code>git</code>, <code>gh</code>, <code>vercel</code>처럼 터미널에 입력해서 쓰는 프로그램을 CLI라고 해요. Claude는 내 PC의 터미널에서 명령을 실행할 수 있어서, 내가 설치한 CLI를 따로 연결하지 않아도 써요.</>,
      <>같은 서비스에 CLI와 MCP 서버가 둘 다 있으면 <b>CLI부터</b> 써 보세요. CLI는 필요한 결과만 골라 받을 수 있어서 책상(컨텍스트 윈도)을 덜 차지해요.</>,
      <>설치 안 된 CLI는 Claude도 못 써요. 강의 실습에 쓰는 CLI가 &apos;없음&apos;으로 보이면 먼저 설치하세요.</>,
    ],
    tips: [
      { title: "설치 여부 확인하기", text: "버전이 나오면 설치된 거예요.", code: "vercel --version" },
      { title: "Claude에게 설치 맡기기", text: "설치 명령을 Claude가 찾아서 실행하게 할 수 있어요.", code: "vercel CLI를 설치하고 로그인까지 도와줘" },
    ],
    lessons: [
      { path: "learning-to-delegate/external-connection/cli-connection", title: "Claude에게 터미널 도구 빌려주기 | CLI", chapter: "Part 1 · Chapter 6" },
      { path: "learning-to-delegate/external-connection/tools-and-skills", title: "도구는 가능성, Skill은 일관성 | CLI·MCP", chapter: "Part 1 · Chapter 6" },
      { path: "https://code.claude.com/docs/ko/cli-reference", title: "Claude Code CLI 레퍼런스", chapter: "공식 문서", external: true },
    ],
  },
  {
    slug: "mcp", nav: "MCP", title: "MCP",
    lead: "Claude에게 새 도구를 꽂아 주는 표준 규격이에요. USB-C처럼 규격에 맞춘 서버를 연결하면 Claude가 그 도구를 써요.",
    diagram: "mcp",
    easy: [
      <>노트북에 USB-C 단자가 있으면 어느 회사 충전기든 꽂아 쓰죠. MCP도 같아요. 브라우저, GitHub, Notion 같은 서비스가 MCP 규격으로 도구를 내놓으면 Claude Code가 꽂아서 써요.</>,
      <>연결한 MCP 서버는 쓰지 않아도 <b>도구 설명이 책상에 미리 올라가요</b>. 그래서 안 쓰는 서버를 많이 연결해 두면 컨텍스트 윈도를 그만큼 먼저 써요.</>,
      <>Claude Desktop에서 연결한 커넥터(Google Calendar 등)는 계정에 저장돼서 이 대시보드에는 보이지 않아요.</>,
    ],
    tips: [
      { title: "연결된 서버 보기", text: "연결 상태와 서버가 주는 도구 목록을 확인해요.", code: "/mcp" },
      { title: "서버 연결하기", text: "터미널에서 서버를 추가해요. 예시는 브라우저 자동화 서버예요.", code: "claude mcp add playwright -- npx @playwright/mcp@latest" },
    ],
    lessons: [
      { path: "learning-to-delegate/external-connection/mcp-connection", title: "Claude의 Tool 늘리기 | MCP", chapter: "Part 1 · Chapter 6" },
      { path: "learning-to-delegate/external-connection/tools-and-skills", title: "도구는 가능성, Skill은 일관성 | CLI·MCP", chapter: "Part 1 · Chapter 6" },
    ],
  },
  {
    slug: "skills", nav: "Skills", title: "Skills",
    lead: "필요할 때만 꺼내 읽는 매뉴얼이에요. 커밋할 때만 커밋 절차를, 배포할 때만 배포 절차를 읽어요.",
    diagram: "skills",
    easy: [
      <>같은 지시를 매번 덧붙이고 있다면 Skill로 만들 때예요. Skill은 <code>.claude/skills/이름/SKILL.md</code> 파일 하나로 만들어요.</>,
      <>평소에는 Skill의 <b>이름과 description</b>만 책상에 올라가 있어요. 내 요청이 description과 맞으면 그때 본문을 꺼내 읽어요. 그래서 description을 잘 써야 Claude가 알맞은 때에 Skill을 써요.</>,
      <>남이 만든 Skill을 라이브러리처럼 설치해서 쓸 수도 있어요. 설치하기 전에 어떤 명령을 실행하는지 본문을 한번 읽어 보세요.</>,
    ],
    tips: [
      { title: "Skill 직접 부르기", text: "이름 앞에 /를 붙이면 바로 불러 쓸 수 있어요.", code: "/commit" },
      { title: "안 쓰는 Skill 정리하기", text: "쓰지 않는 Skill이 많으면 Claude가 고를 후보만 늘어나요.", code: "설치된 Skill 중 이 프로젝트에서 안 쓸 것 같은 걸 골라 줘" },
    ],
    lessons: [
      { path: "learning-to-delegate/skills-and-subagents/skills", title: "필요할 때만 꺼내 쓰는 매뉴얼 | Skills", chapter: "Part 1 · Chapter 5" },
      { path: "learning-to-delegate/skills-and-subagents/installing-skills", title: "남이 만든 Skill 가져다 쓰기 | skills.sh", chapter: "Part 1 · Chapter 5" },
      { path: "references/skill-improvement-eval", title: "Skill 개선과 Eval", chapter: "참고 자료" },
    ],
  },
  {
    slug: "claudemd", nav: "CLAUDE.md", title: "CLAUDE.md",
    lead: "Claude가 세션을 시작할 때마다 먼저 읽는 업무 매뉴얼이에요.",
    figure: { src: IMG("claude-md-desk-manual.39yf29_prkibe.png"), alt: "지난 일의 자료가 놓인 책상을 비운 뒤, 빈 책상 위에 파란 업무 매뉴얼 한 권만 놓인 모습", caption: "새 세션의 빈 책상에도 CLAUDE.md는 늘 먼저 놓여요.", lesson: "learning-to-delegate/context-management/claude-md" },
    easy: [
      <>Claude는 일은 잘하지만 매일 아침 어제 들은 걸 잊는 신입 사원과 같아요. 그래서 출근할 때마다 업무 매뉴얼을 건네요. 이 매뉴얼이 CLAUDE.md예요.</>,
      <>프로젝트 폴더의 CLAUDE.md는 <b>이 프로젝트에서만</b>, <code>~/.claude/CLAUDE.md</code>는 <b>모든 프로젝트에</b> 적용돼요. <code>@파일이름</code>으로 다른 파일을 불러올 수도 있어요.</>,
      <>매뉴얼은 짧게 써요. 세션마다 통째로 읽기 때문에 길수록 책상을 먼저 차지해요. 가끔만 쓰는 절차는 Skill로 옮기세요.</>,
    ],
    tips: [
      { title: "CLAUDE.md 처음 만들기", text: "프로젝트를 읽고 CLAUDE.md 초안을 만들어 줘요.", code: "/init" },
      { title: "규칙 하나 더하기", text: "대화에서 바로 매뉴얼에 규칙을 추가하게 할 수 있어요.", code: "CLAUDE.md에 '커밋 메시지는 한글로 쓴다'를 추가해 줘" },
    ],
    lessons: [{ path: "learning-to-delegate/context-management/claude-md", title: "첫 출근날 건네는 업무 매뉴얼 | CLAUDE.md", chapter: "Part 1 · Chapter 2" }],
  },
  {
    slug: "memory", nav: "Memory", title: "Memory",
    lead: "Claude가 다음 대화에 쓰려고 스스로 적어 두는 메모예요. CLAUDE.md는 내가 쓰고, Memory는 Claude가 써요.",
    figure: { src: IMG("memory-desk-notepad.1zl0zau62a3lp.png"), alt: "책상 위에 회색 업무 매뉴얼과 그 옆에 파란 메모장과 펜이 놓인 모습", caption: "업무 매뉴얼(CLAUDE.md) 옆의 수첩(Memory).", lesson: "learning-to-delegate/context-management/memory" },
    easy: [
      <>일 잘하는 동료는 지적받은 걸 수첩에 적어 두고 다음 일 전에 펼쳐 봐요. Claude도 내가 바로잡은 말이나 내 작업 방식을 Memory에 적어 두었다가 새 세션에서 펼쳐 봐요.</>,
      <>메모는 네 종류예요. <b>나에 대한 것</b>(user), <b>내가 바로잡거나 좋다고 한 방식</b>(feedback), <b>코드에 없는 진행 중인 일</b>(project), <b>바깥 자료의 위치</b>(reference)예요.</>,
      <><code>MEMORY.md</code>는 메모 목록이에요. 세션을 시작할 때 이 목록을 먼저 읽고, 각 메모는 필요할 때 열어 봐요. 틀린 메모가 있으면 지워 달라고 하면 돼요.</>,
    ],
    tips: [
      { title: "메모 보고 고치기", text: "저장된 메모와 CLAUDE.md를 열어 보고 고칠 수 있어요.", code: "/memory" },
      { title: "기억시키기", text: "다음 세션에도 지켰으면 하는 방식을 말로 알려 줘요.", code: "앞으로 설명할 때는 용어부터 풀어서 말해 줘. 이걸 기억해 둬" },
    ],
    lessons: [
      { path: "learning-to-delegate/context-management/memory", title: "매번 다시 말하지 않기 | Memory", chapter: "Part 1 · Chapter 2" },
      { path: "learning-to-delegate/context-management/claude-md", title: "첫 출근날 건네는 업무 매뉴얼 | CLAUDE.md", chapter: "Part 1 · Chapter 2" },
    ],
  },
];

export function topicOf(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}
