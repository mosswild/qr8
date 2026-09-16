import { XMLParser } from 'fast-xml-parser';
import getDb from '@/lib/db';

export interface FeedVideo {
  youtubeId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  channelName: string;
  channelId: string;
}

export async function fetchChannelRssFeed(channelId: string): Promise<{
  channelTitle: string;
  videos: FeedVideo[];
}> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; QR8/1.0; +https://github.com/qr8)',
      Accept: 'application/atom+xml, application/xml, text/xml',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed for channel ${channelId}: ${response.status}`);
  }

  const xmlText = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const data = parser.parse(xmlText);

  const feed = data.feed;
  if (!feed) {
    return { channelTitle: 'YouTube Channel', videos: [] };
  }

  const channelTitle = feed.title || 'YouTube Channel';
  const rawEntries = feed.entry
    ? Array.isArray(feed.entry)
      ? feed.entry
      : [feed.entry]
    : [];

  const videos: FeedVideo[] = rawEntries
    .map((entry: any) => {
      const youtubeId = entry['yt:videoId'] || '';
      const title = entry.title || '';
      const publishedAt = entry.published || entry.updated || new Date().toISOString();
      const mediaGroup = entry['media:group'];
      const thumbnailUrl =
        mediaGroup?.['media:thumbnail']?.['@_url'] ||
        `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

      return {
        youtubeId,
        title,
        publishedAt,
        thumbnailUrl,
        channelName: channelTitle,
        channelId,
      };
    })
    .filter((v: FeedVideo) => v.youtubeId.length > 0);

  return { channelTitle, videos };
}

export async function fetchPlaylistRssFeed(playlistId: string): Promise<{
  playlistTitle: string;
  videos: FeedVideo[];
}> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; QR8/1.0; +https://github.com/qr8)',
      Accept: 'application/atom+xml, application/xml, text/xml',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist feed: ${response.status}`);
  }

  const xmlText = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const data = parser.parse(xmlText);

  const feed = data.feed;
  if (!feed) {
    return { playlistTitle: 'YouTube Playlist', videos: [] };
  }

  const playlistTitle = feed.title || 'YouTube Playlist';
  const rawEntries = feed.entry
    ? Array.isArray(feed.entry)
      ? feed.entry
      : [feed.entry]
    : [];

  const videos: FeedVideo[] = rawEntries
    .map((entry: any) => {
      const youtubeId = entry['yt:videoId'] || '';
      const title = entry.title || '';
      const publishedAt = entry.published || entry.updated || new Date().toISOString();
      const mediaGroup = entry['media:group'];
      const thumbnailUrl =
        mediaGroup?.['media:thumbnail']?.['@_url'] ||
        `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
      const channelName = entry.author?.name || playlistTitle;

      return {
        youtubeId,
        title,
        publishedAt,
        thumbnailUrl,
        channelName,
        channelId: '',
      };
    })
    .filter((v: FeedVideo) => v.youtubeId.length > 0);

  return { playlistTitle, videos };
}

export async function syncCreatorFeed(creatorId: string): Promise<{ syncedCount: number }> {
  const db = getDb();
  const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(creatorId) as any;
  if (!creator) throw new Error('Creator not found');

  const { channelTitle, videos } = await fetchChannelRssFeed(creator.channel_id);

  // Update creator channel name and last polled at
  db.prepare(`
    UPDATE creators 
    SET channel_name = ?, last_polled_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(channelTitle, creatorId);

  const insertStmt = db.prepare(`
    INSERT INTO videos (
      id, domain_id, creator_id, youtube_id, title, thumbnail_url, channel_name, source_type, published_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, 'subscription', ?
    )
    ON CONFLICT(domain_id, youtube_id) DO UPDATE SET
      title = excluded.title,
      thumbnail_url = excluded.thumbnail_url
  `);

  let syncedCount = 0;
  const insertMany = db.transaction((items: FeedVideo[]) => {
    for (const item of items) {
      const id = `vid-sub-${item.youtubeId}`;
      insertStmt.run(
        id,
        creator.domain_id,
        creator.id,
        item.youtubeId,
        item.title,
        item.thumbnailUrl,
        channelTitle,
        item.publishedAt
      );
      syncedCount++;
    }
  });

  insertMany(videos);
  return { syncedCount };
}

export async function syncAllCreators(domainId?: string): Promise<{ totalSynced: number }> {
  const db = getDb();
  let creators: any[] = [];
  if (domainId) {
    creators = db.prepare('SELECT id, channel_name FROM creators WHERE domain_id = ?').all(domainId);
  } else {
    creators = db.prepare('SELECT id, channel_name FROM creators').all();
  }

  let totalSynced = 0;
  for (const c of creators) {
    try {
      const res = await syncCreatorFeed(c.id);
      totalSynced += res.syncedCount;
    } catch (err) {
      console.error(`Error syncing feed for creator ${c.id}:`, err);
    }
  }

  return { totalSynced };
}
