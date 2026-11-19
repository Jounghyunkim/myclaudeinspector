import { bearerToken, deleteMyRecords, myRecordDays } from "@/features/ranking";

import { errorResponse } from "../errors";

const missingToken = () =>
  Response.json({ error: "Authorization: Bearer <전송 토큰> 헤더가 필요합니다. /settings에서 받으세요." }, { status: 401 });

/** GET with `Authorization: Bearer mci_...` — how many days of my records the ranking holds. */
export async function GET(request: Request) {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return missingToken();
  try {
    return Response.json({ days: await myRecordDays(token) });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * DELETE with `Authorization: Bearer mci_...` — removes all of my daily records, so my nickname
 * leaves the leaderboard. The account and the token stay; the next upload starts fresh.
 */
export async function DELETE(request: Request) {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return missingToken();
  try {
    return Response.json({ deletedDays: await deleteMyRecords(token) });
  } catch (err) {
    return errorResponse(err);
  }
}
