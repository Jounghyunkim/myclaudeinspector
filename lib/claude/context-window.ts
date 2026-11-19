/**
 * 모델의 기본 컨텍스트 윈도 크기(가정). 모델 이름에 1m 표시가 있거나
 * 실제로 20만 토큰을 넘게 읽은 세션은 100만 토큰 창으로 본다.
 */
export function contextWindowOf(model: string | null, peakTokens = 0): number {
  if ((model && /1m/i.test(model)) || peakTokens > 200_000) return 1_000_000;
  return 200_000;
}

export function contextPercent(tokens: number, model: string | null, peakTokens = tokens): number {
  return Math.min(100, Math.round((tokens / contextWindowOf(model, peakTokens)) * 100));
}
