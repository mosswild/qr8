import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { resolveAndPersistDurations } from '@/lib/youtube/oembed';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domainId = searchParams.get('domainId');
    const filter = searchParams.get('filter'); // 'daily', 'whats_new', 'recent', 'all'
    const limit = Number(searchParams.get('limit')) || 20;

    if (!domainId) {
      return NextResponse.json({ error: 'domainId parameter is required' }, { status: 400 });
    }

    const db = getDb();
    let videos: any[] = [];

    if (filter === 'daily') {
      // Pick 3-5 randomized videos from this workspace's curated manual library
      videos = db.prepare(`
        SELECT * FROM videos 
        WHERE domain_id = ? AND source_type = 'manual'
        ORDER BY RANDOM() 
        LIMIT 5
      `).all(domainId);
    } else if (filter === 'whats_new') {
      // Latest uploads from creators followed in this workspace
      videos = db.prepare(`
        SELECT * FROM videos 
        WHERE domain_id = ? 
          AND source_type = 'subscription'
          AND creator_id IN (SELECT id FROM creators WHERE domain_id = ?)
        ORDER BY published_at DESC, created_at DESC
        LIMIT ?
      `).all(domainId, domainId, limit);
    } else if (filter === 'recent') {
      // Chronologically sorted by last_played_at
      videos = db.prepare(`
        SELECT * FROM videos 
        WHERE domain_id = ? AND last_played_at IS NOT NULL
        ORDER BY last_played_at DESC
        LIMIT ?
      `).all(domainId, limit);
    } else {
      // Default: curated library videos in domain
      videos = db.prepare(`
        SELECT * FROM videos 
        WHERE domain_id = ? AND source_type = 'manual'
        ORDER BY created_at DESC
        LIMIT ?
      `).all(domainId, limit);
    }

    await resolveAndPersistDurations(videos);

    return NextResponse.json({ videos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { videoId, action, note, duration_seconds } = body;
    if (!videoId || !action) {
      return NextResponse.json({ error: 'videoId and action are required' }, { status: 400 });
    }

    const db = getDb();

    if (action === 'played') {
      db.prepare(`
        UPDATE videos 
        SET last_played_at = CURRENT_TIMESTAMP 
        WHERE id = ? OR youtube_id = ?
      `).run(videoId, videoId);
    } else if (action === 'completed') {
      db.prepare(`
        UPDATE videos 
        SET completion_count = completion_count + 1, 
            last_played_at = CURRENT_TIMESTAMP 
        WHERE id = ? OR youtube_id = ?
      `).run(videoId, videoId);
    } else if (action === 'note') {
      db.prepare(`
        UPDATE videos 
        SET notes = ? 
        WHERE id = ? OR youtube_id = ?
      `).run(note || '', videoId, videoId);
    } else if (action === 'curate') {
      db.prepare(`
        UPDATE videos 
        SET source_type = 'manual' 
        WHERE id = ? OR youtube_id = ?
      `).run(videoId, videoId);
    } else if (action === 'set_duration' && duration_seconds) {
      db.prepare(`
        UPDATE videos 
        SET duration_seconds = ? 
        WHERE id = ? OR youtube_id = ?
      `).run(duration_seconds, videoId, videoId);
    }

    const updated = db.prepare('SELECT * FROM videos WHERE id = ? OR youtube_id = ?').get(videoId, videoId);
    return NextResponse.json({ video: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });

    const db = getDb();
    db.prepare('DELETE FROM videos WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
