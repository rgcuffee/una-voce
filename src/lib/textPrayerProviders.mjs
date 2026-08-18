const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const HOUR_CONFIG = [
  {
    hour: 'office_of_readings',
    segmentId: 'segment-office',
    label: 'Office of Readings',
    divineOfficeSlug: 'office-of-readings',
    universalisSlug: 'readings',
  },
  {
    hour: 'morning_prayer',
    segmentId: 'segment-morning',
    label: 'Morning Prayer',
    divineOfficeSlug: 'morning-prayer',
    universalisSlug: 'lauds',
  },
  {
    hour: 'midmorning_prayer',
    segmentId: 'segment-midmorning',
    label: 'Midmorning Prayer',
    divineOfficeSlug: 'midmorning-prayer',
    universalisSlug: 'terce',
  },
  {
    hour: 'midday_prayer',
    segmentId: 'segment-midday',
    label: 'Midday Prayer',
    divineOfficeSlug: 'midday-prayer',
    universalisSlug: 'sext',
  },
  {
    hour: 'midafternoon_prayer',
    segmentId: 'segment-midafternoon',
    label: 'Midafternoon Prayer',
    divineOfficeSlug: 'midafternoon-prayer',
    universalisSlug: 'none',
  },
  {
    hour: 'evening_prayer',
    segmentId: 'segment-evening',
    label: 'Evening Prayer',
    divineOfficeSlug: 'evening-prayer',
    universalisSlug: 'vespers',
  },
  {
    hour: 'night_prayer',
    segmentId: 'segment-night',
    label: 'Night Prayer',
    divineOfficeSlug: 'night-prayer',
    universalisSlug: 'compline',
  },
];

const HOUR_ALIASES = new Map([
  ['office_of_readings', 'office_of_readings'],
  ['office-of-readings', 'office_of_readings'],
  ['segment-office', 'office_of_readings'],
  ['morning_prayer', 'morning_prayer'],
  ['morning-prayer', 'morning_prayer'],
  ['lauds', 'morning_prayer'],
  ['segment-morning', 'morning_prayer'],
  ['midmorning_prayer', 'midmorning_prayer'],
  ['midmorning-prayer', 'midmorning_prayer'],
  ['terce', 'midmorning_prayer'],
  ['segment-midmorning', 'midmorning_prayer'],
  ['midday_prayer', 'midday_prayer'],
  ['midday-prayer', 'midday_prayer'],
  ['sext', 'midday_prayer'],
  ['segment-midday', 'midday_prayer'],
  ['midafternoon_prayer', 'midafternoon_prayer'],
  ['midafternoon-prayer', 'midafternoon_prayer'],
  ['none', 'midafternoon_prayer'],
  ['segment-midafternoon', 'midafternoon_prayer'],
  ['evening_prayer', 'evening_prayer'],
  ['evening-prayer', 'evening_prayer'],
  ['vespers', 'evening_prayer'],
  ['segment-evening', 'evening_prayer'],
  ['night_prayer', 'night_prayer'],
  ['night-prayer', 'night_prayer'],
  ['compline', 'night_prayer'],
  ['segment-night', 'night_prayer'],
]);

const PROVIDER_NAMES = {
  divine_office: 'Divine Office',
  universalis: 'Universalis',
};

function daysInMonth(year, month) {
  const isLeapYear =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

  return [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];
}

function isValidCivilDate(year, month, day) {
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  return day <= daysInMonth(year, month);
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function parseCivilDateKey(dateKey) {
  if (typeof dateKey !== 'string') {
    return null;
  }

  const match = DATE_PATTERN.exec(dateKey);
  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  return isValidCivilDate(year, month, day)
    ? { year, month, day }
    : null;
}

/**
 * Move a YYYY-MM-DD civil date key without constructing a timestamp.
 * This keeps calendar navigation independent of the browser timezone and
 * daylight-saving transitions.
 */
export function shiftCivilDate(dateKey, dayDelta) {
  const parsed = parseCivilDateKey(dateKey);
  if (!parsed || !Number.isSafeInteger(dayDelta)) {
    return null;
  }

  let { year, month, day } = parsed;
  const step = dayDelta < 0 ? -1 : 1;

  for (let remaining = Math.abs(dayDelta); remaining > 0; remaining -= 1) {
    day += step;

    if (day < 1) {
      month -= 1;
      if (month < 1) {
        year -= 1;
        month = 12;
      }
      day = daysInMonth(year, month);
    } else {
      if (day > daysInMonth(year, month)) {
        day = 1;
        month += 1;
        if (month > 12) {
          year += 1;
          month = 1;
        }
      }
    }

    if (year < 1 || year > 9999) {
      return null;
    }
  }

  return `${String(year).padStart(4, '0')}-${padDatePart(month)}-${padDatePart(day)}`;
}

/**
 * Format a selected civil date without serializing it through UTC.
 * Date objects are read through their local calendar getters; the UI uses
 * the string form, which is already a civil date and is copied directly.
 */
export function formatProviderDate(selectedDate) {
  if (typeof selectedDate === 'string') {
    const parsed = parseCivilDateKey(selectedDate);
    return parsed
      ? `${String(parsed.year).padStart(4, '0')}${padDatePart(parsed.month)}${padDatePart(parsed.day)}`
      : null;
  }

  if (!(selectedDate instanceof Date) || Number.isNaN(selectedDate.getTime())) {
    return null;
  }

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const day = selectedDate.getDate();
  return isValidCivilDate(year, month, day)
    ? `${String(year).padStart(4, '0')}${padDatePart(month)}${padDatePart(day)}`
    : null;
}

export function normalizeTextPrayerHour(hour) {
  if (typeof hour !== 'string') {
    return null;
  }

  return HOUR_ALIASES.get(hour) ?? null;
}

function providerOption(provider, config, date) {
  const url =
    provider === 'divine_office'
      ? `https://divineoffice.org/today/${config.divineOfficeSlug}/?date=${date}`
      : `https://universalis.com/USA/${date}/${config.universalisSlug}.htm`;

  return {
    provider,
    providerName: PROVIDER_NAMES[provider],
    hour: config.hour,
    hourLabel: config.label,
    description: `Read ${config.label} with ${PROVIDER_NAMES[provider]}.`,
    actionLabel: 'Begin Prayer',
    url,
  };
}

export function getTextPrayerProviders(hour, selectedDate) {
  const normalizedHour = normalizeTextPrayerHour(hour);
  const date = formatProviderDate(selectedDate);
  if (!normalizedHour || !date) {
    return [];
  }

  const config = HOUR_CONFIG.find((item) => item.hour === normalizedHour);
  if (!config) {
    return [];
  }

  return [
    providerOption('divine_office', config, date),
    providerOption('universalis', config, date),
  ];
}

export const TEXT_PRAYER_HOURS = HOUR_CONFIG.map((config) => config.hour);
