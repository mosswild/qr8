import React from 'react';
import { notFound, redirect } from 'next/navigation';
import getDb from '@/lib/db';
import { fetchVideoMetadata } from '@/lib/youtube/oembed';
import YouTubePlayer from '@/components/player/YouTubePlayer';
import { VideoItem } from '@/components/dashboard/VideoCard';

export const dynamic = 'force-dynamic';

interface PlayerPageProps {
  params: Promise<{ domainId: string }>;
  searchParams: Promise<{ v?: string; playlist?: string }>;
}

export default async function PlayerPage({ params, searchParams }: PlayerPageProps) {
  const { domainId } = await params;
  const { v: youtubeId, playlist: playlistId } = await searchParams;

  const db = getDb();
  const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(domainId) as any;
  if (!domain) {
    notFound();
  }

  if (!youtubeId) {
    // If no video specified, pick the first video from domain or redirect
    const firstVideo = db.prepare('SELECT youtube_id FROM videos WHERE domain_id = ? LIMIT 1').get(domainId) as any;
    if (firstVideo) {
      redirect(`/w/${domainId}/player?v=${firstVideo.youtube_id}`);
    } else {
      redirect(`/w/${domainId}`);
    }
  }

  // Find video in database
  let video = db.prepare('SELECT * FROM videos WHERE domain_id = ? AND youtube_id = ?').get(domainId, youtubeId) as VideoItem | undefined;

  // If not found in DB, fetch oEmbed and insert on-the-fly
  if (!video) {
    const meta = await fetchVideoMetadata(youtubeId);
    const videoId = `vid-${meta.youtubeId}`;
    db.prepare(`
      INSERT INTO videos (
        id, domain_id, youtube_id, title, thumbnail_url, channel_name, source_type, published_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP
      )
      ON CONFLICT(domain_id, youtube_id) DO UPDATE SET
        title = excluded.title
    `).run(videoId, domainId, meta.youtubeId, meta.title, meta.thumbnailUrl, meta.channelName);

    video = db.prepare('SELECT * FROM videos WHERE domain_id = ? AND youtube_id = ?').get(domainId, youtubeId) as VideoItem;
  }

  // If playlist context provided, fetch playlist items
  let playlistVideos: VideoItem[] = [];
  let currentPlaylistIndex = -1;

  if (playlistId) {
    playlistVideos = db.prepare(`
      SELECT v.*, pi.position
      FROM playlist_items pi
      JOIN videos v ON v.id = pi.video_id
      WHERE pi.playlist_id = ?
      ORDER BY pi.position ASC
    `).all(playlistId) as VideoItem[];

    currentPlaylistIndex = playlistVideos.findIndex((v) => v.youtube_id === youtubeId);
  }

  return (
    <YouTubePlayer
      video={video}
      domainId={domain.id}
      domainName={domain.name}
      playlistId={playlistId}
      playlistVideos={playlistVideos}
      currentPlaylistIndex={currentPlaylistIndex}
    />
  );
}
