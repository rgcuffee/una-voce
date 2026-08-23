export interface PrayerHashScrollEnvironment {
  document: {
    getElementById(id: string): {
      scrollIntoView(options: ScrollIntoViewOptions): void;
    } | null;
  };
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(handle: number): void;
}

export type PrayerHashScrollCompletion = (segmentId: string) => void;

export function schedulePrayerHashScroll(
  hash: string,
  validSegmentIds: readonly string[],
  environment?: PrayerHashScrollEnvironment,
  onComplete?: PrayerHashScrollCompletion,
): () => void;
