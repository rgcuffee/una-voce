import { runApplePodcastIngest } from './apple-podcast-ingest.mjs';

export const config = {
  schedule: '*/30 * * * *',
};

export default async (request) => {
  let nextRun = null;

  try {
    const body = await request.json();
    nextRun = body?.next_run ?? null;
  } catch {
    nextRun = null;
  }

  console.info(
    '[apple-podcast-ingest] scheduled_started',
    JSON.stringify({ nextRun }),
  );

  const summary = await runApplePodcastIngest();

  console.info(
    '[apple-podcast-ingest] scheduled_finished',
    JSON.stringify(summary),
  );
};
