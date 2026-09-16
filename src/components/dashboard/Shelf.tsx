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
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          {icon && <div className="text-zinc-400">{icon}</div>}
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <span>{title}</span>
              {videos.length > 0 && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400">
                  {videos.length}
                </span>
              )}
            </h3>
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
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
