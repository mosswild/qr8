'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layers, Play, Trash2, List } from 'lucide-react';
import { VideoItem } from './VideoCard';
import PlaylistDetailsModal from './PlaylistDetailsModal';

export interface PlaylistWithVideos {
  id: string;
  name: string;
  sort_order: number;
  videos: VideoItem[];
}

interface PlaylistCardProps {
  playlist: PlaylistWithVideos;
  domainId: string;
  onDeleted?: (playlistId: string) => void;
  onUpdated?: () => void;
}

export default function PlaylistCard({ playlist, domainId, onDeleted, onUpdated }: PlaylistCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const videoCount = playlist.videos.length;
  const firstVideo = playlist.videos[0];
  const secondVideo = playlist.videos[1];

  const playerUrl = firstVideo
    ? `/w/${domainId}/player?v=${firstVideo.youtube_id}&playlist=${playlist.id}`
    : `/w/${domainId}`;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete playlist "${playlist.name}"? (Constituent videos will remain in workspace)`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/playlists?id=${encodeURIComponent(playlist.id)}`, {
        method: 'DELETE',
      });
      if (res.ok && onDeleted) {
        onDeleted(playlist.id);
      }
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`group relative flex-shrink-0 w-72 sm:w-80 pt-4 ${
        deleting ? 'opacity-30 pointer-events-none' : ''
      }`}
    >
      {/* Stacked Deck Layers Behind Card */}
      {/* Third layer peek */}
      <div className="absolute top-0 inset-x-6 h-10 rounded-xl bg-zinc-800/40 border border-zinc-700/30 transform transition-transform duration-300 group-hover:-translate-y-1.5" />
      {/* Second layer peek */}
      <div className="absolute top-2 inset-x-3 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 shadow-md transform transition-transform duration-300 group-hover:-translate-y-1" />

      {/* Primary Deck Card */}
      <div className="relative rounded-2xl overflow-hidden bg-[#131520] border border-zinc-800/90 group-hover:border-violet-500/50 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-violet-950/20 flex flex-col justify-between">
        {/* Thumbnail Preview Stage */}
        <Link href={playerUrl} className="block relative aspect-video bg-zinc-900 overflow-hidden cursor-pointer">
          {firstVideo ? (
            <img
              src={firstVideo.thumbnail_url || `https://i.ytimg.com/vi/${firstVideo.youtube_id}/hqdefault.jpg`}
              alt={playlist.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-gradient-to-br from-violet-950/20 to-zinc-900">
              <Layers className="w-8 h-8 opacity-40 mb-1" />
              <span className="text-xs text-zinc-500">Empty Playlist</span>
            </div>
          )}

          {/* Dark gradient mask */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#131520] via-black/20 to-transparent" />

          {/* Hover Play Button */}
          {firstVideo && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
          )}

          {/* Stacked Deck Item Count Badge */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-violet-500/30 text-violet-300 text-xs font-semibold shadow-lg">
            <Layers className="w-3.5 h-3.5 text-violet-400" />
            <span>{videoCount} {videoCount === 1 ? 'routine' : 'routines'}</span>
          </div>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="absolute top-2.5 left-2.5 z-20 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-zinc-400 hover:text-rose-400 hover:bg-rose-950/60 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete playlist"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </Link>

        {/* Info Content */}
        <div className="p-4 flex flex-col justify-between">
          <div>
            <Link href={playerUrl} className="block">
              <h4
                className="text-base font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-1 tracking-tight"
                title={playlist.name}
              >
                {playlist.name}
              </h4>
            </Link>
            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
              {firstVideo ? `Starts with: ${firstVideo.title}` : 'No routines queued'}
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-800/60 text-xs">
            <Link
              href={playerUrl}
              className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Deck</span>
            </Link>
            
            <button
              onClick={() => setIsDetailsOpen(true)}
              className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white px-2 py-1 rounded-lg hover:bg-zinc-800/80 transition-colors"
              title="View and remove routines in playlist"
            >
              <List className="w-3.5 h-3.5" />
              <span>Manage ({videoCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Playlist Details & Management Modal */}
      <PlaylistDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        playlist={playlist}
        domainId={domainId}
        onVideosUpdated={onUpdated}
      />
    </div>
  );
}
