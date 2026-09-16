import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { parseYouTubeUrl } from '@/lib/youtube/parser';
import { fetchVideoMetadata, resolveChannelFromHandleOrUrl } from '@/lib/youtube/oembed';
import { syncCreatorFeed, fetchPlaylistRssFeed } from '@/lib/youtube/rss';

export async function POST(req: Request) {
  try {
    const { url, domainId } = await req.json();
    if (!url || !domainId) {
      return NextResponse.json({ error: 'URL and domainId are required' }, { status: 400 });
    }

    const db = getDb();
    const domain = db.prepare('SELECT id FROM domains WHERE id = ?').get(domainId);
    if (!domain) {
      return NextResponse.json({ error: 'Workspace domain not found' }, { status: 404 });
    }

    const parsed = parseYouTubeUrl(url);

    if (parsed.type === 'video' && parsed.id) {
      const meta = await fetchVideoMetadata(parsed.id);
      const videoId = `vid-${meta.youtubeId}`;

      const stmt = db.prepare(`
        INSERT INTO videos (
          id, domain_id, youtube_id, title, thumbnail_url, channel_name, source_type, published_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP
        )
        ON CONFLICT(domain_id, youtube_id) DO UPDATE SET
          title = excluded.title,
          thumbnail_url = excluded.thumbnail_url,
          channel_name = excluded.channel_name
      `);

      stmt.run(videoId, domainId, meta.youtubeId, meta.title, meta.thumbnailUrl, meta.channelName);

      const saved = db.prepare('SELECT * FROM videos WHERE domain_id = ? AND youtube_id = ?').get(domainId, meta.youtubeId);

      return NextResponse.json({
        type: 'video',
        video: saved,
        message: `Added "${meta.title}"`,
      });
    }

    if (parsed.type === 'channel') {
      let channelId = parsed.id;
      let channelName = 'YouTube Channel';

      if (!channelId && parsed.channelHandle) {
        const resolved = await resolveChannelFromHandleOrUrl(`@${parsed.channelHandle}`);
        channelId = resolved.channelId;
        channelName = resolved.channelName;
      } else if (!channelId) {
        const resolved = await resolveChannelFromHandleOrUrl(parsed.originalUrl);
        channelId = resolved.channelId;
        channelName = resolved.channelName;
      }

      if (!channelId) {
        return NextResponse.json({ error: 'Could not resolve channel ID' }, { status: 400 });
      }

      const creatorId = `creator-${channelId}`;
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

      db.prepare(`
        INSERT INTO creators (id, domain_id, channel_id, channel_name, rss_feed_url)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          domain_id = excluded.domain_id,
          channel_name = excluded.channel_name
      `).run(creatorId, domainId, channelId, channelName, rssUrl);

      // Trigger immediate initial sync
      let syncedCount = 0;
      try {
        const syncResult = await syncCreatorFeed(creatorId);
        syncedCount = syncResult.syncedCount;
      } catch (syncErr) {
        console.error('Initial RSS feed sync error:', syncErr);
      }

      return NextResponse.json({
        type: 'channel',
        creator: { id: creatorId, channel_id: channelId, channel_name: channelName },
        message: `Subscribed to ${channelName} and imported ${syncedCount} recent uploads`,
      });
    }

    if (parsed.type === 'playlist' && parsed.id) {
      const { playlistTitle, videos } = await fetchPlaylistRssFeed(parsed.id);
      if (videos.length === 0) {
        return NextResponse.json({ error: 'No videos found in this playlist or playlist is private.' }, { status: 400 });
      }

      const playlistId = `pl-${Date.now()}`;
      const nextOrderRow = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM playlists WHERE domain_id = ?').get(domainId) as { next_order: number };
      const sortOrder = nextOrderRow.next_order;

      db.prepare(`
        INSERT INTO playlists (id, domain_id, name, sort_order)
        VALUES (?, ?, ?, ?)
      `).run(playlistId, domainId, playlistTitle, sortOrder);

      const videoInsertStmt = db.prepare(`
        INSERT INTO videos (
          id, domain_id, youtube_id, title, thumbnail_url, channel_name, source_type, published_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, 'manual', ?
        )
        ON CONFLICT(domain_id, youtube_id) DO UPDATE SET
          title = excluded.title,
          thumbnail_url = excluded.thumbnail_url,
          source_type = 'manual'
      `);

      const linkStmt = db.prepare(`
        INSERT OR REPLACE INTO playlist_items (playlist_id, video_id, position)
        VALUES (?, ?, ?)
      `);

      const populatePlaylist = db.transaction(() => {
        let pos = 0;
        for (const item of videos) {
          const videoRecordId = `vid-${item.youtubeId}`;
          videoInsertStmt.run(
            videoRecordId,
            domainId,
            item.youtubeId,
            item.title,
            item.thumbnailUrl,
            item.channelName,
            item.publishedAt
          );

          // Get the actual video id in case conflict hit existing record
          const existing = db.prepare('SELECT id FROM videos WHERE domain_id = ? AND youtube_id = ?').get(domainId, item.youtubeId) as { id: string };
          linkStmt.run(playlistId, existing.id, pos++);
        }
      });

      populatePlaylist();

      return NextResponse.json({
        type: 'playlist',
        playlist: { id: playlistId, name: playlistTitle, video_count: videos.length },
        message: `Imported playlist "${playlistTitle}" with ${videos.length} videos`,
      });
    }

    return NextResponse.json({
      error: 'Unrecognized YouTube URL. Please paste a standard video link, playlist link (playlist?list=...), shorts, or channel handle (@creator).',
    }, { status: 400 });

  } catch (err: any) {
    console.error('Ingest error:', err);
    return NextResponse.json({ error: err.message || 'Ingestion failed' }, { status: 500 });
  }
}
