"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/claude/time";
import { INTERVALS, useDesktopStatus } from "@/lib/desktop-bridge";
import { cn } from "@/lib/utils";

function Row({ title, note, children }: { title: string; note: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-[200px] flex-1">
        <b>{title}</b>
        <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
      </div>
      {children}
    </div>
  );
}

export function UpdateSettings() {
  const [s, b] = useDesktopStatus();
  if (!b) {
    return <p className="text-sm text-muted-foreground">업데이트 설정은 데스크톱 앱에서만 바꿀 수 있어요.</p>;
  }
  if (!s) return null;
  return (
    <Card className="max-w-2xl">
      <CardContent className="flex flex-col gap-4">
        <h2 className="font-heading text-[1.12em] font-medium">업데이트</h2>
        <Row title="업데이트 주기" note="이 주기마다 PC 화면 값을 새로 읽고 그날 스냅샷을 갱신해요.">
          <select
            aria-label="업데이트 주기"
            value={s.intervalMin}
            onChange={(e) => b.setSettings({ intervalMin: Number(e.target.value) })}
            className="h-8 w-40 rounded-md border border-input bg-background px-2 text-sm"
          >
            {INTERVALS.map((i) => (
              <option key={i.min} value={i.min}>{i.label}</option>
            ))}
          </select>
        </Row>
        <Row title="Windows를 켤 때 실행" note="켜 두면 수업 시작부터 자동으로 기록돼요.">
          <button
            type="button"
            role="switch"
            aria-checked={s.openAtLogin}
            aria-label="Windows를 켤 때 실행"
            onClick={() => b.setSettings({ openAtLogin: !s.openAtLogin })}
            className={cn("relative h-6 w-[42px] rounded-full border", s.openAtLogin ? "border-transparent bg-primary" : "bg-muted")}
          >
            <i className={cn("absolute top-[3px] size-4 rounded-full transition-[left]", s.openAtLogin ? "left-[21px] bg-white" : "left-[3px] bg-muted-foreground")} />
          </button>
        </Row>
        <Row
          title="창을 닫으면"
          note={<>트레이(시계 옆 아이콘)에 남아 계속 업데이트해요. 완전히 끄려면 트레이 메뉴에서 <b>종료</b>를 고르세요.</>}
        >
          <div aria-label="트레이 메뉴 미리 보기" className="flex min-w-[210px] flex-col rounded-md border bg-popover py-1 text-[13px] shadow-lg">
            <span className="px-3 py-1">My Claude Inspector 열기</span>
            <span className="px-3 py-1">지금 업데이트</span>
            <span className="border-y px-3 py-1 text-xs text-muted-foreground">다음 업데이트 {s.nextAt ? formatTime(s.nextAt) : "–"}</span>
            <span className="px-3 py-1">종료</span>
          </div>
        </Row>
        <p className="text-xs text-muted-foreground">
          {s.lastAt ? `마지막 업데이트 ${formatTime(s.lastAt)}` : "아직 업데이트하지 않았어요"}
          <button type="button" onClick={() => b.updateNow()} className="ml-2 text-primary hover:underline">지금 업데이트</button>
        </p>
      </CardContent>
    </Card>
  );
}
