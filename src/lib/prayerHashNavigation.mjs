export function schedulePrayerHashScroll(
  hash,
  validSegmentIds,
  environment = window,
  onComplete,
) {
  const segmentId = typeof hash === 'string' ? hash.replace(/^#/, '') : '';

  if (!validSegmentIds.includes(segmentId)) {
    return () => {};
  }

  let cancelled = false;
  const frameId = environment.requestAnimationFrame(() => {
    if (cancelled) return;

    const target = environment.document.getElementById(segmentId);
    if (!target) return;

    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    onComplete?.(segmentId);
  });

  return () => {
    cancelled = true;
    environment.cancelAnimationFrame(frameId);
  };
}
