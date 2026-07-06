import { runSpotifyIngest } from './spotify-ingest.mjs';

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
    '[spotify-ingest] scheduled_started',
    JSON.stringify({ nextRun }),
  );

  const summary = await runSpotifyIngest();

  console.info(
    '[spotify-ingest] scheduled_finished',
    JSON.stringify(summary),
  );
};
