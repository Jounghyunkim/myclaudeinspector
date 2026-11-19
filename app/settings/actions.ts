"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string; token?: string } | null;

export async function updateDisplayName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false, message: "로그인이 필요합니다." };

  const name = String(formData.get("display_name") ?? "").trim();
  if (name.length < 2 || name.length > 24) return { ok: false, message: "표시 이름은 2–24자여야 합니다." };

  // RLS limits this to the signed-in user's own row
  const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", userId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/settings");
  return { ok: true, message: "저장했습니다." };
}

export async function issueSubmitToken(): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ranking_issue_token");
  if (error) return { ok: false, message: error.message.includes("sign in") ? "로그인이 필요합니다." : error.message };
  return { ok: true, message: "새 토큰을 만들었습니다. 이 화면을 벗어나면 다시 볼 수 없습니다.", token: data as string };
}
