'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import DomainCard, { DomainItem } from './DomainCard';
import CreateDomainModal from './CreateDomainModal';
import { apiFetch } from '@/lib/api';

interface DomainLauncherProps {
  initialDomains: DomainItem[];
}

export default function DomainLauncher({ initialDomains }: DomainLauncherProps) {
  const [domains, setDomains] = useState<DomainItem[]>(initialDomains);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const refreshDomains = async () => {
    try {
      const res = await apiFetch('/api/domains');
      if (res.ok) {
        const data = await res.json();
        setDomains(data.domains || []);
      }
    } catch (err) {
      console.error('Failed to refresh workspaces:', err);
    }
  };

  const handleDeleted = (deletedId: string) => {
    setDomains((prev) => prev.filter((d) => d.id !== deletedId));
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-zinc-900 bg-[#0c0e17]/80 backdrop-blur-md sticky top-0 z-20 pt-safe px-safe">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/qr8/icon.png"
              alt="QR8 Icon"
              className="w-10 h-10 rounded-xl shadow-lg shadow-indigo-500/20 object-cover border border-white/10"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-lg text-white">QR8</span>
                <span className="text-[11px] font-medium text-zinc-500 hidden sm:inline">
                  (pronounced &quot;Curate&quot;)
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Distraction-Free Video Routines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>New Workspace</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Active Workspaces</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Isolated collections tailored to your daily activities
            </p>
          </div>
          <span className="text-xs font-medium text-zinc-500">
            {domains.length} {domains.length === 1 ? 'workspace' : 'workspaces'}
          </span>
        </div>

        {/* Workspace Cards Grid */}
        {domains.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center">
            <p className="text-zinc-400 text-sm">No workspaces created yet.</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Workspace</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {domains.map((domain) => (
              <DomainCard key={domain.id} domain={domain} onDeleted={handleDeleted} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900/80 py-6 text-center text-xs text-zinc-600">
        <p>QR8 • Self-Hosted Distraction-Free Video Curator • Lightweight SQLite Ingestion</p>
      </footer>

      {/* Create Modal */}
      <CreateDomainModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={refreshDomains}
      />
    </div>
  );
}
