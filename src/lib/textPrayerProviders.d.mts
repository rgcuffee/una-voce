export type TextPrayerHour =
  | 'office_of_readings'
  | 'morning_prayer'
  | 'midmorning_prayer'
  | 'midday_prayer'
  | 'midafternoon_prayer'
  | 'evening_prayer'
  | 'night_prayer';

export type TextPrayerProviderId = 'divine_office' | 'universalis';
export type TextPrayerDate = string | Date;

export function shiftCivilDate(
  dateKey: string,
  dayDelta: number,
): string | null;

export interface TextPrayerProvider {
  provider: TextPrayerProviderId;
  providerName: string;
  hour: TextPrayerHour;
  hourLabel: string;
  description: string;
  actionLabel: string;
  url: string;
}

export function formatProviderDate(
  selectedDate: TextPrayerDate,
): string | null;

export function normalizeTextPrayerHour(
  hour: string,
): TextPrayerHour | null;

export function getTextPrayerProviders(
  hour: string,
  selectedDate: TextPrayerDate,
): TextPrayerProvider[];

export const TEXT_PRAYER_HOURS: readonly TextPrayerHour[];
