'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Play, CheckCircle2, MoreVertical, Trash2, ExternalLink, Rss, Plus, Check, ListPlus, FolderMinus } from 'lucide-react';
import AddToPlaylistModal from './AddToPlaylistModal';
import { apiFetch } from '@/lib/api';

export interface VideoItem {
  id: string;
  domain_id: string;
  youtube_id: string;
  title: string;
  thumbnail_url: string;
  channel_name: string;
  source_type: 'manual' | 'subscription';
  completion_count: number;
  published_at?: string;
  last_played_at?: string;
  notes?: string;
}

interface VideoCardProps {
  video: VideoItem;
  domainId: string;
  onDeleted?: (videoId: string) => void;
  onCurated?: (videoId: string) => void;
  onPlaylistUpdated?: () => void;
  playlistContext?: string;
}

export default function VideoCard({
  video,
  domainId,
  onDeleted,
  onCurated,
  onPlaylistUpdated,
  playlistContext,
}: VideoCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [curating, setCurating] = useState(false);
  const [curated, setCurated] = useState(video.source_type === 'manual');
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const playerUrl = playlistContext
    ? `/w/${domainId}/player?v=${video.youtube_id}&playlist=${playlistContext}`
    : `/w/${domainId}/player?v=${video.youtube_id}`;

  const handleCurate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurating(true);
    try {
      const res = await apiFetch('/api/videos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, action: 'curate' }),
      });
      if (res.ok) {
        setCurated(true);
        if (onCurated) onCurated(video.id);
      }
    } catch (err) {
      console.error('Curate error:', err);
    } finally {
      setCurating(false);
      setMenuOpen(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Remove "${video.title}" from this workspace?`)) return;

    setDeleting(true);
    try {
      const res = await apiFetch(`/api/videos?id=${encodeURIComponent(video.id)}`, {
        method: 'DELETE',
      });
      if (res.ok && onDeleted) {
        onDeleted(video.id);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  };

  const handleRemoveFromPlaylist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    if (!playlistContext) return;
    if (!confirm(`Remove "${video.title}" from this playlist?`)) return;

    try {
      const res = await apiFetch('/api/playlists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_item',
          playlistId: playlistContext,
          videoId: video.id,
        }),
      });
      if (res.ok && onDeleted) {
        onDeleted(video.id);
      }
    } catch (err) {
      console.error('Failed to remove from playlist:', err);
    }
  };

  return (
    <div className={`group relative flex-shrink-0 w-72 sm:w-80 rounded-xl overflow-hidden bg-[#13151f] border border-zinc-800/60 hover:border-indigo-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${deleting ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Thumbnail Container */}
      <Link href={playerUrl} className="block relative aspect-video bg-zinc-900 overflow-hidden cursor-pointer">
        <img
          src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`;
          }}
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Source Badge */}
        {!curated && video.source_type === 'subscription' ? (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md text-[11px] font-medium text-amber-300 border border-amber-500/30">
            <Rss className="w-3 h-3 text-amber-400" />
            <span>Feed Inbox</span>
          </div>
        ) : video.source_type === 'subscription' ? (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-emerald-950/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
            <Check className="w-3 h-3 text-emerald-400" />
            <span>Curated</span>
          </div>
        ) : null}

        {/* Completion Count Badge */}
        {video.completion_count > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-950/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{video.completion_count}</span>
          </div>
        )}
      </Link>

      {/* Info Content */}
      <div className="p-3.5 flex flex-col justify-between">
        <div>
          <Link href={playerUrl} className="block">
            <h4
              className="text-sm font-medium text-zinc-100 line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors"
              title={video.title}
            >
              {video.title}
            </h4>
          </Link>
          <div className="flex items-center justify-between mt-2 text-xs text-zinc-400">
            <span className="truncate max-w-[170px] font-normal" title={video.channel_name}>
              {video.channel_name || 'YouTube Creator'}
            </span>
            {video.last_played_at && (
              <span className="text-[10px] text-zinc-500">
                Played {new Date(video.last_played_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-zinc-800/40">
          {!curated ? (
            <button
              onClick={handleCurate}
              disabled={curating}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-500/30 transition-all hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{curating ? 'Adding...' : '+ Add to Library'}</span>
            </button>
          ) : (
            <Link
              href={playerUrl}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Player</span>
            </Link>
          )}

          <div className="flex items-center gap-1">
            {!curated && (
              <Link
                href={playerUrl}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
                title="Preview in player"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </Link>
            )}

            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                title="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 bottom-full mb-1 z-30 w-52 bg-[#181a26] border border-zinc-700/60 rounded-xl shadow-xl py-1 text-xs text-zinc-300">
                  {!curated && (
                    <button
                      onClick={handleCurate}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Workspace Library</span>
                    </button>
                  )}

                  {/* Add to Playlist Option */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      setIsAddToPlaylistOpen(true);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/80 text-zinc-200 hover:text-white transition-colors"
                  >
                    <ListPlus className="w-3.5 h-3.5 text-violet-400" />
                    <span>Add to Playlist</span>
                  </button>

                  {/* Remove from this playlist if inside playlist context */}
                  {playlistContext && (
                    <button
                      onClick={handleRemoveFromPlaylist}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-amber-950/40 text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <FolderMinus className="w-3.5 h-3.5" />
                      <span>Remove from Playlist</span>
                    </button>
                  )}

                  <a
                    href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/80 hover:text-white transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open on YouTube</span>
                  </a>
                  <button
                    onClick={handleDelete}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete from workspace</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add to Playlist Modal */}
      {isAddToPlaylistOpen && (
        <AddToPlaylistModal
          isOpen={isAddToPlaylistOpen}
          onClose={() => setIsAddToPlaylistOpen(false)}
          video={video}
          domainId={domainId}
          onSuccess={onPlaylistUpdated}
        />
      )}
    </div>
  );
}
