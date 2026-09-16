'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Film, Rss, Trash2, Layers } from 'lucide-react';

export interface DomainItem {
  id: string;
  name: string;
  icon?: string;
  thumbnail_url?: string;
  sort_order: number;
  video_count: number;
  creator_count: number;
}

interface DomainCardProps {
  domain: DomainItem;
  onDeleted?: (id: string) => void;
}

export default function DomainCard({ domain, onDeleted }: DomainCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete workspace "${domain.name}" and all its curated videos?`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/domains?id=${encodeURIComponent(domain.id)}`, {
        method: 'DELETE',
      });
      if (res.ok && onDeleted) {
        onDeleted(domain.id);
      }
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`group relative overflow-hidden bg-[#11131d] border border-zinc-800/90 hover:border-indigo-500/50 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-950/30 flex flex-col justify-between ${
        deleting ? 'opacity-30 pointer-events-none' : ''
      }`}
    >
      {/* Top Banner Thumbnail: Full width, zero top/left/right margins, blended downward */}
      <div className="relative w-full h-44 overflow-hidden bg-zinc-900/80">
        {domain.thumbnail_url ? (
          <>
            <img
              src={domain.thumbnail_url}
              alt={domain.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {/* Smooth gradient blend into the card body */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#11131d] via-[#11131d]/60 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-gradient-to-br from-indigo-950/20 to-zinc-900/60">
            <Layers className="w-8 h-8 text-zinc-500 mb-1 opacity-50" />
            <span className="text-[11px] font-medium text-zinc-500">Empty Workspace</span>
            <div className="absolute inset-0 bg-gradient-to-t from-[#11131d] via-[#11131d]/60 to-transparent" />
          </div>
        )}

        {/* Delete Action Button */}
        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-zinc-400 hover:text-rose-400 hover:bg-rose-950/70 border border-white/10 transition-colors shadow-md"
            title="Delete workspace"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Text content underneath the blended thumbnail */}
      <div className="relative z-10 px-5 pb-5 pt-1 -mt-3">
        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors tracking-tight line-clamp-1">
          {domain.name}
        </h3>
        <div className="flex items-center gap-4 mt-2.5 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-zinc-500" />
            <span>{domain.video_count} {domain.video_count === 1 ? 'routine' : 'routines'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Rss className="w-3.5 h-3.5 text-indigo-400" />
            <span>{domain.creator_count} {domain.creator_count === 1 ? 'creator' : 'creators'}</span>
          </span>
        </div>
      </div>

      {/* Entire card click target */}
      <Link
        href={`/w/${domain.id}`}
        className="absolute inset-0 rounded-2xl z-10"
        aria-label={`Open workspace ${domain.name}`}
      />
    </div>
  );
}
