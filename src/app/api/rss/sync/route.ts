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
    db.prepare('DELETE FROM creators WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
