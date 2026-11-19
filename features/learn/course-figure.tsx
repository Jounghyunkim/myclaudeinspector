"use client";

import { useState } from "react";

import { DOC, type Figure } from "./topics";

/** 강의 그림. 불러오지 못하면 강의 페이지 안내로 바꾼다. 요청에는 사용자 데이터를 싣지 않는다. */
export function CourseFigure({ f }: { f: Figure }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="flex flex-col gap-1.5">
      {failed ? (
        <div className="flex aspect-video items-center justify-center rounded-md border border-dashed bg-muted p-3 text-center text-[13px] text-muted-foreground">
          그림을 불러오지 못했어요. 강의 페이지에서 볼 수 있어요.
        </div>
      ) : (
        // 외부 강의 사이트 그림을 브라우저가 직접 불러온다(서버를 거치지 않음)
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.src} alt={f.alt} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-auto w-full rounded-md border bg-muted" />
      )}
      <figcaption className="text-xs leading-normal text-muted-foreground">
        {f.caption}{" "}
        <a href={DOC + f.lesson} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          그림: 제대로 배우기 강의 자료 ↗
        </a>
      </figcaption>
    </figure>
  );
}
