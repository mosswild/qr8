'use client';

import React, { useState } from 'react';
import { Dices, Sparkles } from 'lucide-react';
import Shelf from './Shelf';
import { VideoItem } from './VideoCard';
import { apiFetch } from '@/lib/api';

interface DailyShuffleProps {
  initialVideos: VideoItem[];
  domainId: string;
  onVideoDeleted?: (videoId: string) => void;
  onPlaylistUpdated?: () => void;
}

export default function DailyShuffle({
  initialVideos,
  domainId,
  onVideoDeleted,
  onPlaylistUpdated,
}: DailyShuffleProps) {
  const [videos, setVideos] = useState<VideoItem[]>(initialVideos);
  const [loading, setLoading] = useState(false);

  const handleReroll = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/videos?domainId=${encodeURIComponent(domainId)}&filter=daily`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
      }
    } catch (err) {
      console.error('Reroll failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleted = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
    if (onVideoDeleted) onVideoDeleted(id);
  };

  return (
    <div className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/20 via-zinc-900/40 to-violet-950/20 border border-indigo-500/20 mb-10 shadow-lg">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Combats Choice Fatigue</span>
      </div>
      <Shelf
        title="Pick for Today (Daily Shuffle)"
        subtitle="Randomized flow curated from your workspace library"
        icon={<Dices className="w-5 h-5 text-indigo-400" />}
        videos={videos}
        domainId={domainId}
        emptyMessage="Add videos to your workspace library to enable the daily shuffle generator."
        onVideoDeleted={handleDeleted}
        onPlaylistUpdated={onPlaylistUpdated}
        actionButton={
          <button
            onClick={handleReroll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-medium text-indigo-200 hover:text-white transition-all disabled:opacity-50"
          >
            <Dices className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Rolling...' : 'Reroll Picks'}</span>
          </button>
        }
      />
    </div>
  );
}
