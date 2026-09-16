'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import VideoCard, { VideoItem } from './VideoCard';

interface ShelfProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  videos: VideoItem[];
  domainId: string;
  actionButton?: React.ReactNode;
  emptyMessage?: string;
  onVideoDeleted?: (videoId: string) => void;
  onVideoCurated?: (videoId: string) => void;
  onPlaylistUpdated?: () => void;
  playlistContext?: string;
}

export default function Shelf({
  title,
  subtitle,
  icon,
  videos,
  domainId,
  actionButton,
  emptyMessage = 'No videos in this shelf yet.',
  onVideoDeleted,
  onVideoCurated,
  onPlaylistUpdated,
  playlistContext,
}: ShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="mb-10 group/shelf">
      {/* Shelf Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-4 px-1">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {icon && <div className="text-zinc-400 shrink-0">{icon}</div>}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
                {title}
              </h3>
              {videos.length > 0 && (
                <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800/90 text-zinc-400 border border-zinc-700/50">
                  {videos.length}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {actionButton}
          {videos.length > 2 && (
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <button
                onClick={() => handleScroll('left')}
                className="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Carousel */}
      {videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800/80 bg-zinc-900/20 p-8 text-center text-sm text-zinc-500">
          {emptyMessage}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 shelf-scroll scroll-smooth"
        >
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              domainId={domainId}
              onDeleted={onVideoDeleted}
              onCurated={onVideoCurated}
              onPlaylistUpdated={onPlaylistUpdated}
              playlistContext={playlistContext}
            />
          ))}
        </div>
      )}
    </section>
  );
}
