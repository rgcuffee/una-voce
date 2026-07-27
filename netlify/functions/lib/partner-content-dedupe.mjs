function normalizeTitle(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function duplicateKey(item) {
  if (!item.prayer_type || !item.prayer_date) {
    return null;
  }

  const title = normalizeTitle(item.title);
  return title
    ? `${item.partner_id}|${item.prayer_date}|${item.prayer_type}|${title}`
    : null;
}

function publishedTime(item) {
  const time = Date.parse(item.published_at);
  return Number.isNaN(time) ? 0 : time;
}

export function hideDuplicateClassifiedItems(items) {
  const winnerByKey = new Map();

  for (const item of items) {
    const key = duplicateKey(item);
    if (!key) {
      continue;
    }

    const winner = winnerByKey.get(key);
    if (!winner || publishedTime(item) > publishedTime(winner)) {
      winnerByKey.set(key, item);
    }
  }

  return items.map((item) => {
    const key = duplicateKey(item);
    if (!key || winnerByKey.get(key) === item) {
      return item;
    }

    return {
      ...item,
      prayer_type: null,
      display_status: 'hidden',
    };
  });
}
