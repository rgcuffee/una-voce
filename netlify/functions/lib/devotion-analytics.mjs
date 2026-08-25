import { createHash } from 'node:crypto';
import {
  ANALYTICS_EVENT_NAMES,
  CANONICAL_ACQUISITION_SOURCES,
  CANONICAL_SURFACES,
} from '../../../src/lib/analyticsContract.mjs';

const OPEN_EVENT = 'devotion_page_opened';
const RESOURCE_EVENT = 'devotion_resource_opened';
const ACTIVITY_SESSION_CAP = 40;
const SESSION_TIMELINE_CAP = 20;
const PARTICIPANT_NIGHT_RESOURCE_CAP = 25;
const NIGHT_RESOURCE_CAP = 50;
const PARTICIPANT_RESOURCE_GLOBAL_CAP = 600;
const NIGHT_RESOURCE_GLOBAL_CAP = 400;
const GLOBAL_RESOURCE_PROJECTION_CAP = PARTICIPANT_RESOURCE_GLOBAL_CAP + NIGHT_RESOURCE_GLOBAL_CAP;
const NIGHT_PRAYER_DATE_CAP = 10;
export const DEVOTION_ANALYTICS_PROJECTION_CAPS = Object.freeze({
  activitySessions: ACTIVITY_SESSION_CAP,
  sessionTimeline: SESSION_TIMELINE_CAP,
  participantNightResources: PARTICIPANT_NIGHT_RESOURCE_CAP,
  nightlyResources: NIGHT_RESOURCE_CAP,
  globalResources: GLOBAL_RESOURCE_PROJECTION_CAP,
  participantResourceAllocation: PARTICIPANT_RESOURCE_GLOBAL_CAP,
  nightlyResourceAllocation: NIGHT_RESOURCE_GLOBAL_CAP,
  nightlyPrayerDates: NIGHT_PRAYER_DATE_CAP,
});
const CANONICAL_SOURCE_VALUES = new Set(Object.values(CANONICAL_ACQUISITION_SOURCES));
const CANONICAL_SURFACE_VALUES = new Set(Object.values(CANONICAL_SURFACES));
const SAFE_EVENT_NAMES = new Set(ANALYTICS_EVENT_NAMES);
const SAFE_DEVICE_CLASSES = new Set(['desktop', 'mobile', 'tablet', 'unknown']);
const SAFE_PROVIDERS = new Set([
  'youtube', 'vimeo', 'spotify', 'apple', 'apple-podcasts', 'apple-podcast', 'universalis',
  'divine-office', 'divineoffice', 'external', 'text', 'unknown',
]);
const SAFE_MEDIA_TYPES = new Set([
  'text', 'text_provider', 'audio', 'video', 'live_video', 'external_link', 'survey_link', 'unknown',
]);

export function aggregateDevotionAnalytics({
  devotion,
  participants,
  detailParticipants = participants,
  reports,
  events,
  sessions,
  surveyResponses = [],
  cohorts = [],
  sourceSampling = {},
  sourceReadiness = { survey: true, acquisition: true },
}) {
  events = events.map((event) => ({
    ...event,
    pilot_day: canonicalPilotDay(event.pilot_day, devotion.duration_days),
  }));
  reports = reports.map((report) => ({
    ...report,
    pilot_day: canonicalPilotDay(report.pilot_day, devotion.duration_days),
  }));
  sessions = sessions.map((session) => ({
    ...session,
    pilot_day: canonicalPilotDay(session.pilot_day, devotion.duration_days),
  }));
  const reportsByCell = new Map(
    reports.map((report) => [cellKey(report.participant_id, report.pilot_day), report]),
  );
  const eventsByCell = groupByCell(events);
  const sessionsByCell = groupByCell(sessions);
  const resourceProjectionBudget = createResourceProjectionBudget();

  const rows = detailParticipants.map((participant) => ({
    id: participant.id,
    safeId: safeId(participant.id),
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
          activeValues: [],
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
          activeValues: [],
        };
        current.activeValues.push(session.active_play_seconds);
        current.label = preferredLabel(
          current.label,
          readableResourceLabel(session),
        );
        resourceMap.set(resourceKey, current);
      }

      const measuredDuration = aggregateDurationEvidence(
        cellSessions.map((session) => session.active_play_seconds),
        { sampled: Boolean(sourceSampling.sessions) },
      );
      const resourceRows = stableResourceRows([...resourceMap.values()].map((resource) => {
        const duration = aggregateDurationEvidence(resource.activeValues, {
          sampled: Boolean(sourceSampling.sessions),
        });
        return {
          resourceId: resource.resourceId,
          label: resource.label,
          provider: resource.provider,
          mediaType: resource.mediaType,
          count: resource.count,
          measuredMinutes: duration.seconds === null ? null : roundMinutes(duration.seconds),
          measuredStatus: duration.status,
        };
      }));
      const projectedResources = projectResourceRows(
        resourceRows,
        resourceProjectionBudget,
        'participant',
        PARTICIPANT_NIGHT_RESOURCE_CAP,
      );
      const resourceProjection = projectedResources.status === 'sampled'
        ? {
            resourceEvidenceStatus: 'sampled',
            observedResourceRows: resourceRows.length,
            resourceRowCap: projectedResources.cap,
          }
        : {};
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
        ...resourceProjection,
        resources: projectedResources.rows,
        measuredMediaMinutes: measuredDuration.seconds === null
          ? null
          : roundMinutes(measuredDuration.seconds),
        measuredMediaStatus: measuredDuration.status,
        outcome: reportsByCell.get(key)?.outcome ?? null,
      };
    }),
  }));

  const openedNights = new Set(
    events
      .filter((event) => event.event_name === OPEN_EVENT && event.pilot_day)
      .map((event) => cellKey(event.devotion_participant_id, event.pilot_day)),
  ).size;
  const measuredDuration = aggregateDurationEvidence(
    sessions.filter((session) => session.pilot_day).map((session) => session.active_play_seconds),
    { sampled: Boolean(sourceSampling.sessions) },
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
    const dayDuration = aggregateDurationEvidence(
      daySessions.map((session) => session.active_play_seconds),
      { sampled: Boolean(sourceSampling.sessions) },
    );
    return {
      night: pilotDay,
      opened,
      engaged,
      reported: dayReports.length,
      measuredMediaMinutes: dayDuration.seconds === null ? null : roundMinutes(dayDuration.seconds),
      measuredMediaStatus: dayDuration.status,
      };
  });

  const activity = buildActivityEvidence({
    events,
    sessions,
    participants,
    sourceSampled: Boolean(sourceSampling.events || sourceSampling.sessions),
    acquisitionReady: sourceReadiness.acquisition !== false,
  });
  const research = buildResearchEvidence({
    devotion,
    cohorts,
    participants,
    detailParticipants,
    reports,
    events,
    sessions,
    surveyResponses,
    sourceSampling,
    sourceReadiness,
    resourceProjectionBudget,
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
        (event) => event.event_name === RESOURCE_EVENT && event.pilot_day,
      ).length,
      measuredMediaMinutes: measuredDuration.seconds === null
        ? null
        : roundMinutes(measuredDuration.seconds),
      measuredMediaStatus: measuredDuration.status,
      reportedPrayed: reports.filter((report) => report.pilot_day && report.outcome === 'prayed').length,
      reportedPartial: reports.filter(
        (report) => report.pilot_day && report.outcome === 'started_not_finished',
      ).length,
      reportedNotTonight: reports.filter(
        (report) => report.pilot_day && report.outcome === 'not_tonight',
      ).length,
    },
    activity,
    research,
    resourceProjection: resourceProjectionSummary(resourceProjectionBudget),
    nightRollup,
    participants: rows,
  };
}

export const DEVOTION_FUNNEL_DEFINITIONS = Object.freeze([
  {
    key: 'enrolled',
    label: 'Invited / enrolled',
    rule: 'A stored participant enrollment row for the selected campaign.',
    evidence: 'stored participant row',
  },
  {
    key: 'opened',
    label: 'Opened',
    rule: 'Enrolled, with at least one stored devotion_page_opened event.',
    evidence: 'stored event',
  },
  {
    key: 'engaged',
    label: 'Engaged / prayed',
    rule: 'Opened, with a stored devotion_resource_opened event or a prayed nightly report.',
    evidence: 'stored event or report',
  },
  {
    key: 'returned',
    label: 'Returned',
    rule: 'Engaged, with stored event, report, or player-session evidence on at least two distinct pilot days.',
    evidence: 'deterministic distinct-day derivation',
  },
  {
    key: 'completed',
    label: 'Completed',
    rule: 'Returned, and the participant has explicit stored completed status.',
    evidence: 'stored participant status plus prior stages',
  },
  {
    key: 'continued',
    label: 'Continued',
    rule: 'Completed, with a submitted post survey explicitly answering continued-after-window = yes.',
    evidence: 'stored submitted survey answer plus prior stages',
  },
]);

function buildActivityEvidence({ events, sessions, participants, sourceSampled, acquisitionReady }) {
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const eventsBySession = new Map();
  let ungroupedEventCount = 0;
  for (const event of events) {
    if (!event.session_id) {
      ungroupedEventCount += 1;
      continue;
    }
    const list = eventsBySession.get(event.session_id) ?? [];
    list.push(event);
    eventsBySession.set(event.session_id, list);
  }
  const sessionById = new Map(sessions
    .filter((session) => session.session_id)
    .map((session) => [session.session_id, session]));
  const sessionIds = new Set([...sessionById.keys(), ...eventsBySession.keys()]);
  const rows = [...sessionIds].map((sessionId) => {
    const session = sessionById.get(sessionId) ?? null;
    const sessionEvents = [...(eventsBySession.get(sessionId) ?? [])]
      .sort(compareChronologicalEvidence);
    const participantId = session?.devotion_participant_id
      ?? sessionEvents.find((event) => event.devotion_participant_id)?.devotion_participant_id
      ?? null;
    const participant = participantById.get(participantId) ?? null;
    const startedAt = safeTimestamp(session?.started_at)
      ?? sessionEvents.map((event) => safeTimestamp(event.occurred_at)).find(Boolean)
      ?? null;
    const endedAt = safeTimestamp(session?.ended_at);
    const context = firstValidSessionContext(session, sessionEvents);
    const source = firstCanonicalSource(session, ...sessionEvents);
    const surface = firstCanonicalSurface(session, ...sessionEvents);
    const device = firstSafeDevice(...sessionEvents);
    const timeline = sessionEvents.slice(0, SESSION_TIMELINE_CAP).map((event) =>
      safeActivityEvent(event, { source, surface, device }));
    const validEventTimestamps = sessionEvents.map((event) => safeTimestamp(event.occurred_at)).filter(Boolean);
    const firstEventAt = validEventTimestamps[0] ?? null;
    const lastEventAt = validEventTimestamps.at(-1) ?? null;

    return {
      sessionSafeId: displayIdentifier('session', sessionId),
      participantSafeId: safeId(participantId),
      cohortSafeId: displayIdentifier('cohort', participant?.cohort_id),
      pilotDay: context.pilotDay,
      prayerDate: context.prayerDate,
      startedAt,
      endedAt,
      source,
      surface,
      device,
      resource: safeResourceProjection(session),
      durationMeasures: {
        activePlaySeconds: safeNonNegativeInteger(session?.active_play_seconds),
        panelOpenSeconds: safeNonNegativeInteger(session?.panel_open_seconds),
        elapsedSessionSeconds: elapsedSeconds(startedAt, endedAt),
        observedTimelineSpanSeconds: elapsedSeconds(firstEventAt, lastEventAt),
      },
      prayerCompletionStored: typeof session?.completed === 'boolean' ? session.completed : null,
      sourceOpenedStored: typeof session?.opened_source === 'boolean' ? session.opened_source : null,
      highestProgressStored: safePercent(session?.highest_progress),
      eventCountDerived: sessionEvents.length,
      storedSession: Boolean(session),
      timelineStatus: sessionEvents.length > SESSION_TIMELINE_CAP ? 'sampled' : 'exact',
      timeline,
      fieldSemantics: {
        stored: ['activePlaySeconds', 'panelOpenSeconds', 'prayerCompletion', 'sourceOpened', 'highestProgress'],
        derived: ['elapsedSessionSeconds', 'observedTimelineSpanSeconds', 'eventCount', 'deviceFromEvents'],
      },
    };
  }).sort((left, right) => timestampNumber(right.startedAt) - timestampNumber(left.startedAt));

  const projected = rows.slice(0, ACTIVITY_SESSION_CAP);
  const shownEventCount = projected.reduce((sum, row) => sum + row.timeline.length, 0);
  const projectionTruncated = rows.length > ACTIVITY_SESSION_CAP
    || rows.some((row) => row.timelineStatus === 'sampled');
  return {
    status: sourceSampled || projectionTruncated ? 'sampled' : 'exact',
    attributionStatus: acquisitionReady ? (sourceSampled ? 'sampled' : 'exact') : 'unavailable',
    order: 'sessions newest first; each event timeline oldest first',
    sessionCap: ACTIVITY_SESSION_CAP,
    timelineCap: SESSION_TIMELINE_CAP,
    observedSessionCount: rows.length,
    shownSessionCount: projected.length,
    observedEventCount: events.length,
    shownEventCount,
    eventOnlySessionCount: rows.filter((row) => !row.storedSession).length,
    ungroupedEventCount,
    timelineTruncatedSessionCount: rows.filter((row) => row.timelineStatus === 'sampled').length,
    sessions: projected,
  };
}

function safeActivityEvent(event, fallback) {
  return {
    timestamp: safeTimestamp(event.occurred_at),
    event: SAFE_EVENT_NAMES.has(event.event_name) ? event.event_name : 'unknown',
    participantSafeId: safeId(event.devotion_participant_id),
    pilotDay: safePilotDay(event.pilot_day),
    prayerDate: safeDate(event.prayer_date),
    route: safeRoute(event.page_path),
    source: canonicalSource(event.acquisition_source) ?? fallback.source,
    surface: canonicalSurface(event.acquisition_surface) ?? fallback.surface,
    device: safeDevice(event.device_class) ?? fallback.device,
    resource: safeResourceProjection(event),
    playbackSecondsStored: safeNonNegativeInteger(event.playback_seconds),
    progressPercentStored: safePercent(event.progress_percent),
    evidenceType: 'stored_event',
  };
}

function buildResearchEvidence({
  devotion,
  cohorts,
  participants,
  detailParticipants,
  reports,
  events,
  sessions,
  surveyResponses,
  sourceSampling,
  sourceReadiness,
  resourceProjectionBudget,
}) {
  const evidenceByParticipant = new Map(participants.map((participant) => [participant.id, {
    participant,
    days: new Set(),
    opened: false,
    engaged: false,
  }]));
  for (const event of events) {
    const evidence = evidenceByParticipant.get(event.devotion_participant_id);
    if (!evidence) continue;
    if (event.pilot_day) evidence.days.add(event.pilot_day);
    if (event.event_name === OPEN_EVENT) evidence.opened = true;
    if (event.event_name === RESOURCE_EVENT) evidence.engaged = true;
  }
  for (const report of reports) {
    const evidence = evidenceByParticipant.get(report.participant_id);
    if (!evidence) continue;
    if (report.pilot_day) evidence.days.add(report.pilot_day);
    if (report.outcome === 'prayed') evidence.engaged = true;
  }
  for (const session of sessions) {
    const evidence = evidenceByParticipant.get(session.devotion_participant_id);
    if (evidence && session.pilot_day) evidence.days.add(session.pilot_day);
  }

  const submittedPostByParticipant = new Map(surveyResponses
    .filter((response) => response.phase === 'post' && response.status === 'submitted')
    .map((response) => [response.participant_id, response]));
  const stageMembers = new Map(DEVOTION_FUNNEL_DEFINITIONS.map((definition) => [definition.key, []]));
  const surveyReady = sourceReadiness.survey !== false;
  for (const [participantId, evidence] of evidenceByParticipant) {
    const enrolled = true;
    const opened = enrolled && evidence.opened;
    const engaged = opened && evidence.engaged;
    const returned = engaged && evidence.days.size >= 2;
    const completed = returned && evidence.participant.status === 'completed';
    const continued = surveyReady && completed
      && submittedPostByParticipant.get(participantId)?.answers?.continuedAfterWindow === 'yes';
    for (const [key, value] of Object.entries({ enrolled, opened, engaged, returned, completed, continued })) {
      if (value) stageMembers.get(key).push(safeId(participantId));
    }
  }
  const sampled = (...sources) => sources.some((source) => sourceSampling[source]);
  const stageStatuses = {
    enrolled: sampled('participants') ? 'sampled' : 'exact',
    opened: sampled('participants', 'events') ? 'sampled' : 'exact',
    engaged: sampled('participants', 'events', 'reports') ? 'sampled' : 'exact',
    returned: sampled('participants', 'events', 'reports', 'sessions') ? 'sampled' : 'exact',
    completed: sampled('participants', 'events', 'reports', 'sessions') ? 'sampled' : 'exact',
    continued: !surveyReady
      ? 'unavailable'
      : sampled('participants', 'events', 'reports', 'sessions', 'surveys') ? 'sampled' : 'exact',
  };
  const stageRows = DEVOTION_FUNNEL_DEFINITIONS.map((definition) => {
    const status = stageStatuses[definition.key];
    return {
      ...definition,
      status,
      count: status === 'unavailable' ? null : stageMembers.get(definition.key).length,
      participantSafeIds: status === 'unavailable' ? [] : stageMembers.get(definition.key),
    };
  });
  const rawEvidence = [
    rawEvidenceRow('enrolled', 'Stored enrollment rows', [...evidenceByParticipant.keys()], stageStatuses.enrolled),
    rawEvidenceRow('opened', 'Any stored page-open evidence', [...evidenceByParticipant].filter(([, evidence]) => evidence.opened).map(([id]) => id), stageStatuses.opened),
    rawEvidenceRow('engagedOrPrayed', 'Any stored resource or prayed-report evidence', [...evidenceByParticipant].filter(([, evidence]) => evidence.engaged).map(([id]) => id), stageStatuses.engaged),
    rawEvidenceRow('activityOnMultipleDays', 'Evidence on at least two canonical pilot days', [...evidenceByParticipant].filter(([, evidence]) => evidence.days.size >= 2).map(([id]) => id), stageStatuses.returned),
    rawEvidenceRow('explicitCompletedStatus', 'Explicit stored participant completed status', participants.filter((participant) => participant.status === 'completed').map((participant) => participant.id), sampled('participants') ? 'sampled' : 'exact'),
    rawEvidenceRow('explicitContinuedSurveyYes', 'Submitted post-survey continued-after-window = yes', [...submittedPostByParticipant].filter(([, response]) => response.answers?.continuedAfterWindow === 'yes').map(([id]) => id), surveyReady ? (sampled('surveys') ? 'sampled' : 'exact') : 'unavailable'),
  ];
  const funnel = {
    status: Object.values(stageStatuses).includes('sampled')
      ? 'sampled'
      : Object.values(stageStatuses).includes('unavailable') ? 'unavailable' : 'exact',
    unit: 'distinct selected-campaign participants; stages are deliberately nested',
    stages: stageRows,
    reconciliation: {
      countsMatchDrilldown: stageRows.every((stage) => stage.status === 'unavailable'
        || stage.count === new Set(stage.participantSafeIds).size),
      nested: DEVOTION_FUNNEL_DEFINITIONS.slice(1).every((definition, index) =>
        stageStatuses[definition.key] === 'unavailable'
        || stageStatuses[DEVOTION_FUNNEL_DEFINITIONS[index].key] === 'unavailable'
        ||
        stageMembers.get(definition.key).every((participantId) =>
          stageMembers.get(DEVOTION_FUNNEL_DEFINITIONS[index].key).includes(participantId))),
    },
    rawEvidence,
  };

  const acquisitionReady = sourceReadiness.acquisition !== false;
  const eventEvidenceStatus = sourceSampling.events ? 'sampled' : 'exact';
  return {
    funnel,
    cohorts: cohortResearchRows(cohorts, participants, stageMembers, stageStatuses),
    nights: nightlyResearchRows(
      devotion.duration_days,
      reports,
      events,
      sessions,
      sourceSampling,
      resourceProjectionBudget,
    ),
    participantDays: participantDayRows(
      detailParticipants,
      reports,
      events,
      sessions,
      sourceSampling,
    ),
    survey: surveyResearch(surveyResponses, { ready: surveyReady, sampled: sourceSampling.surveys }),
    acquisitionStatus: acquisitionReady ? eventEvidenceStatus : 'unavailable',
    acquisition: acquisitionReady ? breakdown(events, 'source') : [],
    surfaceStatus: acquisitionReady ? eventEvidenceStatus : 'unavailable',
    surfaces: acquisitionReady ? breakdown(events, 'surface') : [],
    deviceStatus: eventEvidenceStatus,
    devices: breakdown(events, 'device'),
    durationSemantics: {
      activePlaySeconds: 'stored player-active time; the only measure included in measured media totals',
      panelOpenSeconds: 'stored prayer-player panel-open time; displayed separately',
      aggregateStatus: 'exact = every observed value is numeric; partial = known-only lower-bound sum because values are missing or the source is sampled; unavailable = no known value and a null total',
      elapsedSessionSeconds: 'derived wall-clock difference between stored session start and end; displayed separately',
      observedTimelineSpanSeconds: 'derived span between first and last stored event; not page time or media time',
      externalTime: 'unavailable; outbound clicks never imply third-party completion or duration',
    },
  };
}

function cohortResearchRows(cohorts, participants, stageMembers, stageStatuses) {
  return cohorts.map((cohort) => {
    const ids = participants
      .filter((participant) => participant.cohort_id === cohort.id)
      .map((participant) => safeId(participant.id));
    return {
      cohortSafeId: displayIdentifier('cohort', cohort.id),
      name: safeReadableLabel(cohort.name) ? cohort.name.trim() : 'Cohort',
      participants: ids.length,
      stages: Object.fromEntries([...stageMembers].map(([key, members]) => [
        key,
        stageStatuses[key] === 'unavailable'
          ? null
          : members.filter((participantId) => ids.includes(participantId)).length,
      ])),
    };
  });
}

function nightlyResearchRows(
  durationDays,
  reports,
  events,
  sessions,
  sourceSampling,
  resourceProjectionBudget,
) {
  return Array.from({ length: durationDays }, (_, index) => {
    const pilotDay = index + 1;
    const dayReports = reports.filter((report) => report.pilot_day === pilotDay);
    const dayEvents = events.filter((event) => event.pilot_day === pilotDay);
    const daySessions = sessions.filter((session) => session.pilot_day === pilotDay);
    const resourceRows = aggregateResources(dayEvents, daySessions, {
      sampled: Boolean(sourceSampling.sessions),
    });
    const projectedResources = projectResourceRows(
      resourceRows,
      resourceProjectionBudget,
      'night',
      NIGHT_RESOURCE_CAP,
    );
    const prayerDates = [...new Set([
      ...dayReports.map((report) => safeDate(report.prayer_date)),
      ...dayEvents.map((event) => safeDate(event.prayer_date)),
      ...daySessions.map((session) => safeDate(session.prayer_date)),
    ].filter(Boolean))].sort();
    const activeDuration = aggregateDurationEvidence(
      daySessions.map((session) => session.active_play_seconds),
      { sampled: Boolean(sourceSampling.sessions) },
    );
    const panelDuration = aggregateDurationEvidence(
      daySessions.map((session) => session.panel_open_seconds),
      { sampled: Boolean(sourceSampling.sessions) },
    );
    return {
      pilotDay,
      prayerDates: prayerDates.slice(0, NIGHT_PRAYER_DATE_CAP),
      prayerDateStatus: prayerDates.length > NIGHT_PRAYER_DATE_CAP ? 'sampled' : 'exact',
      observedPrayerDates: prayerDates.length,
      prayerDateCap: NIGHT_PRAYER_DATE_CAP,
      openedParticipants: distinctParticipantCount(dayEvents.filter((event) => event.event_name === OPEN_EVENT)),
      resourceParticipants: distinctParticipantCount(dayEvents.filter((event) => event.event_name === RESOURCE_EVENT)),
      reportOutcomes: {
        prayed: dayReports.filter((report) => report.outcome === 'prayed').length,
        startedNotFinished: dayReports.filter((report) => report.outcome === 'started_not_finished').length,
        notTonight: dayReports.filter((report) => report.outcome === 'not_tonight').length,
      },
      activePlayMinutes: activeDuration.seconds === null ? null : roundMinutes(activeDuration.seconds),
      activePlayStatus: activeDuration.status,
      panelOpenMinutes: panelDuration.seconds === null ? null : roundMinutes(panelDuration.seconds),
      panelOpenStatus: panelDuration.status,
      resourceEvidenceStatus: projectedResources.status,
      observedResourceRows: resourceRows.length,
      resourceRowCap: projectedResources.cap,
      resources: projectedResources.rows,
    };
  });
}

function participantDayRows(detailParticipants, reports, events, sessions, sourceSampling) {
  const detailIds = new Set(detailParticipants.map((participant) => participant.id));
  const groupedReports = groupParticipantEvidence(
    reports,
    (report) => report.participant_id,
    detailIds,
  );
  const groupedEvents = groupParticipantEvidence(
    events,
    (event) => event.devotion_participant_id,
    detailIds,
  );
  const groupedSessions = groupParticipantEvidence(
    sessions,
    (session) => session.devotion_participant_id,
    detailIds,
  );
  return detailParticipants.flatMap((participant) => {
    const participantReports = groupedReports.get(participant.id) ?? [];
    const participantEvents = groupedEvents.get(participant.id) ?? [];
    const participantSessions = groupedSessions.get(participant.id) ?? [];
    const days = new Set([
      ...participantReports.map((report) => report.pilot_day),
      ...participantEvents.map((event) => event.pilot_day),
      ...participantSessions.map((session) => session.pilot_day),
    ].filter(Boolean));
    return [...days].sort((left, right) => left - right).map((pilotDay) => {
      const dayEvents = participantEvents.filter((event) => event.pilot_day === pilotDay);
      const daySessions = participantSessions.filter((session) => session.pilot_day === pilotDay);
      const report = participantReports.find((item) => item.pilot_day === pilotDay);
      const activeDuration = aggregateDurationEvidence(
        daySessions.map((session) => session.active_play_seconds),
        { sampled: Boolean(sourceSampling.sessions) },
      );
      const panelDuration = aggregateDurationEvidence(
        daySessions.map((session) => session.panel_open_seconds),
        { sampled: Boolean(sourceSampling.sessions) },
      );
      return {
        participantSafeId: safeId(participant.id),
        cohortSafeId: displayIdentifier('cohort', participant.cohort_id),
        pilotDay,
        prayerDate: [report, ...dayEvents, ...daySessions]
          .map((item) => safeDate(item?.prayer_date)).find(Boolean) ?? null,
        openedStored: dayEvents.some((event) => event.event_name === OPEN_EVENT),
        resourceClickCountStored: dayEvents.filter((event) => event.event_name === RESOURCE_EVENT).length,
        reportOutcomeStored: report?.outcome ?? null,
        activePlaySecondsStored: activeDuration.seconds,
        activePlayStatus: activeDuration.status,
        panelOpenSecondsStored: panelDuration.seconds,
        panelOpenStatus: panelDuration.status,
        sources: [...new Set(dayEvents.map((event) => canonicalSource(event.acquisition_source)).filter(Boolean))],
        surfaces: [...new Set(dayEvents.map((event) => canonicalSurface(event.acquisition_surface)).filter(Boolean))],
      };
    });
  });
}

function groupParticipantEvidence(items, participantId, allowedIds) {
  const grouped = new Map();
  for (const item of items) {
    const id = participantId(item);
    if (!allowedIds.has(id)) continue;
    const rows = grouped.get(id) ?? [];
    rows.push(item);
    grouped.set(id, rows);
  }
  return grouped;
}

function surveyResearch(responses, { ready, sampled }) {
  const completionRule = 'Only status=submitted rows count as complete; click/start events and partial rows never count.';
  if (!ready) {
    const unavailableComparison = {
      status: 'unavailable', pairedParticipants: null, preAverage: null, postAverage: null, change: null,
    };
    return {
      status: 'unavailable',
      completionRule,
      pre: null,
      post: null,
      pairedSubmittedParticipants: null,
      comparisons: {
        hourConfidence: unavailableComparison,
        continueLikelihood: unavailableComparison,
      },
      continuedAfterWindow: null,
    };
  }
  const submitted = responses.filter((response) => response.status === 'submitted');
  const partial = responses.filter((response) => response.status === 'partial');
  const submittedByPhase = (phase) => submitted.filter((response) => response.phase === phase);
  const partialByPhase = (phase) => partial.filter((response) => response.phase === phase);
  const preByParticipant = new Map(submittedByPhase('pre').map((response) => [response.participant_id, response]));
  const postByParticipant = new Map(submittedByPhase('post').map((response) => [response.participant_id, response]));
  const pairedIds = [...preByParticipant.keys()].filter((participantId) => postByParticipant.has(participantId));
  const comparison = (field) => {
    const pairs = pairedIds.map((participantId) => [
      preByParticipant.get(participantId)?.answers?.[field],
      postByParticipant.get(participantId)?.answers?.[field],
    ]).filter(([pre, post]) => Number.isFinite(pre) && Number.isFinite(post));
    const preAverage = average(pairs.map(([pre]) => pre));
    const postAverage = average(pairs.map(([, post]) => post));
    return {
      status: sampled ? 'sampled' : 'exact',
      pairedParticipants: pairs.length,
      preAverage,
      postAverage,
      change: preAverage === null || postAverage === null
        ? null
        : Math.round((postAverage - preAverage) * 10) / 10,
    };
  };
  const continued = submittedByPhase('post').map((response) => response.answers?.continuedAfterWindow);
  return {
    status: sampled ? 'sampled' : 'exact',
    completionRule,
    pre: { partial: partialByPhase('pre').length, submitted: submittedByPhase('pre').length },
    post: { partial: partialByPhase('post').length, submitted: submittedByPhase('post').length },
    pairedSubmittedParticipants: pairedIds.length,
    comparisons: {
      hourConfidence: comparison('hourConfidence'),
      continueLikelihood: comparison('continueLikelihood'),
    },
    continuedAfterWindow: {
      yes: continued.filter((value) => value === 'yes').length,
      no: continued.filter((value) => value === 'no').length,
      notSure: continued.filter((value) => value === 'not_sure').length,
      notApplicable: continued.filter((value) => value === 'not_applicable').length,
      unanswered: continued.filter((value) => !value).length,
    },
  };
}

function breakdown(events, kind) {
  const values = kind === 'source'
    ? [...CANONICAL_SOURCE_VALUES]
    : kind === 'surface'
      ? [...CANONICAL_SURFACE_VALUES]
      : [...SAFE_DEVICE_CLASSES];
  return values.map((value) => {
    const matching = events.filter((event) => {
      const projected = kind === 'source'
        ? canonicalSource(event.acquisition_source) ?? 'unknown'
        : kind === 'surface'
          ? canonicalSurface(event.acquisition_surface)
          : safeDevice(event.device_class) ?? 'unknown';
      return projected === value;
    });
    return {
      value,
      storedEventCount: matching.length,
      participants: distinctParticipantCount(matching),
    };
  }).filter((row) => row.storedEventCount > 0);
}

function aggregateResources(events, sessions, { sampled = false } = {}) {
  const grouped = new Map();
  for (const event of events.filter((item) => item.event_name === RESOURCE_EVENT)) {
    const resource = safeResourceProjection(event);
    if (!resource) continue;
    const key = `${resource.resourceId}|${resource.provider}|${resource.mediaType}`;
    const current = grouped.get(key) ?? {
      ...resource,
      clickCount: 0,
      activeValues: [],
      panelValues: [],
    };
    current.clickCount += 1;
    grouped.set(key, current);
  }
  for (const session of sessions) {
    const resource = safeResourceProjection(session);
    if (!resource) continue;
    const key = `${resource.resourceId}|${resource.provider}|${resource.mediaType}`;
    const current = grouped.get(key) ?? {
      ...resource,
      clickCount: 0,
      activeValues: [],
      panelValues: [],
    };
    current.activeValues.push(session.active_play_seconds);
    current.panelValues.push(session.panel_open_seconds);
    grouped.set(key, current);
  }
  return stableResourceRows([...grouped.values()].map((resource) => {
    const activeDuration = aggregateDurationEvidence(resource.activeValues, { sampled });
    const panelDuration = aggregateDurationEvidence(resource.panelValues, { sampled });
    return {
      resourceId: resource.resourceId,
      label: resource.label,
      provider: resource.provider,
      mediaType: resource.mediaType,
      clickCount: resource.clickCount,
      activePlayMinutes: activeDuration.seconds === null ? null : roundMinutes(activeDuration.seconds),
      activePlayStatus: activeDuration.status,
      panelOpenMinutes: panelDuration.seconds === null ? null : roundMinutes(panelDuration.seconds),
      panelOpenStatus: panelDuration.status,
    };
  }));
}

function createResourceProjectionBudget() {
  return {
    participant: { cap: PARTICIPANT_RESOURCE_GLOBAL_CAP, remaining: PARTICIPANT_RESOURCE_GLOBAL_CAP },
    night: { cap: NIGHT_RESOURCE_GLOBAL_CAP, remaining: NIGHT_RESOURCE_GLOBAL_CAP },
    observed: 0,
    shown: 0,
  };
}

function projectResourceRows(rows, budget, surface, localCap) {
  const allocation = budget[surface];
  const cap = Math.min(localCap, allocation.remaining);
  const projected = rows.slice(0, cap);
  allocation.remaining -= projected.length;
  budget.observed += rows.length;
  budget.shown += projected.length;
  return {
    rows: projected,
    cap,
    status: projected.length < rows.length ? 'sampled' : 'exact',
  };
}

function resourceProjectionSummary(budget) {
  return {
    status: budget.shown < budget.observed ? 'sampled' : 'exact',
    observedRows: budget.observed,
    shownRows: budget.shown,
    globalCap: GLOBAL_RESOURCE_PROJECTION_CAP,
    participantNightAllocation: PARTICIPANT_RESOURCE_GLOBAL_CAP,
    nightlyAllocation: NIGHT_RESOURCE_GLOBAL_CAP,
    order: 'participant detail order, then pilot day and resource key; nightly pilot day, then resource key',
  };
}

function stableResourceRows(rows) {
  return rows.sort((left, right) => {
    const leftKey = `${left.resourceId}\u0000${left.provider}\u0000${left.mediaType}\u0000${left.label}`;
    const rightKey = `${right.resourceId}\u0000${right.provider}\u0000${right.mediaType}\u0000${right.label}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}

export function aggregateDurationEvidence(values, { sampled = false } = {}) {
  const observedValues = Array.isArray(values) ? values : [];
  const knownValues = observedValues
    .map((value) => safeNonNegativeInteger(value))
    .filter((value) => value !== null);
  if (knownValues.length === 0) {
    return {
      seconds: null,
      status: 'unavailable',
      observedValues: observedValues.length,
      knownValues: 0,
    };
  }
  return {
    seconds: knownValues.reduce((sum, value) => sum + value, 0),
    status: sampled || knownValues.length < observedValues.length ? 'partial' : 'exact',
    observedValues: observedValues.length,
    knownValues: knownValues.length,
  };
}

function distinctParticipantCount(items) {
  return new Set(items.map((item) => item.devotion_participant_id ?? item.participant_id).filter(Boolean)).size;
}

function safeResourceProjection(item) {
  if (!item || !(item.resource_id || item.content_id || item.source_name || item.provider || item.media_type || item.content_type)) {
    return null;
  }
  return {
    resourceId: safeResourceId(item.resource_id ?? item.content_id),
    label: readableResourceLabel(item),
    provider: safeProvider(item.provider),
    mediaType: safeMediaType(item.media_type ?? item.content_type),
  };
}

function displayIdentifier(kind, value) {
  return value
    ? `${kind}-${createHash('sha256').update(String(value)).digest('hex').slice(0, 10)}`
    : null;
}

function safeId(value) {
  return displayIdentifier('participant', value);
}

function firstValidSessionContext(session, events) {
  for (const item of [session]) {
    const pilotDay = safePilotDay(item?.pilot_day);
    const prayerDate = safeDate(item?.prayer_date);
    if (pilotDay && prayerDate) return { pilotDay, prayerDate };
  }
  for (const item of events) {
    if (!safeTimestamp(item?.occurred_at)) continue;
    const pilotDay = safePilotDay(item?.pilot_day);
    const prayerDate = safeDate(item?.prayer_date);
    if (pilotDay && prayerDate) return { pilotDay, prayerDate };
  }
  return { pilotDay: null, prayerDate: null };
}

function compareChronologicalEvidence(left, right) {
  const leftTimestamp = safeTimestamp(left?.occurred_at);
  const rightTimestamp = safeTimestamp(right?.occurred_at);
  if (!leftTimestamp && !rightTimestamp) return 0;
  if (!leftTimestamp) return 1;
  if (!rightTimestamp) return -1;
  return Date.parse(leftTimestamp) - Date.parse(rightTimestamp);
}

function rawEvidenceRow(key, label, participantIds, status) {
  const participantSafeIds = status === 'unavailable'
    ? []
    : [...new Set(participantIds.map(safeId).filter(Boolean))];
  return {
    key,
    label,
    status,
    count: status === 'unavailable' ? null : participantSafeIds.length,
    participantSafeIds,
  };
}

function firstCanonicalSource(...items) {
  const values = items.map((item) => canonicalSource(item?.acquisition_source)).filter(Boolean);
  return values.find((value) => value !== 'unknown') ?? values[0] ?? 'unknown';
}

function firstCanonicalSurface(...items) {
  return items.map((item) => canonicalSurface(item?.acquisition_surface)).find(Boolean) ?? 'unknown';
}

function firstSafeDevice(...items) {
  return items.map((item) => safeDevice(item?.device_class)).find(Boolean) ?? 'unknown';
}

function canonicalSource(value) {
  return CANONICAL_SOURCE_VALUES.has(value) ? value : null;
}

function canonicalSurface(value) {
  return CANONICAL_SURFACE_VALUES.has(value) ? value : null;
}

function safeDevice(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return SAFE_DEVICE_CLASSES.has(normalized) ? normalized : null;
}

function safeRoute(value) {
  if (typeof value !== 'string' || value.length > 2_048) return null;
  try {
    const url = new URL(value, 'https://una-voce.invalid');
    const path = decodeURIComponent(url.pathname);
    if (!path.startsWith('/') || path.length > 200 || /[\u0000-\u001f\u007f@%]/.test(path)) return null;
    const segments = path.split('/').filter(Boolean);
    if (segments.some((segment) => isSensitiveOrOpaqueValue(segment))) return null;
    return path;
  } catch {
    return null;
  }
}

function safeTimestamp(value) {
  if (typeof value !== 'string'
    || value.length > 35
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || !Number.isFinite(Date.parse(value))) return null;
  return value;
}

function timestampNumber(value) {
  const timestamp = Date.parse(value ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function safeDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}

function canonicalPilotDay(value, durationDays) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value.trim()))) return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= durationDays ? numeric : null;
}

function safePilotDay(value) {
  return canonicalPilotDay(value, 40);
}

function safeNonNegativeInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value.trim()))) return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : null;
}

function safePercent(value) {
  const numeric = safeNonNegativeInteger(value);
  return numeric !== null && numeric <= 100 ? numeric : null;
}

function elapsedSeconds(start, end) {
  if (!start || !end) return null;
  const difference = Math.floor((Date.parse(end) - Date.parse(start)) / 1_000);
  return Number.isFinite(difference) && difference >= 0 && difference <= 7 * 86_400
    ? difference
    : null;
}

function average(values) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
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
    !isSensitiveOrOpaqueValue(text);
}

function safeResourceId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(value) || isSensitiveOrOpaqueValue(value)) {
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
  return isSensitiveOrOpaqueValue(value);
}

export function isSensitiveOrOpaqueValue(value) {
  if (typeof value !== 'string') return true;
  const text = value.trim();
  if (!text || text.length > 160 || /[\u0000-\u001f\u007f]/.test(text)) return true;
  if (/@|(?:https?:\/\/|www\.)|[?&#=]/i.test(text)) return true;
  if (/(?:^|[^A-Za-z0-9])(?:bearer|token|secret|password|passcode|authorization|credential|auth|api[_-]?key|private[_-]?key|access[_-]?key|sk_(?:live|test)|invite|reset)(?:[^A-Za-z0-9]|$)/i.test(text)) return true;
  if (/(?:^|[^A-Za-z0-9])(?:[Bb]earer|[Aa]uthorization|[Tt]oken|[Ss]ecret|[Pp]assword|[Pp]asscode|[Cc]redential|[Aa]uth)(?:[A-Z0-9][A-Za-z0-9]*)/.test(text)) return true;
  if (/(?:^|[^A-Za-z0-9])(?:reset|invite)(?:Token|Secret|Key)(?:[A-Z0-9][A-Za-z0-9]*)?/.test(text)) return true;
  if (/(?:^|[^A-Za-z0-9])(?:api|client|private|access)(?:Key|Secret|Token)(?:[A-Z0-9][A-Za-z0-9]*)?/.test(text)) return true;
  if (/(?:^|[^A-Za-z0-9])(?:BEARER|AUTHORIZATION|TOKEN|SECRET|PASSWORD|PASSCODE|CREDENTIAL|AUTH)[A-Z0-9]+(?:$|[^a-z])/.test(text)) return true;
  if (hasNormalizedCredentialConstruction(text)) return true;
  if (/(?:^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?:$|[^A-Za-z0-9_-])/.test(text)) return true;
  if (/(?:^|[^0-9a-f])[0-9a-f]{64}(?:$|[^0-9a-f])/i.test(text)) return true;
  if (/(?:^|[^0-9a-f])[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:$|[^0-9a-f])/i.test(text)) return true;
  if (/[A-Za-z0-9_-]{32,}/.test(text)) return true;
  if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(text)) return true;
  if (/^\d{1,6}\s+[\p{L}\p{N}.' -]+\b(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|way)\b/iu.test(text)) return true;
  const digits = text.replace(/\D/g, '');
  if (digits.length >= 7 && /(?:^|[^A-Za-z])\+?\d[\d\s().-]{5,}\d(?:$|[^A-Za-z])/.test(text)) return true;
  const words = text.split(/\s+/);
  const safeLabelTerms = /\b(?:prayer|office|hours?|compline|lauds|vespers|matins|universalis|spotify|apple|youtube|vimeo|night|morning|evening|divine|reading|rosary|scripture|survey|audio|video|text|resource|reflection|meditation|holy|spirit|ministry|church|parish|cohort|group|team|general|pilot|adults?|youth)\b/i;
  if (words.length >= 2 && words.length <= 4
    && words.every((word) => /^\p{Lu}[\p{L}'’.-]*$/u.test(word))
    && !safeLabelTerms.test(text)) return true;
  return false;
}

function hasNormalizedCredentialConstruction(value) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalized) return false;
  if (/^bearer[a-z0-9]{4,}$/.test(normalized)) return true;
  if (/^authorization(?:(?:bearer|basic|token|secret|credential|password|key|value|code)[a-z0-9]*|[a-z]*\d[a-z0-9]*)$/.test(normalized)) return true;
  if (/^token(?!ization)(?:(?:value|secret|key|code|id|credential|password)[a-z0-9]*|[a-z]*\d[a-z0-9]*)$/.test(normalized)) return true;
  if (/^secret(?:(?:value|token|key|code|credential|password)[a-z0-9]*|[a-z]*\d[a-z0-9]*)$/.test(normalized)) return true;
  if (/^(?:reset|invite)(?:token|secret|key|code)(?:[a-z0-9]+)?$/.test(normalized)) return true;
  if (/^(?:api|client|private|access)(?:key|secret|token|credential|password)(?:value|id|code|[a-z0-9]*)$/.test(normalized)) return true;
  if (/^sk(?:live|test)[a-z0-9]+$/.test(normalized)) return true;
  return false;
}

function titleCase(value) {
  return String(value)
    .split(/[-_]/)
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

function roundMinutes(seconds) {
  return Math.round((seconds / 60) * 10) / 10;
}
