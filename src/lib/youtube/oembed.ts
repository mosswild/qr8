import getDb from '@/lib/db';

export interface VideoMetadata {
  youtubeId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  durationSeconds?: number;
}

export async function fetchVideoDuration(youtubeId: string): Promise<number> {
  // Method 1: YouTubei Player API (Fast JSON, accurate lengthSeconds, ~150ms)
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.00.00',
          },
        },
        videoId: youtubeId,
      }),
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = await res.json();
      const lengthSeconds = data?.videoDetails?.lengthSeconds;
      if (lengthSeconds) {
        const parsed = parseInt(lengthSeconds, 10);
        if (parsed > 0) return parsed;
      }
    }
  } catch (err) {
    // Fall through to watch page fallback
  }

  // Method 2: Watch page HTML scrape fallback
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${youtubeId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const html = await res.text();
      const lengthMatch = html.match(/"lengthSeconds":"([0-9]+)"/);
      if (lengthMatch && lengthMatch[1]) {
        return parseInt(lengthMatch[1], 10);
      }
      const approxMatch = html.match(/"approxDurationMs":"([0-9]+)"/);
      if (approxMatch && approxMatch[1]) {
        return Math.round(parseInt(approxMatch[1], 10) / 1000);
      }
    }
  } catch (err) {
    console.error('Error fetching video duration for', youtubeId, err);
  }
  return 0;
}

export async function fetchVideoMetadata(youtubeId: string): Promise<VideoMetadata> {
  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  const [oembedRes, durationSeconds] = await Promise.all([
    fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QR8/1.0)',
      },
      next: { revalidate: 3600 },
    }).catch(() => null),
    fetchVideoDuration(youtubeId).catch(() => 0),
  ]);

  if (oembedRes && oembedRes.ok) {
    try {
      const data = await oembedRes.json();
      return {
        youtubeId,
        title: data.title || `Video ${youtubeId}`,
        channelName: data.author_name || 'YouTube Creator',
        thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        durationSeconds,
      };
    } catch (err) {
      console.error('oEmbed JSON error:', err);
    }
  }

  // Graceful fallback
  return {
    youtubeId,
    title: `Video (${youtubeId})`,
    channelName: 'Unknown Channel',
    thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    durationSeconds,
  };
}

export async function resolveChannelFromHandleOrUrl(handleOrUrl: string): Promise<{
  channelId: string;
  channelName: string;
}> {
  let targetUrl = handleOrUrl;
  if (!targetUrl.startsWith('http')) {
    if (targetUrl.startsWith('@')) {
      targetUrl = `https://www.youtube.com/${targetUrl}`;
    } else {
      targetUrl = `https://www.youtube.com/@${targetUrl}`;
    }
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (res.ok) {
      const html = await res.text();
      // Match channelId from meta tags or ytInitialData
      const metaMatch = html.match(/itemprop="channelId"\s+content="(UC[a-zA-Z0-9_-]+)"/);
      const rssMatch = html.match(/feeds\/videos\.xml\?channel_id=(UC[a-zA-Z0-9_-]+)/);
      const externalIdMatch = html.match(/"externalId":"(UC[a-zA-Z0-9_-]+)"/);
      const channelId = metaMatch?.[1] || rssMatch?.[1] || externalIdMatch?.[1];

      // Match channel title
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/) ||
                         html.match(/<title>([^<]+)<\/title>/);
      const channelName = titleMatch?.[1]?.replace(' - YouTube', '').trim() || 'YouTube Channel';

      if (channelId) {
        return { channelId, channelName };
      }
    }
  } catch (err) {
    console.error('Failed to resolve channel handle:', handleOrUrl, err);
  }

  throw new Error(`Could not resolve YouTube Channel ID for: ${handleOrUrl}`);
}

export async function resolveAndPersistDurations(videos: any[]): Promise<void> {
  if (!videos || videos.length === 0) return;
  const missing = videos.filter((v) => !v.duration_seconds || v.duration_seconds <= 0);
  if (missing.length === 0) return;

  const uniqueYtIds = Array.from(new Set(missing.map((v) => v.youtube_id).filter(Boolean))) as string[];
  if (uniqueYtIds.length === 0) return;

  try {
    const db = getDb();
    const updateStmt = db.prepare('UPDATE videos SET duration_seconds = ? WHERE youtube_id = ?');

    await Promise.all(
      uniqueYtIds.map(async (ytId) => {
        try {
          const duration = await fetchVideoDuration(ytId);
          if (duration > 0) {
            updateStmt.run(duration, ytId);
            for (const v of videos) {
              if (v.youtube_id === ytId) {
                v.duration_seconds = duration;
              }
            }
          }
        } catch (e) {
          // ignore single video resolution failure
        }
      })
    );
  } catch (err) {
    console.error('Error in resolveAndPersistDurations:', err);
  }
}
