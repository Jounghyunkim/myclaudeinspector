export type RecommendInput = {
  limits: { name: string; pct: number; resetsLabel: string | null }[];
  contexts: { name: string; pct: number }[];
  unusedSkills: { name: string; description: string }[];
  claudeMdLines: number;
};

export type Recommendation = { rule: 1 | 2 | 3 | 4 | 5; title: string; body: string; prompt: string };

export const LIMIT_HIGH = 80;
export const CONTEXT_HIGH = 70;
export const CLAUDE_MD_LONG = 200;

/** 규칙 순서대로 처음 맞는 것 하나만 고른다 */
export function recommend(i: RecommendInput): Recommendation {
  const limit = [...i.limits].sort((a, b) => b.pct - a.pct)[0];
  if (limit && limit.pct >= LIMIT_HIGH) {
    return {
      rule: 1,
      title: `${limit.name}를 ${limit.pct}% 썼어요. 가벼운 작업은 Sonnet으로 바꿔 보세요`,
      body: `${limit.name}는 ${limit.resetsLabel ?? "곧"} 초기화돼요. 이대로 쓰면 그 전에 작업이 끊길 수 있어요. 파일 이름 바꾸기, 간단한 질문 같은 작업은 Sonnet으로도 충분하고 한도를 훨씬 덜 써요.`,
      prompt: "/model sonnet",
    };
  }
  const ctx = [...i.contexts].sort((a, b) => b.pct - a.pct)[0];
  if (ctx && ctx.pct > CONTEXT_HIGH) {
    return {
      rule: 2,
      title: `세션 하나가 컨텍스트를 ${ctx.pct}% 쓰고 있어요. 정리하고 새로 시작해 보세요`,
      body: `"${ctx.name}" 세션이 컨텍스트의 ${ctx.pct}%를 쓰고 있어요. 70%를 넘으면 앞부분 내용을 놓치기 쉬워요. 지금까지 한 일을 메모로 남기고 /clear 후 이어 가면 답이 더 정확해져요.`,
      prompt: "지금까지 이 세션에서 결정한 내용과 남은 할 일을 docs/handoff.md에 짧게 정리해 줘. 정리가 끝나면 알려 줘. 그다음 내가 /clear 하고 그 파일을 읽어서 이어 갈게.",
    };
  }
  const skill = i.unusedSkills[0];
  if (skill) {
    return {
      rule: 3,
      title: `아직 안 써 본 Skill이 ${i.unusedSkills.length}개 있어요. ${skill.name}부터 써 보세요`,
      body: `설치만 하고 쓰지 않은 Skill은 Claude가 고를 후보만 늘려요. ${skill.description ? `${skill.name}는 "${skill.description.slice(0, 90)}${skill.description.length > 90 ? "…" : ""}" 할 때 쓰는 Skill이에요.` : ""} 한 번 써 보고 필요 없으면 지워도 돼요.`.replace(/\s+/g, " "),
      prompt: `${skill.name} Skill이 무엇을 하는지 SKILL.md를 읽고 세 줄로 설명해 줘. 그리고 이 프로젝트에서 써 볼 만한 예시 요청 하나를 알려 줘.`,
    };
  }
  if (i.claudeMdLines > CLAUDE_MD_LONG) {
    return {
      rule: 4,
      title: `CLAUDE.md가 ${i.claudeMdLines}줄이에요. 가끔 쓰는 절차는 Skill로 옮겨 보세요`,
      body: "CLAUDE.md는 세션을 시작할 때마다 통째로 읽어요. 커밋, 배포처럼 가끔 쓰는 절차를 Skill로 옮기면 평소 컨텍스트를 아낄 수 있어요.",
      prompt: "CLAUDE.md를 읽고, 매 세션에 필요한 규칙과 특정 작업에만 필요한 절차를 나눠 줘. 절차는 .claude/skills 아래 Skill로 옮기는 안을 먼저 보여 줘.",
    };
  }
  return {
    rule: 5,
    title: "세션 두 개로 일을 나눠 맡겨 보세요",
    body: "한 세션이 일하는 동안 다른 세션에 다음 일을 맡기면 기다리는 시간이 줄어요. Desktop 앱에서 새 세션을 하나 더 열어 보세요.",
    prompt: "지금 하려는 일을 서로 다른 파일을 건드리는 작업 두 개로 나눠 줘. 각각을 다른 세션에 맡길 수 있게 한 단락짜리 요청문으로 써 줘.",
  };
}
