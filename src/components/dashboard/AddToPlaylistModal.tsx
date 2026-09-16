'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Check, Loader2, FolderPlus, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { VideoItem } from './VideoCard';
import { PlaylistWithVideos } from './PlaylistCard';
import { apiFetch } from '@/lib/api';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoItem;
  domainId: string;
  onSuccess?: () => void;
}

export default function AddToPlaylistModal({
  isOpen,
  onClose,
  video,
  domainId,
  onSuccess,
}: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<PlaylistWithVideos[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [removingFromId, setRemovingFromId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/playlists?domainId=${encodeURIComponent(domainId)}`);
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists || []);
      }
    } catch (err) {
      console.error('Failed to load playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists();
      setSuccessMessage(null);
      setNewPlaylistName('');
    }
  }, [isOpen, domainId]);

  const handleAddToPlaylist = async (playlistId: string, playlistName: string) => {
    setAddingToId(playlistId);
    try {
      const res = await apiFetch('/api/playlists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_item',
          playlistId,
          videoId: video.id || video.youtube_id,
        }),
      });

      if (res.ok) {
        setSuccessMessage(`Added to "${playlistName}"`);
        // Update local state so it reflects the video is added
        setPlaylists((prev) =>
          prev.map((pl) => {
            if (pl.id === playlistId) {
              const alreadyHas = pl.videos.some(
                (v) => (video.id && v.id === video.id) || v.youtube_id === video.youtube_id
              );
              return alreadyHas
                ? pl
                : { ...pl, videos: [...pl.videos, video] };
            }
            return pl;
          })
        );
        if (onSuccess) onSuccess();
        setTimeout(() => setSuccessMessage(null), 2500);
      }
    } catch (err) {
      console.error('Failed to add to playlist:', err);
    } finally {
      setAddingToId(null);
    }
  };

  const handleRemoveFromPlaylist = async (playlistId: string, playlistName: string) => {
    setRemovingFromId(playlistId);
    try {
      const res = await apiFetch('/api/playlists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_item',
          playlistId,
          videoId: video.id || video.youtube_id,
        }),
      });

      if (res.ok) {
        setSuccessMessage(`Removed from "${playlistName}"`);
        // Update local state so it reflects the video is removed
        setPlaylists((prev) =>
          prev.map((pl) => {
            if (pl.id === playlistId) {
              return {
                ...pl,
                videos: pl.videos.filter(
                  (v) => (video.id && v.id ? v.id !== video.id : v.youtube_id !== video.youtube_id)
                ),
              };
            }
            return pl;
          })
        );
        if (onSuccess) onSuccess();
        setTimeout(() => setSuccessMessage(null), 2500);
      }
    } catch (err) {
      console.error('Failed to remove from playlist:', err);
    } finally {
      setRemovingFromId(null);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setCreating(true);
    try {
      const res = await apiFetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId,
          name: newPlaylistName.trim(),
          videoIds: [video.id || video.youtube_id],
        }),
      });

      if (res.ok) {
        const createdName = newPlaylistName.trim();
        setSuccessMessage(`Created "${createdName}" and added video`);
        setNewPlaylistName('');
        await fetchPlaylists();
        if (onSuccess) onSuccess();
        setTimeout(() => setSuccessMessage(null), 2500);
      }
    } catch (err) {
      console.error('Failed to create playlist:', err);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Playlist">
      <div className="space-y-4">
        {/* Video Target Summary */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="w-16 h-10 rounded-lg overflow-hidden bg-black flex-shrink-0 relative border border-white/5">
            <img
              src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white line-clamp-1">{video.title}</p>
            <p className="text-[11px] text-zinc-400 truncate">{video.channel_name}</p>
          </div>
        </div>

        {/* Feedback notification */}
        {successMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Existing Playlists List */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Select an existing playlist
          </label>

          {loading ? (
            <div className="py-8 text-center text-zinc-500 flex items-center justify-center gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Loading playlists...</span>
            </div>
          ) : playlists.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
              No playlists found in this workspace yet. Create one below!
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto space-y-1.5 shelf-scroll pr-1">
              {playlists.map((pl) => {
                const isAlreadyIn = pl.videos.some(
                  (v) => v.id === video.id || v.youtube_id === video.youtube_id
                );
                const isAdding = addingToId === pl.id;

                return (
                  <div
                    key={pl.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#141622] border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-violet-950/50 text-violet-400 border border-violet-500/20 flex-shrink-0">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-zinc-200 truncate">
                          {pl.name}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {pl.videos.length} {pl.videos.length === 1 ? 'video' : 'videos'}
                        </p>
                      </div>
                    </div>

                    <div>
                      {isAlreadyIn ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveFromPlaylist(pl.id, pl.name)}
                          disabled={removingFromId === pl.id}
                          className="group/btn flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-rose-950/50 border border-emerald-500/30 hover:border-rose-500/40 transition-all cursor-pointer"
                          title="Click to remove from this playlist"
                        >
                          {removingFromId === pl.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                              <span>Removing...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3 text-emerald-400 group-hover/btn:hidden" />
                              <X className="w-3 h-3 text-rose-400 hidden group-hover/btn:inline" />
                              <span className="group-hover/btn:hidden">Added</span>
                              <span className="hidden group-hover/btn:inline">Remove</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddToPlaylist(pl.id, pl.name)}
                          disabled={isAdding}
                          className="flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 transition-all disabled:opacity-50"
                        >
                          {isAdding ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Create New Playlist */}
        <div className="pt-3 border-t border-zinc-800/80">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Or create a new playlist with this video
          </label>
          <form onSubmit={handleCreateAndAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="New playlist name (e.g., Morning Mobility Flow)"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              disabled={creating}
              className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700/70 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={creating || !newPlaylistName.trim()}
              className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow transition-all disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderPlus className="w-3.5 h-3.5" />
              )}
              <span>Create</span>
            </button>
          </form>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
