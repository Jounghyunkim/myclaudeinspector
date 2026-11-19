import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";

import { DisplayNameForm, SubmitTokenPanel } from "./settings-forms";

export const metadata = { title: "설정 — My Claude Inspector" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/auth/login?next=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, created_at, updated_at")
    .eq("id", userId)
    .single();

  const h = await headers();
  const server = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const fmt = (t?: string | null) => (t ? new Date(t).toLocaleString("ko-KR") : "–");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>프로필</CardTitle>
          <CardDescription>표시 이름이 랭킹에 닉네임으로 보입니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>이메일</Label>
            <p className="text-sm">{profile?.email ?? "–"}</p>
          </div>
          <DisplayNameForm initial={profile?.display_name ?? ""} />
          <p className="text-xs text-muted-foreground">
            만든 시각 {fmt(profile?.created_at)} · 마지막 수정 {fmt(profile?.updated_at)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>사용량 전송 토큰</CardTitle>
          <CardDescription>대화 내용이나 경로는 보내지 않고, 하루 단위 숫자만 보냅니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <SubmitTokenPanel server={server} />
        </CardContent>
      </Card>
    </main>
  );
}
