import { syncAllCreators } from '@/lib/youtube/rss';

let isPollingStarted = false;
let pollingTimer: NodeJS.Timeout | null = null;

export function initRssScheduler() {
  if (isPollingStarted) return;
  isPollingStarted = true;

  const intervalHours = Number(process.env.RSS_POLL_INTERVAL_HOURS) || 6;
  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(`[QR8 RSS Scheduler] Initialized. Polling every ${intervalHours} hours.`);

  // Trigger one initial check after 30 seconds startup delay
  setTimeout(() => {
    syncAllCreators().catch((err) =>
      console.error('[QR8 RSS Scheduler] Initial sync failed:', err)
    );
  }, 30000);

  // Set recurring interval
  pollingTimer = setInterval(() => {
    console.log('[QR8 RSS Scheduler] Starting scheduled feed synchronization...');
    syncAllCreators()
      .then((res) => console.log(`[QR8 RSS Scheduler] Synced ${res.totalSynced} items.`))
      .catch((err) => console.error('[QR8 RSS Scheduler] Sync failed:', err));
  }, intervalMs);
}
