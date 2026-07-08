# Liturgical Calendar

The liturgical calendar engine stores source calendars, canonical celebration identities, liturgical days, hour instances, optional celebrations, review items, and conflict results in Supabase.

## Main Concepts

- A calendar identifies a local or source-specific calendar, such as a national calendar.
- A calendar source records where imported data came from.
- A canonical celebration represents the normalized identity for a feast, memorial, solemnity, or other observance.
- A liturgical day is the principal celebration for a calendar/date pair.
- Liturgical day options represent optional celebrations for the same date.
- Liturgical hour instances represent prayer-hour data attached to a liturgical day.
- Calendar conflicts compare two calendars for the same date and classify differences.

## Scripts

Calendar scripts live in `scripts/`.

```sh
npm run build:us-calendar-sql
npm run seed:us-calendar
npm run seed:ew-calendar
npm run seed:us-calendar-canonical
npm run generate:calendar-conflicts
npm run build:ew-calendar-report
```

The Supabase-writing scripts require `.env.local` with `SUPABASE_URL` or `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Conflict Classification

`src/lib/calendarConflictClassifier.ts` classifies comparison results by severity and reason.

Major warnings include:

- Missing base or comparison days.
- Missing canonical identity.
- Missing precedence.
- Different principal celebration.
- Country-specific principal celebration differences.
- Different holy day obligation status.
- Different rank or precedence for the same canonical celebration.

Minor differences include:

- Liturgical color differences.
- Optional celebration differences.
- Display-title differences.

Calendar conflicts include summarized base/comparison days, options, differences, and notes so the admin UI can show both the headline issue and review context.

## Admin Review

The calendar engine admin route is `/admin/calendar-engine`.

Use it to review seeded calendar data, conflict results, and readiness issues before relying on the calendar for user-facing prayer flows.

## Adding Calendar Data

When importing or reconciling a new calendar source:

1. Add or confirm source calendar metadata.
2. Import raw day rows.
3. Map celebrations to canonical identities.
4. Seed liturgical days and optional celebrations.
5. Generate conflicts against the base calendar.
6. Review major conflicts before publishing or using the data in production.

Prefer canonical identity fixes over title-only matching. Titles vary across sources and locales; canonical IDs are the stable comparison surface.

