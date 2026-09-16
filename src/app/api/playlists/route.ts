import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domainId = searchParams.get('domainId');
    if (!domainId) {
      return NextResponse.json({ error: 'domainId is required' }, { status: 400 });
    }

    const db = getDb();
    const playlists = db.prepare(`
      SELECT * FROM playlists 
      WHERE domain_id = ? 
      ORDER BY sort_order ASC, created_at ASC
    `).all(domainId) as any[];

    // Fetch items for each playlist
    const getItemsStmt = db.prepare(`
      SELECT v.*, pi.position
      FROM playlist_items pi
      JOIN videos v ON v.id = pi.video_id
      WHERE pi.playlist_id = ?
      ORDER BY pi.position ASC
    `);

    const playlistsWithItems = playlists.map((p) => ({
      ...p,
      videos: getItemsStmt.all(p.id),
    }));

    return NextResponse.json({ playlists: playlistsWithItems });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { domainId, name, videoIds } = body;
    if (!domainId || !name) {
      return NextResponse.json({ error: 'domainId and name are required' }, { status: 400 });
    }

    const db = getDb();
    const id = `pl-${Date.now()}`;
    const nextOrderRow = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM playlists WHERE domain_id = ?').get(domainId) as { next_order: number };

    db.prepare(`
      INSERT INTO playlists (id, domain_id, name, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(id, domainId, name.trim(), nextOrderRow.next_order);

    if (Array.isArray(videoIds) && videoIds.length > 0) {
      const insertItem = db.prepare(`
        INSERT OR IGNORE INTO playlist_items (playlist_id, video_id, position)
        VALUES (?, ?, ?)
      `);
      const getVidStmt = db.prepare('SELECT id FROM videos WHERE id = ? OR youtube_id = ?');
      const insertTx = db.transaction(() => {
        let pos = 0;
        for (const vid of videoIds) {
          const vidRecord = getVidStmt.get(vid, vid) as { id: string } | undefined;
          if (vidRecord) {
            insertItem.run(id, vidRecord.id, pos++);
          }
        }
      });
      insertTx();
    }

    return NextResponse.json({ success: true, playlistId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { action, playlistId, videoId } = body;

    if (!playlistId || !videoId || !action) {
      return NextResponse.json({ error: 'action, playlistId, and videoId are required' }, { status: 400 });
    }

    const db = getDb();

    if (action === 'add_item') {
      const vidRecord = db.prepare('SELECT id FROM videos WHERE id = ? OR youtube_id = ?').get(videoId, videoId) as { id: string } | undefined;
      if (!vidRecord) {
        return NextResponse.json({ error: 'Video not found in workspace' }, { status: 404 });
      }

      const nextPosRow = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM playlist_items WHERE playlist_id = ?').get(playlistId) as { next_pos: number };
      db.prepare(`
        INSERT OR IGNORE INTO playlist_items (playlist_id, video_id, position)
        VALUES (?, ?, ?)
      `).run(playlistId, vidRecord.id, nextPosRow.next_pos);

      return NextResponse.json({ success: true, message: 'Added to playlist' });
    }

    if (action === 'remove_item') {
      const vidRecord = db.prepare('SELECT id FROM videos WHERE id = ? OR youtube_id = ?').get(videoId, videoId) as { id: string } | undefined;
      const actualVidId = vidRecord ? vidRecord.id : videoId;

      db.prepare(`
        DELETE FROM playlist_items 
        WHERE playlist_id = ? AND video_id = ?
      `).run(playlistId, actualVidId);

      return NextResponse.json({ success: true, message: 'Removed from playlist' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const playlistId = searchParams.get('playlistId') || id;
    const videoId = searchParams.get('videoId');

    const db = getDb();

    // If both playlistId and videoId are provided, remove the item from the playlist
    if (playlistId && videoId) {
      const vidRecord = db.prepare('SELECT id FROM videos WHERE id = ? OR youtube_id = ?').get(videoId, videoId) as { id: string } | undefined;
      const actualVidId = vidRecord ? vidRecord.id : videoId;

      db.prepare('DELETE FROM playlist_items WHERE playlist_id = ? AND video_id = ?').run(playlistId, actualVidId);
      return NextResponse.json({ success: true, removed: true });
    }

    if (!id) return NextResponse.json({ error: 'Missing playlist ID' }, { status: 400 });

    db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
