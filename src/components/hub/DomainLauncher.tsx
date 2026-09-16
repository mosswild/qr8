'use client';

import React, { useState } from 'react';
import { Plus, Archive, Layers } from 'lucide-react';
import DomainCard, { DomainItem } from './DomainCard';
import CreateDomainModal from './CreateDomainModal';
import { apiFetch } from '@/lib/api';

interface DomainLauncherProps {
  initialDomains: DomainItem[];
  initialArchivedCount?: number;
}

export default function DomainLauncher({
  initialDomains,
  initialArchivedCount = 0,
}: DomainLauncherProps) {
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [activeDomains, setActiveDomains] = useState<DomainItem[]>(initialDomains);
  const [archivedDomains, setArchivedDomains] = useState<DomainItem[]>([]);
  const [archivedCount, setArchivedCount] = useState<number>(initialArchivedCount);
  const [activeCount, setActiveCount] = useState<number>(initialDomains.length);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchDomains = async (targetTab: 'active' | 'archived') => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/domains?archived=${targetTab === 'archived'}`);
      if (res.ok) {
        const data = await res.json();
        if (targetTab === 'active') {
          setActiveDomains(data.domains || []);
        } else {
          setArchivedDomains(data.domains || []);
        }
        if (data.archivedCount !== undefined) setArchivedCount(data.archivedCount);
        if (data.activeCount !== undefined) setActiveCount(data.activeCount);
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (newTab: 'active' | 'archived') => {
    setTab(newTab);
    fetchDomains(newTab);
  };

  const handleCreated = () => {
    fetchDomains('active');
  };

  const handleDeleted = (deletedId: string) => {
    if (tab === 'active') {
      setActiveDomains((prev) => prev.filter((d) => d.id !== deletedId));
      setActiveCount((prev) => Math.max(0, prev - 1));
    } else {
      setArchivedDomains((prev) => prev.filter((d) => d.id !== deletedId));
      setArchivedCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleRenamed = (id: string, newName: string) => {
    const updater = (prev: DomainItem[]) =>
      prev.map((d) => (d.id === id ? { ...d, name: newName } : d));
    setActiveDomains(updater);
    setArchivedDomains(updater);
  };

  const handleArchiveToggled = (id: string, newArchived: boolean) => {
    if (newArchived) {
      // It was active and just archived
      setActiveDomains((prev) => prev.filter((d) => d.id !== id));
      setActiveCount((prev) => Math.max(0, prev - 1));
      setArchivedCount((prev) => prev + 1);
    } else {
      // It was archived and just restored
      setArchivedDomains((prev) => prev.filter((d) => d.id !== id));
      setArchivedCount((prev) => Math.max(0, prev - 1));
      setActiveCount((prev) => prev + 1);
    }
  };

  const displayedDomains = tab === 'active' ? activeDomains : archivedDomains;

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
        {/* Section Navigation Tabs & Description */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange('active')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                tab === 'active'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              Active Workspaces ({activeCount})
            </button>
            <button
              onClick={() => handleTabChange('archived')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                tab === 'archived'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archived ({archivedCount})</span>
            </button>
          </div>

          <p className="text-xs text-zinc-400">
            {tab === 'active'
              ? 'Isolated collections tailored to your daily activities'
              : 'Archived workspaces retain all videos and subscriptions and can be restored anytime'}
          </p>
        </div>

        {/* Workspace Cards Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs text-zinc-500">
            Loading workspaces...
          </div>
        ) : displayedDomains.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center">
            {tab === 'active' ? (
              <>
                <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400 text-sm">No active workspaces.</p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Workspace</span>
                </button>
              </>
            ) : (
              <>
                <Archive className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400 text-sm">No archived workspaces.</p>
                <p className="text-xs text-zinc-500 mt-1">
                  You can archive workspaces from the &quot;...&quot; menu on any workspace card.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedDomains.map((domain) => (
              <DomainCard
                key={domain.id}
                domain={domain}
                onDeleted={handleDeleted}
                onRenamed={handleRenamed}
                onArchiveToggled={handleArchiveToggled}
              />
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
        onCreated={handleCreated}
      />
    </div>
  );
}
