export function sanitizeAnalyticsPagePath(value) {
  if (typeof value !== 'string' || !value) return value;
  try {
    const url = new URL(value, 'https://analytics.invalid');
    if (url.pathname.startsWith('/devotions/')) {
      url.searchParams.delete('p');
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value.replace(/([?&])p=[^&#]*&?/i, (_match, separator) =>
      separator === '?' ? '?' : '',
    ).replace(/[?&]$/, '');
  }
}

export function sanitizeAnalyticsReferrer(value) {
  if (typeof value !== 'string' || !value) return value;
  try {
    const url = new URL(value);
    if (url.pathname.startsWith('/devotions/')) {
      url.searchParams.delete('p');
    }
    return url.toString();
  } catch {
    return sanitizeAnalyticsPagePath(value);
  }
}

export function sanitizeAnalyticsMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key, value]) =>
        value !== undefined && !isSensitiveMetadataKey(key),
      )
      .map(([key, value]) => [
        key,
        sanitizeMetadataValue(value),
      ]),
  );
}

function sanitizeMetadataValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadataValue(item));
  }
  if (value && typeof value === 'object') {
    return sanitizeAnalyticsMetadata(value);
  }
  if (typeof value === 'string') {
    const withoutDevotionQuery = value.includes('/devotions/')
      ? sanitizeAnalyticsReferrer(value)
      : value;
    return withoutDevotionQuery.replace(
      /(^|[^A-Za-z0-9_-])([A-Za-z0-9_-]{43})(?=$|[^A-Za-z0-9_-])/g,
      '$1[redacted-participant-token]',
    );
  }
  return value;
}

function isSensitiveMetadataKey(key) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized === 'p' || normalized.endsWith('token');
}
