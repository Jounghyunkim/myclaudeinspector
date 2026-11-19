import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { PathCheck } from "../_data/inspect";

export function PathForm({ check, action = "/" }: { check: PathCheck; action?: string }) {
  const bad = check.state === "error" ? check.bad : null;
  return (
    <Card size="sm" className="ring-1">
      <CardContent>
        <form action={action} method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <Label htmlFor="p-claude">Claude 설치 경로</Label>
            <Input id="p-claude" name="claude" defaultValue={check.paths.claude} aria-invalid={bad === "claude" || undefined} />
          </div>
          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <Label htmlFor="p-project">프로젝트 경로</Label>
            <Input id="p-project" name="project" defaultValue={check.paths.project} placeholder="예: D:\workspace\my-app" aria-invalid={bad === "project" || undefined} />
          </div>
          <Button type="submit">불러오기</Button>
        </form>
      </CardContent>
    </Card>
  );
}
