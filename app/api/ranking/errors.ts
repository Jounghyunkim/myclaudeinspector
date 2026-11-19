import { RankingStoreError } from "@/features/ranking";

export function errorResponse(err: unknown): Response {
  if (err instanceof RankingStoreError) return Response.json({ error: err.message }, { status: err.status });
  console.error(err);
  return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
}
