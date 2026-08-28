export type SuggestedPrayerSegment =
  | 'segment-morning'
  | 'segment-midday'
  | 'segment-evening'
  | 'segment-night';

export function getBrowserTimeZone(): string;
export function localClockMinutes(now?: Date, timeZone?: string): number;
export function prayerSegmentForMinutes(
  minutesSinceMidnight: number,
): SuggestedPrayerSegment;
export function suggestedPrayerSegment(
  now?: Date,
  timeZone?: string,
): SuggestedPrayerSegment;

