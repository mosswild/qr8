'use client';

import React, { useState } from 'react';
import { Plus, Video, Check, AlertCircle, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainId: string;
  onSuccess: () => void;
}

export default function QuickAddModal({
  isOpen,
  onClose,
  domainId,
  onSuccess,
}: QuickAddModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), domainId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to ingest URL');
      }

      setStatusMessage({
        type: 'success',
        text: data.message || 'Added successfully!',
      });
      setUrl('');
      onSuccess();

      // Auto-close after brief celebration
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 1400);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'An error occurred during ingestion',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Add YouTube Resource">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Paste Video, Playlist, or Creator Channel Link
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <Video className="w-5 h-5 text-red-500" />
            </div>
            <input
              type="text"
              placeholder="e.g. https://youtu.be/..., /playlist?list=PL..., or @TomMerrick"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (statusMessage) setStatusMessage(null);
              }}
              disabled={loading}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700/70 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              autoFocus
            />
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
            Supports single videos (<code className="text-zinc-300">watch?v=</code>, <code className="text-zinc-300">youtu.be/</code>, shorts), public playlists (<code className="text-zinc-300">playlist?list=...</code>), and channel handles (<code className="text-zinc-300">@handle</code>). Zero API keys required.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Ingesting...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Resource</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
