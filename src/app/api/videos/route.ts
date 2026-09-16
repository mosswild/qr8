import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

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

    if (filter === 'daily') {
      // Pick 3-5 randomized videos from this workspace's curated manual library
      const videos = db.prepare(`
        SELECT * FROM videos 
        WHERE domain_id = ? AND source_type = 'manual'
        ORDER BY RANDOM() 
        LIMIT 5
      `).all(domainId);
      return NextResponse.json({ videos });
    }

    if (filter === 'whats_new') {
      // Latest uploads from creators followed in this workspace
      const videos = db.prepare(`
        SELECT * FROM videos 
        WHERE domain_id = ? AND source_type = 'subscription'
        ORDER BY published_at DESC, created_at DESC
        LIMIT ?
      `).all(domainId, limit);
      return NextResponse.json({ videos });
    }

    if (filter === 'recent') {
      // Chronologically sorted by last_played_at
      const videos = db.prepare(`
        SELECT * FROM videos 
        WHERE domain_id = ? AND last_played_at IS NOT NULL
        ORDER BY last_played_at DESC
        LIMIT ?
      `).all(domainId, limit);
      return NextResponse.json({ videos });
    }

    // Default: curated library videos in domain
    const videos = db.prepare(`
      SELECT * FROM videos 
      WHERE domain_id = ? AND source_type = 'manual'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(domainId, limit);

    return NextResponse.json({ videos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { videoId, action, note } = body;
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
