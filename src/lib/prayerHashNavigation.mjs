export function schedulePrayerHashScroll(
  hash,
  validSegmentIds,
  environment = window,
) {
  const segmentId = typeof hash === 'string' ? hash.replace(/^#/, '') : '';

  if (!validSegmentIds.includes(segmentId)) {
    return () => {};
  }

  let cancelled = false;
  const frameId = environment.requestAnimationFrame(() => {
    if (cancelled) return;

    environment.document
      .getElementById(segmentId)
      ?.scrollIntoView({ behavior: 'auto', block: 'start' });
  });

  return () => {
    cancelled = true;
    environment.cancelAnimationFrame(frameId);
  };
}
