import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { initRssScheduler } from '@/lib/cron/scheduler';

// Ensure scheduler is active
initRssScheduler();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const archivedParam = searchParams.get('archived');

    const db = getDb();
    
    let whereClause = 'WHERE COALESCE(d.is_archived, 0) = 0';
    if (archivedParam === 'true') {
      whereClause = 'WHERE COALESCE(d.is_archived, 0) = 1';
    } else if (archivedParam === 'all') {
      whereClause = '';
    }

    const domains = db.prepare(`
      SELECT 
        d.id, 
        d.name, 
        d.icon, 
        COALESCE(d.is_archived, 0) as is_archived,
        d.sort_order, 
        d.created_at,
        COUNT(DISTINCT v.id) as video_count,
        COUNT(DISTINCT c.id) as creator_count,
        (SELECT thumbnail_url FROM videos WHERE domain_id = d.id AND thumbnail_url IS NOT NULL ORDER BY RANDOM() LIMIT 1) as thumbnail_url
      FROM domains d
      LEFT JOIN videos v ON v.domain_id = d.id
      LEFT JOIN creators c ON c.domain_id = d.id
      ${whereClause}
      GROUP BY d.id
      ORDER BY d.sort_order ASC, d.created_at ASC
    `).all();

    const archivedCountRow = db.prepare(
      'SELECT COUNT(*) as count FROM domains WHERE COALESCE(is_archived, 0) = 1'
    ).get() as { count: number };

    const activeCountRow = db.prepare(
      'SELECT COUNT(*) as count FROM domains WHERE COALESCE(is_archived, 0) = 0'
    ).get() as { count: number };

    return NextResponse.json({ 
      domains,
      activeCount: activeCountRow?.count || 0,
      archivedCount: archivedCountRow?.count || 0 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, icon } = body;
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Domain name is required' }, { status: 400 });
    }

    const db = getDb();
    // Generate clean slug ID
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'workspace';
    
    let slug = baseSlug;
    let counter = 1;
    while (db.prepare('SELECT id FROM domains WHERE id = ?').get(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    const nextOrderRow = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM domains').get() as { next_order: number };
    const sortOrder = nextOrderRow.next_order;

    db.prepare(`
      INSERT INTO domains (id, name, icon, is_archived, sort_order)
      VALUES (?, ?, ?, 0, ?)
    `).run(slug, name.trim(), icon || '', sortOrder);

    const created = db.prepare('SELECT * FROM domains WHERE id = ?').get(slug);
    return NextResponse.json({ domain: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name, is_archived } = body;

    if (!id) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM domains WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Workspace name cannot be empty' }, { status: 400 });
      }
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (is_archived !== undefined) {
      updates.push('is_archived = ?');
      values.push(is_archived ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE domains SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM domains WHERE id = ?').get(id);
    return NextResponse.json({ domain: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing domain ID' }, { status: 400 });

    const db = getDb();
    db.prepare('DELETE FROM domains WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
