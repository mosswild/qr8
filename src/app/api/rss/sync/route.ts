import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { syncAllCreators } from '@/lib/youtube/rss';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domainId = searchParams.get('domainId');
    const db = getDb();

    let query = 'SELECT * FROM creators';
    const params: any[] = [];
    if (domainId) {
      query += ' WHERE domain_id = ?';
      params.push(domainId);
    }
    query += ' ORDER BY created_at DESC';

    const creators = db.prepare(query).all(...params);
    return NextResponse.json({ creators });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const domainId = body.domainId;

    const result = await syncAllCreators(domainId);
    return NextResponse.json({
      success: true,
      totalSynced: result.totalSynced,
      message: `Synced ${result.totalSynced} creator uploads successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing creator ID' }, { status: 400 });

    const db = getDb();

    // Look up creator first so we can remove uncurated subscription videos in What's New
    const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(id) as any;
    if (creator) {
      // Remove all videos from this creator that are in What's New (source_type = 'subscription').
      // Curated workspace library videos (source_type = 'manual') are preserved.
      db.prepare(`
        DELETE FROM videos 
        WHERE domain_id = ? 
          AND (creator_id = ? OR channel_name = ?)
          AND source_type = 'subscription'
      `).run(creator.domain_id, creator.id, creator.channel_name);

      db.prepare('DELETE FROM creators WHERE id = ?').run(id);
    } else {
      // Creator not found by id, but run fallback cleanup just in case
      db.prepare(`
        DELETE FROM videos 
        WHERE creator_id = ? 
          AND source_type = 'subscription'
      `).run(id);
      db.prepare('DELETE FROM creators WHERE id = ?').run(id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
