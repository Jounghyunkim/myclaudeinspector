import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { Recommendation } from "./recommend";

export function RecommendationCard({ rec, className }: { rec: Recommendation; className?: string }) {
  return (
    <Card className={cn("border-2 border-primary bg-[color-mix(in_oklch,var(--primary)_10%,var(--card))] ring-0", className)}>
      <CardContent className="flex flex-1 flex-col gap-3">
        <Badge className="self-start">오늘의 추천</Badge>
        <h2 className="font-heading text-[1.12em] font-medium">{rec.title}</h2>
        <p className="text-[13px] leading-loose">{rec.body}</p>
        <div className="flex flex-1 flex-col gap-2">
          <span className="text-xs text-muted-foreground">Claude에 붙여 넣을 프롬프트</span>
          <pre className="flex-1 rounded-md border bg-background px-3 py-2.5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">{rec.prompt}</pre>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={rec.prompt} label="프롬프트 복사" done="프롬프트를 복사했어요" variant="default" />
            <span className="text-xs text-muted-foreground">복사한 뒤 Claude 대화창에 붙여 넣으세요. 이 앱은 설정을 직접 바꾸지 않아요.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
