import { runYoutubeIngest } from './youtube-ingest.mjs';

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
    '[youtube-ingest] scheduled_started',
    JSON.stringify({ nextRun }),
  );

  const summary = await runYoutubeIngest();

  console.info(
    '[youtube-ingest] scheduled_finished',
    JSON.stringify(summary),
  );
};
