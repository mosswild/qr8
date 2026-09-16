'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layers, Play, Trash2, X, Film, Check } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { VideoItem } from './VideoCard';
import { PlaylistWithVideos } from './PlaylistCard';

interface PlaylistDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PlaylistWithVideos;
  domainId: string;
  onVideosUpdated?: () => void;
}

export default function PlaylistDetailsModal({
  isOpen,
  onClose,
  playlist,
  domainId,
  onVideosUpdated,
}: PlaylistDetailsModalProps) {
  const [videos, setVideos] = useState<VideoItem[]>(playlist.videos);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Keep local videos in sync with prop updates
  React.useEffect(() => {
    setVideos(playlist.videos);
  }, [playlist.videos]);

  const handleRemoveVideo = async (videoId: string, videoTitle: string) => {
    setRemovingId(videoId);
    try {
      const res = await fetch('/api/playlists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_item',
          playlistId: playlist.id,
          videoId,
        }),
      });

      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId && v.youtube_id !== videoId));
        setStatusMessage(`Removed "${videoTitle}" from playlist`);
        if (onVideosUpdated) onVideosUpdated();
        setTimeout(() => setStatusMessage(null), 2500);
      }
    } catch (err) {
      console.error('Failed to remove video from playlist:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const firstVideo = videos[0];
  const playerUrl = firstVideo
    ? `/w/${domainId}/player?v=${firstVideo.youtube_id}&playlist=${playlist.id}`
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={playlist.name}>
      <div className="space-y-4">
        {/* Playlist Header Overview */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-950/60 text-violet-400 border border-violet-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Curated Routine Sequence</p>
              <p className="text-[11px] text-zinc-400">
                {videos.length} {videos.length === 1 ? 'routine' : 'routines'} queued
              </p>
            </div>
          </div>

          {playerUrl && (
            <Link
              href={playerUrl}
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow transition-all hover:scale-105"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Deck</span>
            </Link>
          )}
        </div>

        {/* Feedback message */}
        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Videos List */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Routines in this playlist
          </label>

          {videos.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
              <Film className="w-8 h-8 opacity-40 mx-auto mb-1.5" />
              <p>This playlist is empty.</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                Add routines using the &quot;...&quot; menu on any video card.
              </p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 shelf-scroll pr-1">
              {videos.map((vid, index) => (
                <div
                  key={vid.id || index}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#141622] border border-zinc-800/80 hover:border-zinc-700/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-semibold text-zinc-500 w-4 text-center">
                      {index + 1}
                    </span>
                    <div className="w-16 h-10 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0 relative border border-white/5">
                      <img
                        src={vid.thumbnail_url || `https://i.ytimg.com/vi/${vid.youtube_id}/hqdefault.jpg`}
                        alt={vid.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-200 line-clamp-1" title={vid.title}>
                        {vid.title}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">{vid.channel_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    <Link
                      href={`/w/${domainId}/player?v=${vid.youtube_id}&playlist=${playlist.id}`}
                      onClick={onClose}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Play this routine"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </Link>
                    <button
                      onClick={() => handleRemoveVideo(vid.id, vid.title)}
                      disabled={removingId === vid.id}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-colors"
                      title="Remove from this playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
