export type Frontmatter = { data: Record<string, string>; body: string };

/**
 * Markdown 앞부분의 --- 사이를 읽는다. 한 줄 값, 따옴표 값, `|`·`>` 블록 값과
 * 들여쓴 하위 키(metadata.type 처럼 점으로 이어 붙임)를 지원한다.
 */
export function parseFrontmatter(text: string): Frontmatter {
  const src = text.replace(/^﻿/, "");
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { data: {}, body: src };
  const lines = m[1].split(/\r?\n/);
  const data: Record<string, string> = {};
  const parents: { indent: number; key: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kv = /^(\s*)([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const indent = kv[1].length;
    while (parents.length && parents[parents.length - 1].indent >= indent) parents.pop();
    const key = [...parents.map((p) => p.key), kv[2]].join(".");
    let value = kv[3].trim();
    if (value === "" ) {
      parents.push({ indent, key: kv[2] });
      continue;
    }
    if (value === "|" || value === ">" || value === "|-" || value === ">-") {
      const block: string[] = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === "")) {
        block.push(lines[++i].trim());
      }
      value = value.startsWith("|") ? block.join("\n").trim() : block.join(" ").replace(/\s+/g, " ").trim();
    } else if (/^(["']).*\1$/.test(value)) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { data, body: src.slice(m[0].length) };
}
