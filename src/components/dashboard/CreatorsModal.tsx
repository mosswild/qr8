'use client';

import React, { useState, useEffect } from 'react';
import { Rss, RefreshCw, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { apiFetch } from '@/lib/api';

interface CreatorItem {
  id: string;
  channel_id: string;
  channel_name: string;
  last_polled_at?: string;
  created_at: string;
}

interface CreatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainId: string;
  onSyncCompleted: () => void;
}

export default function CreatorsModal({
  isOpen,
  onClose,
  domainId,
  onSyncCompleted,
}: CreatorsModalProps) {
  const [creators, setCreators] = useState<CreatorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/rss/sync?domainId=${encodeURIComponent(domainId)}`);
      if (res.ok) {
        const data = await res.json();
        setCreators(data.creators || []);
      }
    } catch (err) {
      console.error('Failed to load creators:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCreators();
      setStatusText(null);
    }
  }, [isOpen, domainId]);

  const handleSyncAll = async () => {
    setSyncing(true);
    setStatusText(null);
    try {
      const res = await apiFetch('/api/rss/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusText(data.message || 'Sync completed successfully');
        await fetchCreators();
        onSyncCompleted();
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleUnsubscribe = async (creatorId: string) => {
    if (!confirm('Unsubscribe from this channel? Existing downloaded items will remain.')) return;
    try {
      const res = await apiFetch(`/api/rss/sync?id=${encodeURIComponent(creatorId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCreators((prev) => prev.filter((c) => c.id !== creatorId));
      }
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Subscribed Creators (RSS)" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2">
          <p className="text-xs text-zinc-400">
            Automatically polled every 6 hours via public Atom RSS feeds.
          </p>
          <button
            onClick={handleSyncAll}
            disabled={syncing || creators.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-medium text-indigo-200 hover:text-white transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Feeds Now'}</span>
          </button>
        </div>

        {statusText && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300">
            {statusText}
          </div>
        )}

        {loading ? (
          <div className="py-8 flex items-center justify-center text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-xs">Loading creators...</span>
          </div>
        ) : creators.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
            No subscribed creators yet in this workspace. Paste a YouTube channel link or <code className="text-zinc-300">@handle</code> in Quick Add to subscribe.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 shelf-scroll">
            {creators.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-400">
                    <Rss className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h5 className="text-sm font-medium text-white truncate">
                      {c.channel_name}
                    </h5>
                    <p className="text-[10px] text-zinc-500">
                      {c.last_polled_at
                        ? `Last checked ${new Date(c.last_polled_at).toLocaleTimeString()}`
                        : 'Pending initial sync'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={`https://www.youtube.com/channel/${c.channel_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="Open YouTube Channel"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleUnsubscribe(c.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                    title="Unsubscribe"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
