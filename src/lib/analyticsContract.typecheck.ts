// Included by tsconfig.app.json: these assertions make the public emitter
// reject malformed reserved event shapes at compile time.
import { trackAnalyticsEvent } from './prayerAnalytics';

const ids = { devotionId: '00000000-0000-4000-8000-000000000000', devotionParticipantId: '00000000-0000-4000-8000-000000000001' };
trackAnalyticsEvent('devotion_report_submitted', { ...ids, pilotDay: 1, prayerDate: '2026-08-24', metadata: { outcome: 'prayed' } });
trackAnalyticsEvent('devotion_survey_started', { ...ids, resourceId: 'pre-survey', mediaType: 'survey_link', metadata: { surveyKind: 'pre' } });
trackAnalyticsEvent('pwa_install_eligible', { installSurface: 'pwa' });
trackAnalyticsEvent('current_hour_cta_clicked', { acquisitionSource: 'links_page', acquisitionSurface: 'web' });
trackAnalyticsEvent('continuation_opened', { acquisitionSource: 'links_page', acquisitionSurface: 'web', pageContext: 'links_handoff' });
// @ts-expect-error reports require contextual outcome and devotion night.
trackAnalyticsEvent('devotion_report_submitted', {});
// @ts-expect-error survey events cannot omit their kind/resource/media contract.
trackAnalyticsEvent('devotion_survey_clicked', { ...ids });
// @ts-expect-error lifecycle events model the install target separately.
trackAnalyticsEvent('pwa_install_installed', {});
// @ts-expect-error campaign events require canonical source and current surface.
trackAnalyticsEvent('session_started', {});
// @ts-expect-error a continuation cannot invent a direct handoff.
trackAnalyticsEvent('continuation_opened', { acquisitionSource: 'direct', acquisitionSurface: 'web', pageContext: 'links_handoff' });
