const OPEN_EVENT = 'devotion_page_opened';
const RESOURCE_EVENT = 'devotion_resource_opened';
const SAFE_PROVIDERS = new Set([
  'youtube', 'spotify', 'apple-podcasts', 'apple-podcast', 'universalis',
  'divine-office', 'divineoffice', 'external', 'text', 'unknown',
]);
const SAFE_MEDIA_TYPES = new Set([
  'text', 'audio', 'video', 'live_video', 'external_link', 'unknown',
]);

export function aggregateDevotionAnalytics({
  devotion,
  participants,
  detailParticipants = participants,
  reports,
  events,
  sessions,
}) {
  const reportsByCell = new Map(
    reports.map((report) => [cellKey(report.participant_id, report.pilot_day), report]),
  );
  const eventsByCell = groupByCell(events);
  const sessionsByCell = groupByCell(sessions);

  const rows = detailParticipants.map((participant) => ({
    id: participant.id,
    safeId: participant.id.slice(0, 8),
    label: participant.label,
    cohortId: participant.cohort_id ?? null,
    status: participant.status ?? 'enrolled',
    linkStatus: participant.revoked_at ? 'revoked' : 'active',
    completedAt: participant.completed_at ?? null,
    createdAt: participant.created_at,
    nights: Array.from({ length: devotion.duration_days }, (_, index) => {
      const pilotDay = index + 1;
      const key = cellKey(participant.id, pilotDay);
      const cellEvents = eventsByCell.get(key) ?? [];
      const cellSessions = sessionsByCell.get(key) ?? [];
      const openEvents = cellEvents.filter((event) => event.event_name === OPEN_EVENT);
      const resourceEvents = cellEvents.filter(
        (event) => event.event_name === RESOURCE_EVENT,
      );
      const resourceMap = new Map();

      for (const event of resourceEvents) {
        const resourceKey = resourceKeyFor(event);
        const current = resourceMap.get(resourceKey) ?? {
          resourceId: safeResourceId(event.resource_id ?? event.content_id),
          label: readableResourceLabel(event),
          provider: safeProvider(event.provider),
          mediaType: safeMediaType(event.media_type ?? event.content_type),
          count: 0,
          measuredSeconds: 0,
        };
        current.count += 1;
        current.label = preferredLabel(
          current.label,
          readableResourceLabel(event),
        );
        resourceMap.set(resourceKey, current);
      }

      for (const session of cellSessions) {
        if (!session.resource_id) continue;
        const resourceKey = resourceKeyFor(session);
        const current = resourceMap.get(resourceKey) ?? {
          resourceId: safeResourceId(session.resource_id),
          label: readableResourceLabel(session),
          provider: safeProvider(session.provider),
          mediaType: safeMediaType(session.media_type),
          count: 0,
          measuredSeconds: 0,
        };
        current.measuredSeconds += measuredSessionSeconds(session);
        current.label = preferredLabel(
          current.label,
          readableResourceLabel(session),
        );
        resourceMap.set(resourceKey, current);
      }

      const measuredSeconds = cellSessions.reduce(
        (sum, session) => sum + measuredSessionSeconds(session),
        0,
      );

      return {
        pilotDay,
        prayerDate:
          reportsByCell.get(key)?.prayer_date ??
          openEvents[0]?.prayer_date ??
          resourceEvents[0]?.prayer_date ??
          null,
        opened: openEvents.length > 0,
        openCount: openEvents.length,
        resourceEngaged: resourceEvents.length > 0,
        resourceCount: resourceEvents.length,
        resources: [...resourceMap.values()].map((resource) => ({
          resourceId: resource.resourceId,
          label: resource.label,
          provider: resource.provider,
          mediaType: resource.mediaType,
          count: resource.count,
          measuredMinutes: roundMinutes(resource.measuredSeconds),
        })),
        measuredMediaMinutes: roundMinutes(measuredSeconds),
        outcome: reportsByCell.get(key)?.outcome ?? null,
      };
    }),
  }));

  const openedNights = new Set(
    events
      .filter((event) => event.event_name === OPEN_EVENT)
      .map((event) => cellKey(event.devotion_participant_id, event.pilot_day)),
  ).size;
  const measuredSeconds = sessions.reduce(
    (sum, session) => sum + measuredSessionSeconds(session),
    0,
  );
  const nightRollup = Array.from({ length: devotion.duration_days }, (_, index) => {
    const pilotDay = index + 1;
    const dayEvents = events.filter((event) => event.pilot_day === pilotDay);
    const dayReports = reports.filter((report) => report.pilot_day === pilotDay);
    const daySessions = sessions.filter((session) => session.pilot_day === pilotDay);
    const opened = new Set(dayEvents
      .filter((event) => event.event_name === OPEN_EVENT && event.devotion_participant_id)
      .map((event) => event.devotion_participant_id)).size;
    const engaged = new Set(dayEvents
      .filter((event) => event.event_name === RESOURCE_EVENT && event.devotion_participant_id)
      .map((event) => event.devotion_participant_id)).size;
    return {
      night: pilotDay,
      opened,
      engaged,
      reported: dayReports.length,
      measuredMediaMinutes: roundMinutes(daySessions.reduce(
        (sum, session) => sum + measuredSessionSeconds(session),
        0,
      )),
    };
  });

  return {
    devotion: {
      id: devotion.id,
      slug: devotion.slug,
      name: devotion.name,
      organizationLabel: devotion.organization_label,
      description: devotion.description ?? null,
      startDate: devotion.start_date,
      durationDays: devotion.duration_days,
      timezone: devotion.timezone,
      status: devotion.status,
      preSurveyUrl: devotion.pre_survey_url,
      postSurveyUrl: devotion.post_survey_url,
      publishedAt: devotion.published_at ?? null,
      archivedAt: devotion.archived_at ?? null,
    },
    metrics: {
      participantsEnrolled: participants.length,
      participantsActive: participants.filter((participant) => ['enrolled', 'active'].includes(participant.status ?? 'enrolled') && !participant.revoked_at).length,
      participantsCompleted: participants.filter((participant) => participant.status === 'completed').length,
      participantsWithdrawn: participants.filter((participant) => participant.status === 'withdrawn').length,
      nightsOpened: openedNights,
      resourceEngagements: events.filter(
        (event) => event.event_name === RESOURCE_EVENT,
      ).length,
      measuredMediaMinutes: roundMinutes(measuredSeconds),
      reportedPrayed: reports.filter((report) => report.outcome === 'prayed').length,
      reportedPartial: reports.filter(
        (report) => report.outcome === 'started_not_finished',
      ).length,
      reportedNotTonight: reports.filter(
        (report) => report.outcome === 'not_tonight',
      ).length,
    },
    nightRollup,
    participants: rows,
  };
}

function groupByCell(items) {
  const grouped = new Map();
  for (const item of items) {
    const key = cellKey(item.devotion_participant_id, item.pilot_day);
    const current = grouped.get(key) ?? [];
    current.push(item);
    grouped.set(key, current);
  }
  return grouped;
}

function cellKey(participantId, pilotDay) {
  return `${participantId ?? ''}:${pilotDay ?? ''}`;
}

function resourceKeyFor(item) {
  return [
    item.resource_id ?? item.content_id ?? '',
    item.provider ?? '',
    item.media_type ?? item.content_type ?? '',
  ].join('|');
}

function readableResourceLabel(item) {
  const metadataLabel = item.metadata?.resourceLabel;
  if (safeReadableLabel(metadataLabel)) {
    return metadataLabel.trim();
  }
  if (safeReadableLabel(item.source_name)) {
    return item.source_name.trim();
  }

  const identifier = item.resource_id ?? item.content_id ?? '';
  if (safeReadableLabel(identifier) && !looksOpaque(identifier)) {
    return identifier
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  const provider = safeProvider(item.provider);
  const mediaType = safeMediaType(item.media_type ?? item.content_type);
  return `${titleCase(provider)} ${mediaType.replace(/_/g, ' ')}`;
}

function safeReadableLabel(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  return text.length > 0 && text.length <= 120 &&
    /^[\p{L}\p{N}][\p{L}\p{N}\s'’&.,:()—–_-]*$/u.test(text) &&
    !/@|https?:|\?.*=|[A-Za-z0-9_-]{32,}|\b\d{7,}\b/.test(text);
}

function safeResourceId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(value) || looksOpaque(value)) {
    return 'resource';
  }
  return value;
}

function safeProvider(value) {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s._]+/g, '-');
  return SAFE_PROVIDERS.has(normalized) ? normalized : 'unknown';
}

function safeMediaType(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return SAFE_MEDIA_TYPES.has(normalized)
    ? normalized
    : 'unknown';
}

function preferredLabel(current, candidate) {
  return looksGenericLabel(current) && !looksGenericLabel(candidate)
    ? candidate
    : current;
}

function looksGenericLabel(value) {
  return /^(Prayer|Youtube|Spotify|Apple Podcast|Unknown)\b/i.test(value ?? '');
}

function looksOpaque(value) {
  return (
    /^[A-Za-z0-9_-]{11}$/.test(value) ||
    /^\d{6,}$/.test(value) ||
    /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value) ||
    /^https?:\/\//i.test(value)
  );
}

function titleCase(value) {
  return String(value)
    .split(/[-_]/)
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

function measuredSessionSeconds(session) {
  const active = Number(session.active_play_seconds ?? 0);
  const panel = Number(session.panel_open_seconds ?? 0);
  return Math.max(active, panel, 0);
}

function roundMinutes(seconds) {
  return Math.round((seconds / 60) * 10) / 10;
}
