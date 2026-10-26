import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { fetchVideoDuration } from '@/lib/youtube/oembed';

export async function POST(req: Request) {
  try {
    const { youtubeIds } = await req.json();
    if (!Array.isArray(youtubeIds) || youtubeIds.length === 0) {
      return NextResponse.json({ durations: {} });
    }

    const uniqueIds = Array.from(new Set(youtubeIds.filter(Boolean))) as string[];
    const db = getDb();
    const durations: Record<string, number> = {};

    // 1. Check existing in DB
    const placeholders = uniqueIds.map(() => '?').join(',');
    const existingRows = db.prepare(`
      SELECT youtube_id, duration_seconds 
      FROM videos 
      WHERE youtube_id IN (${placeholders}) AND duration_seconds > 0
    `).all(...uniqueIds) as { youtube_id: string; duration_seconds: number }[];

    for (const row of existingRows) {
      durations[row.youtube_id] = row.duration_seconds;
    }

    const needFetch = uniqueIds.filter((id) => !durations[id]);

    if (needFetch.length > 0) {
      const updateStmt = db.prepare('UPDATE videos SET duration_seconds = ? WHERE youtube_id = ?');
      await Promise.all(
        needFetch.map(async (ytId) => {
          try {
            const d = await fetchVideoDuration(ytId);
            if (d > 0) {
              durations[ytId] = d;
              updateStmt.run(d, ytId);
            }
          } catch (e) {
            // ignore individual failure
          }
        })
      );
    }

    return NextResponse.json({ durations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
