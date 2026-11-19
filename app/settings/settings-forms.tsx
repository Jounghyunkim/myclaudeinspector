"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { issueSubmitToken, updateDisplayName, type ActionState } from "./actions";

export function DisplayNameForm({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <Label htmlFor="display_name">표시 이름 (랭킹 닉네임)</Label>
      <div className="flex gap-2">
        <Input id="display_name" name="display_name" defaultValue={initial} required minLength={2} maxLength={24} />
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : "저장"}
        </Button>
      </div>
      {state && <p className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{state.message}</p>}
    </form>
  );
}

export function SubmitTokenPanel({ server }: { server: string }) {
  const [state, action, pending] = useActionState<ActionState>(issueSubmitToken, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        내 PC에서 사용량을 보낼 때 쓰는 토큰입니다. 새로 만들면 예전 토큰은 더 이상 쓸 수 없습니다.
      </p>
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "만드는 중..." : "새 전송 토큰 만들기"}
        </Button>
      </div>
      {state && <p className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{state.message}</p>}
      {state?.token && (
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">
          bun run ranking:submit -- --token {state.token} --server {server}
        </pre>
      )}
    </form>
  );
}
