"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyButton({ text, label = "복사", done = "복사했어요", variant = "outline" }: { text: string; label?: string; done?: string; variant?: "default" | "outline" }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
          } catch {
            // 클립보드 권한이 없으면 안내만 보여 준다
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied && variant === "outline" ? done : label}
      </Button>
      {copied && variant === "default" ? (
        <span role="status" className="text-xs font-semibold text-foreground">{done}</span>
      ) : null}
    </>
  );
}
