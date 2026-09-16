export interface VideoMetadata {
  youtubeId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
}

export async function fetchVideoMetadata(youtubeId: string): Promise<VideoMetadata> {
  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  try {
    const res = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QR8/1.0)',
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        youtubeId,
        title: data.title || `Video ${youtubeId}`,
        channelName: data.author_name || 'YouTube Creator',
        thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      };
    }
  } catch (err) {
    console.error('oEmbed fetch error for video:', youtubeId, err);
  }

  // Graceful fallback
  return {
    youtubeId,
    title: `Video (${youtubeId})`,
    channelName: 'Unknown Channel',
    thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
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
