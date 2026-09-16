'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { apiFetch } from '@/lib/api';

interface RenameDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainId: string;
  currentName: string;
  onRenamed: (newName: string) => void;
}

export default function RenameDomainModal({
  isOpen,
  onClose,
  domainId,
  currentName,
  onRenamed,
}: RenameDomainModalProps) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(currentName);
    setError(null);
  }, [currentName, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/domains', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: domainId, name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to rename workspace');
      }

      onRenamed(name.trim());
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rename Workspace">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Workspace Name
          </label>
          <input
            type="text"
            placeholder="e.g. Mobility & Flexibility"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/70 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-500/20 p-2.5 rounded-xl">
            {error}
          </p>
        )}

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
            disabled={loading || !name.trim() || name.trim() === currentName}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
