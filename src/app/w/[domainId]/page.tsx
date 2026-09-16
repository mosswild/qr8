import React from 'react';
import { notFound } from 'next/navigation';
import getDb from '@/lib/db';
import WorkspaceDeck from '@/components/dashboard/WorkspaceDeck';

export const dynamic = 'force-dynamic';

interface WorkspacePageProps {
  params: Promise<{ domainId: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { domainId } = await params;
  const db = getDb();

  // Find domain
  const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(domainId) as any;
  if (!domain) {
    notFound();
  }

  // All active domains for top switcher
  const allDomains = db.prepare('SELECT id, name, icon, is_archived FROM domains WHERE COALESCE(is_archived, 0) = 0 ORDER BY sort_order ASC').all() as any[];

  // Daily picks (3-5 randomized from curated manual library)
  const dailyVideos = db.prepare(`
    SELECT * FROM videos 
    WHERE domain_id = ? AND source_type = 'manual'
    ORDER BY RANDOM() 
    LIMIT 5
  `).all(domainId) as any[];

  // What's new from subscribed creators
  const whatsNewVideos = db.prepare(`
    SELECT * FROM videos 
    WHERE domain_id = ? AND source_type = 'subscription'
    ORDER BY published_at DESC, created_at DESC
    LIMIT 20
  `).all(domainId) as any[];

  // Recently played history
  const recentVideos = db.prepare(`
    SELECT * FROM videos 
    WHERE domain_id = ? AND last_played_at IS NOT NULL
    ORDER BY last_played_at DESC
    LIMIT 15
  `).all(domainId) as any[];

  // All curated workspace library videos
  const allVideos = db.prepare(`
    SELECT * FROM videos 
    WHERE domain_id = ? AND source_type = 'manual'
    ORDER BY created_at DESC
  `).all(domainId) as any[];

  // Playlists and items
  const playlists = db.prepare(`
    SELECT * FROM playlists 
    WHERE domain_id = ? 
    ORDER BY sort_order ASC, created_at ASC
  `).all(domainId) as any[];

  const getPlaylistItemsStmt = db.prepare(`
    SELECT v.*, pi.position
    FROM playlist_items pi
    JOIN videos v ON v.id = pi.video_id
    WHERE pi.playlist_id = ?
    ORDER BY pi.position ASC
  `);

  const playlistsWithItems = playlists.map((p) => ({
    ...p,
    videos: getPlaylistItemsStmt.all(p.id),
  }));

  // Creators list
  const creators = db.prepare('SELECT * FROM creators WHERE domain_id = ?').all(domainId) as any[];

  return (
    <WorkspaceDeck
      domain={domain}
      allDomains={allDomains}
      initialDailyVideos={dailyVideos}
      initialWhatsNewVideos={whatsNewVideos}
      initialRecentVideos={recentVideos}
      initialAllVideos={allVideos}
      initialPlaylists={playlistsWithItems}
      creatorCount={creators.length}
    />
  );
}
