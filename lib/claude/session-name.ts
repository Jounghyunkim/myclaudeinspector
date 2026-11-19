export function sessionName(s: { title: string | null; firstPrompt: string | null }): string {
  return s.title || s.firstPrompt || "(이름 없는 세션)";
}
