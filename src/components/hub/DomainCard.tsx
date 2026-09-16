'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Film, Rss, Trash2, Layers, AlertTriangle, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/ui/Modal';

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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleOpenConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/domains?id=${encodeURIComponent(domain.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsConfirmOpen(false);
        if (onDeleted) {
          onDeleted(domain.id);
        }
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

        {/* Delete Action Button: clearly accessible on touch/mobile and hover on desktop */}
        <div className="absolute top-3 right-3 z-20 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleOpenConfirm}
            className="p-2 rounded-xl bg-black/70 backdrop-blur-md text-zinc-400 hover:text-rose-400 hover:bg-rose-950/80 border border-white/10 transition-colors shadow-lg active:scale-95"
            title="Delete workspace"
            aria-label="Delete workspace"
          >
            <Trash2 className="w-4 h-4" />
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

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Delete Workspace"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-rose-200">
              <p className="font-semibold text-sm text-white mb-1">Delete &quot;{domain.name}&quot;?</p>
              <p className="text-zinc-300">
                This will permanently delete this workspace, including <strong>{domain.video_count} routine{domain.video_count === 1 ? '' : 's'}</strong> and <strong>{domain.creator_count} creator subscription{domain.creator_count === 1 ? '' : 's'}</strong>.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/20 transition-all hover:scale-105"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Workspace</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
