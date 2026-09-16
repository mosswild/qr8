'use client';

import React, { useState } from 'react';
import { ListPlus, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { VideoItem } from './VideoCard';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainId: string;
  availableVideos: VideoItem[];
  onPlaylistCreated: () => void;
}

export default function CreatePlaylistModal({
  isOpen,
  onClose,
  domainId,
  availableVideos,
  onPlaylistCreated,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleVideo = (id: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId,
          name: name.trim(),
          videoIds: selectedVideoIds,
        }),
      });

      if (res.ok) {
        setName('');
        setSelectedVideoIds([]);
        onPlaylistCreated();
        onClose();
      }
    } catch (err) {
      console.error('Failed to create playlist:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Curated Playlist" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Playlist Name
          </label>
          <input
            type="text"
            placeholder="e.g. 15-Min Mobility Routine"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/70 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-2">
            Select Videos to Include ({selectedVideoIds.length} selected)
          </label>
          {availableVideos.length === 0 ? (
            <p className="text-xs text-zinc-500">No videos available in this workspace yet.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 shelf-scroll pr-1">
              {availableVideos.map((video) => {
                const isSelected = selectedVideoIds.includes(video.id);
                return (
                  <div
                    key={video.id}
                    onClick={() => toggleVideo(video.id)}
                    className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors border ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/50 text-white'
                        : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/60 text-zinc-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Controlled by row onClick
                      className="rounded border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-12 h-7 object-cover rounded flex-shrink-0"
                    />
                    <div className="truncate text-xs">
                      <p className="font-medium truncate">{video.title}</p>
                      <p className="text-[10px] text-zinc-400">{video.channel_name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800/60">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <ListPlus className="w-3.5 h-3.5" />
                <span>Save Playlist</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
