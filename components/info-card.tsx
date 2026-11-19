"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Help = { what: ReactNode; why: ReactNode };

/** 대시보드 카드의 공통 틀: 제목, 설명, 자세히 보기 링크, "이게 뭐예요?" 설명 */
export function InfoCard({
  title,
  description,
  help,
  detailHref,
  trendHref,
  actions,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  help?: Help;
  detailHref?: string;
  trendHref?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const helpId = useId();
  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-heading text-[1.12em] font-medium whitespace-nowrap">{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] leading-loose text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {actions}
          {trendHref ? (
            <Link href={trendHref} className="px-2 text-[13px] whitespace-nowrap text-primary hover:underline">
              트렌드 →
            </Link>
          ) : null}
          {detailHref ? (
            <Link href={detailHref} className="px-2 text-[13px] whitespace-nowrap text-primary hover:underline">
              자세히 보기 →
            </Link>
          ) : null}
          {help ? (
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={open}
              aria-controls={helpId}
              onClick={() => setOpen((v) => !v)}
              className="text-muted-foreground"
            >
              {open ? "설명 닫기" : "이게 뭐예요?"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {help && open ? (
          <dl id={helpId} className="rounded-lg border border-dashed bg-muted px-3 py-2.5 text-[13px]">
            <dt className="font-semibold">이게 뭐예요?</dt>
            <dd className="mt-0.5 leading-loose">{help.what}</dd>
            <dt className="mt-1.5 font-semibold">왜 중요해요?</dt>
            <dd className="mt-0.5 leading-loose">{help.why}</dd>
          </dl>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
