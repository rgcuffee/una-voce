import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sanitizeAnalyticsMetadata,
  sanitizeAnalyticsPagePath,
  sanitizeAnalyticsReferrer,
} from './analyticsPrivacy.mjs';

test('participant query tokens are removed from analytics paths and referrers', () => {
  const token = 'sensitive-participant-token';
  assert.equal(
    sanitizeAnalyticsPagePath(`/devotions/holy-spirit-mens-ministry/night-prayer?p=${token}&utm_source=sms`),
    '/devotions/holy-spirit-mens-ministry/night-prayer?utm_source=sms',
  );
  assert.equal(
    sanitizeAnalyticsReferrer(`https://unavoce.net/devotions/example?p=${token}`),
    'https://unavoce.net/devotions/example',
  );
});

test('participant token-shaped metadata keys are recursively discarded', () => {
  const token = 'a'.repeat(43);
  assert.deepEqual(
    sanitizeAnalyticsMetadata({
      devotionId: 'safe',
      participantToken: 'secret',
      p: 'secret',
      note: token,
      campaignLink: `https://unavoce.net/devotions/example?p=${token}&utm_source=sms`,
      nested: {
        raw_token: 'secret',
        provider: 'youtube',
        items: [token, { participant_token: 'secret', resourceId: 'video-1' }],
      },
    }),
    {
      devotionId: 'safe',
      note: '[redacted-participant-token]',
      campaignLink: 'https://unavoce.net/devotions/example?utm_source=sms',
      nested: {
        provider: 'youtube',
        items: ['[redacted-participant-token]', { resourceId: 'video-1' }],
      },
    },
  );
});
