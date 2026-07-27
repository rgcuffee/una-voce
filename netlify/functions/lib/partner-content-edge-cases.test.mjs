import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyVideo,
  normalizeVideo,
} from '../youtube-ingest.mjs';
import { hideDuplicateClassifiedItems } from './partner-content-dedupe.mjs';

const laudsRule = {
  include_keywords: ['Morning Prayer', 'Lauds', 'Laudes', 'Morning'],
  exclude_keywords: [],
  prayer_type: 'lauds',
  default_display_status: 'approved',
  default_available_liturgical_seasons: [],
};
const vespersRule = {
  include_keywords: ['Evening Prayer', 'Vespers', 'Evening'],
  exclude_keywords: [],
  prayer_type: 'vespers',
  default_display_status: 'approved',
  default_available_liturgical_seasons: [],
};

function feed(slug) {
  return {
    id: `${slug}-feed`,
    partner_id: `${slug}-partner`,
    expected_content_mode: 'pre_recorded',
    default_available_liturgical_seasons: [],
    partners: { slug },
  };
}

function video(overrides) {
  return {
    youtubeVideoId: 'video-id',
    title: 'Video',
    description: null,
    publishedAt: '2026-07-27T12:00:00.000Z',
    scheduledStartAt: null,
    thumbnailUrl: null,
    canonicalUrl: 'https://www.youtube.com/watch?v=video-id',
    ...overrides,
  };
}

test('Cathaholic standalone Benedictus is hidden instead of approved as Lauds', () => {
  const result = classifyVideo(
    feed('cathaholic-music'),
    video({
      title: 'Gregorian Chant | Benedictus | Tone vi',
      description: 'The Benedictus is sung each day at Lauds (Morning Prayer).',
    }),
    [laudsRule, vespersRule],
  );

  assert.equal(result.prayerType, null);
  assert.equal(result.displayStatus, 'hidden');
});

test('Cathaholic Vespers is classified from its title, not as Lauds', () => {
  const result = classifyVideo(
    feed('cathaholic-music'),
    video({
      title: 'July 27 - Monday Evening Prayer | Divine Office | Vespers',
      description: 'Daily Liturgy of the Hours and Catholic music resources.',
    }),
    [laudsRule, vespersRule],
  );

  assert.equal(result.prayerType, 'vespers');
  assert.equal(result.displayStatus, 'approved');
});

test('a title match outranks conflicting description text and stale approval', () => {
  const result = normalizeVideo(
    feed('sing-the-hours'),
    video({
      title: 'Divine Office | Monday Evening Vespers | July 27, 2026',
      description: 'Morning and evening offices are published daily.',
    }),
    [laudsRule, vespersRule],
    {
      prayerType: 'lauds',
      displayStatus: 'approved',
      availableLiturgicalSeasons: [],
      availableWeekdays: [],
    },
  );

  assert.equal(result.prayer_type, 'vespers');
  assert.equal(result.display_status, 'approved');
});

test('Cantor short-form title is hidden even when the feed uses a watch URL', () => {
  const result = classifyVideo(
    feed('cantor-del-camino'),
    video({ title: 'Laudes de hoy 27 de julio…' }),
    [laudsRule],
  );

  assert.equal(result.prayerType, null);
  assert.equal(result.displayStatus, 'hidden');
});

test('Cantor full office remains approved when its description has hashtags', () => {
  const result = classifyVideo(
    feed('cantor-del-camino'),
    video({
      title:
        '🟢 LAUDES DE HOY · Lunes 27 de Julio · Iglesia Católica · Camino Neocatecumenal',
      description: '#laudes #liturgiadelashoras #oracioncatolica',
    }),
    [laudsRule],
  );

  assert.equal(result.prayerType, 'lauds');
  assert.equal(result.displayStatus, 'approved');
});

test('duplicate podcast editions keep only the newest classified copy visible', () => {
  const common = {
    partner_id: 'divine-office',
    title:
      'July 27th, 2026 - Evening Prayer - Divine Office: Liturgy of the Hours',
    prayer_date: '2026-07-27',
    prayer_type: 'vespers',
    display_status: 'approved',
  };
  const older = {
    ...common,
    guid: 'older',
    published_at: '2026-07-27T01:00:00.000Z',
  };
  const newer = {
    ...common,
    guid: 'newer',
    published_at: '2026-07-27T02:00:00.000Z',
  };

  const [hiddenOlder, visibleNewer] = hideDuplicateClassifiedItems([
    older,
    newer,
  ]);

  assert.equal(hiddenOlder.prayer_type, null);
  assert.equal(hiddenOlder.display_status, 'hidden');
  assert.equal(visibleNewer.prayer_type, 'vespers');
  assert.equal(visibleNewer.display_status, 'approved');
});
