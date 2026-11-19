import { InfoCard } from "@/components/info-card";
import { Stat, StatRow } from "@/components/stat";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { ClaudeMdPanel, McpPanel, MemoryPanel, SkillsPanel, ToolSection } from "./tool-panels";
import type { ToolsView } from "./tools";

export function ToolsCard({ tools, links, className }: { tools: ToolsView; links: Record<"cli" | "skills" | "mcp" | "claudemd" | "memory" | "trends", string>; className?: string }) {
  const installed = tools.cli.filter((c) => c.version).length;
  const unused = tools.skills.filter((s) => s.uses === 0).length;
  const mdLines = tools.claudeMd.reduce((n, f) => n + f.lines, 0);
  const memCount = tools.memory.filter((m) => m.name !== "MEMORY.md").length;
  return (
    <InfoCard
      className={className}
      title="도구"
      description="Claude가 쓸 수 있는 도구와 세션을 시작할 때 미리 읽는 파일"
      trendHref={links.trends}
      help={{
        what: "Claude는 대화만 하는 게 아니라 터미널 명령(CLI), 외부 서비스 연결(MCP), 필요할 때 꺼내 쓰는 매뉴얼(Skill)을 써서 일을 해요. CLAUDE.md와 Memory는 세션을 시작할 때 미리 읽는 안내문이에요.",
        why: "도구가 많을수록 Claude에게 맡길 수 있는 일이 넓어져요. 반대로 CLAUDE.md가 너무 길면 매번 컨텍스트를 그만큼 먼저 써요.",
      }}
    >
      <StatRow>
        <Stat label="CLI" value={installed} unit={`/${tools.cli.length}`} note={installed === tools.cli.length ? "모두 설치됨" : `${tools.cli.length - installed}개 설치 안 됨`} />
        <Stat label="MCP" value={tools.mcp.length} note="로컬 설정 기준" />
        <Stat label="Skills" value={tools.skills.length} note={`${unused}개 아직 안 씀`} />
        <Stat label="CLAUDE.md" value={mdLines} unit="줄" note={`파일 ${tools.claudeMd.length}개 합계`} />
        <Stat label="Memory" value={memCount} note="이 프로젝트" />
      </StatRow>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6 wide:grid-cols-5">
        <ToolSection title="CLI" sub="터미널 도구" href={links.cli} className="xl:col-span-2 wide:col-span-1">
          <ul className="flex flex-col">
            {tools.cli.map((c) => (
              <li key={c.name} className={cn("grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 border-t py-1.5 first:border-t-0", !c.version && "[&>code]:opacity-55")}>
                <code>{c.name}</code>
                <Badge variant={c.version ? "secondary" : "outline"}>{c.version ?? "없음"}</Badge>
                <span className="truncate text-right text-xs text-muted-foreground">{c.use}</span>
              </li>
            ))}
          </ul>
        </ToolSection>
        <ToolSection title="Skills" sub="사용 횟수 · 눌러서 소개 보기" href={links.skills} className="xl:col-span-2 wide:col-span-1">
          <SkillsPanel skills={tools.skills} />
        </ToolSection>
        <ToolSection title="MCP" sub="외부 서비스 연결 · 눌러서 소개 보기" href={links.mcp} className="xl:col-span-2 wide:col-span-1">
          <McpPanel servers={tools.mcp} />
        </ToolSection>
        <ToolSection title="CLAUDE.md" sub="줄 수 · 눌러서 내용 보기" href={links.claudemd} className="xl:col-span-3 wide:col-span-1">
          <ClaudeMdPanel files={tools.claudeMd} />
        </ToolSection>
        <ToolSection title="Memory" sub="Claude가 기억하는 것 · 눌러서 내용 보기" href={links.memory} className="md:col-span-2 xl:col-span-3 wide:col-span-1">
          <MemoryPanel files={tools.memory} />
        </ToolSection>
      </div>
    </InfoCard>
  );
}
