'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Rss,
  History,
  ListPlus,
  Sparkles,
  Layers,
  ChevronDown,
} from 'lucide-react';
import Shelf from './Shelf';
import DailyShuffle from './DailyShuffle';
import QuickAddModal from './QuickAddModal';
import CreatorsModal from './CreatorsModal';
import CreatePlaylistModal from './CreatePlaylistModal';
import PlaylistCard, { PlaylistWithVideos } from './PlaylistCard';
import { VideoItem } from './VideoCard';
import { apiFetch } from '@/lib/api';

interface WorkspaceDeckProps {
  domain: {
    id: string;
    name: string;
    icon?: string;
  };
  allDomains: { id: string; name: string; icon?: string }[];
  initialDailyVideos: VideoItem[];
  initialWhatsNewVideos: VideoItem[];
  initialRecentVideos: VideoItem[];
  initialAllVideos: VideoItem[];
  initialPlaylists: PlaylistWithVideos[];
  creatorCount: number;
}

export default function WorkspaceDeck({
  domain,
  allDomains,
  initialDailyVideos,
  initialWhatsNewVideos,
  initialRecentVideos,
  initialAllVideos,
  initialPlaylists,
  creatorCount: initialCreatorCount,
}: WorkspaceDeckProps) {
  const router = useRouter();

  const [allVideos, setAllVideos] = useState<VideoItem[]>(initialAllVideos);
  const [whatsNewVideos, setWhatsNewVideos] = useState<VideoItem[]>(initialWhatsNewVideos);
  const [recentVideos, setRecentVideos] = useState<VideoItem[]>(initialRecentVideos);
  const [playlists, setPlaylists] = useState<PlaylistWithVideos[]>(initialPlaylists);
  const [creatorCount, setCreatorCount] = useState<number>(initialCreatorCount);

  // Modal States
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCreatorsOpen, setIsCreatorsOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isDomainPickerOpen, setIsDomainPickerOpen] = useState(false);

  // Refresh data after mutations
  const refreshWorkspaceData = async () => {
    try {
      // Refresh all videos
      const allRes = await apiFetch(`/api/videos?domainId=${encodeURIComponent(domain.id)}&limit=100`);
      if (allRes.ok) {
        const d = await allRes.json();
        setAllVideos(d.videos || []);
      }

      // Refresh whats new
      const wnRes = await apiFetch(`/api/videos?domainId=${encodeURIComponent(domain.id)}&filter=whats_new&limit=20`);
      if (wnRes.ok) {
        const d = await wnRes.json();
        setWhatsNewVideos(d.videos || []);
      }

      // Refresh recent
      const recRes = await apiFetch(`/api/videos?domainId=${encodeURIComponent(domain.id)}&filter=recent&limit=15`);
      if (recRes.ok) {
        const d = await recRes.json();
        setRecentVideos(d.videos || []);
      }

      // Refresh playlists
      const plRes = await apiFetch(`/api/playlists?domainId=${encodeURIComponent(domain.id)}`);
      if (plRes.ok) {
        const d = await plRes.json();
        setPlaylists(d.playlists || []);
      }

      // Refresh creator count
      const cRes = await apiFetch(`/api/rss/sync?domainId=${encodeURIComponent(domain.id)}`);
      if (cRes.ok) {
        const d = await cRes.json();
        setCreatorCount((d.creators || []).length);
      }
    } catch (err) {
      console.error('Failed refreshing workspace deck:', err);
    }
  };

  const handleVideoDeleted = (deletedId: string) => {
    setAllVideos((prev) => prev.filter((v) => v.id !== deletedId));
    setWhatsNewVideos((prev) => prev.filter((v) => v.id !== deletedId));
    setRecentVideos((prev) => prev.filter((v) => v.id !== deletedId));
    setPlaylists((prev) =>
      prev.map((pl) => ({
        ...pl,
        videos: pl.videos.filter((v) => v.id !== deletedId),
      }))
    );
  };

  const handlePlaylistDeleted = (deletedId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== deletedId));
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col">
      {/* Workspace Sticky Navigation Header */}
      <header className="border-b border-zinc-900 bg-[#0c0e17]/90 backdrop-blur-md sticky top-0 z-30 pt-safe px-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Return to Launcher Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Workspace Title & Dropdown Switcher */}
            <div className="relative">
              <button
                onClick={() => setIsDomainPickerOpen(!isDomainPickerOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 transition-colors"
              >
                <span className="text-xl">{domain.icon || '📁'}</span>
                <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                  {domain.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {isDomainPickerOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsDomainPickerOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-[#141622] border border-zinc-800 shadow-2xl p-2 z-50 text-xs">
                    <p className="px-2.5 py-1 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                      Switch Workspace
                    </p>
                    {allDomains.map((d) => (
                      <Link
                        key={d.id}
                        href={`/w/${d.id}`}
                        onClick={() => setIsDomainPickerOpen(false)}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors ${
                          d.id === domain.id
                            ? 'bg-indigo-600/30 text-indigo-200 font-semibold'
                            : 'hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <span className="text-base">{d.icon || '📁'}</span>
                        <span className="truncate">{d.name}</span>
                      </Link>
                    ))}
                    <div className="border-t border-zinc-800 mt-1 pt-1">
                      <Link
                        href="/"
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      >
                        <span>Launcher Hub</span>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2">
            {/* Creator RSS button */}
            <button
              onClick={() => setIsCreatorsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
              title="Manage YouTube Creators"
            >
              <Rss className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Creators</span>
              {creatorCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                  {creatorCount}
                </span>
              )}
            </button>

            {/* New Playlist button */}
            <button
              onClick={() => setIsPlaylistOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
              title="Create Curated Playlist"
            >
              <ListPlus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Playlist</span>
            </button>

            {/* Persistent Quick-Add button */}
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Add</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Shelves Deck */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* 1. Daily Shuffle ("Pick for Today") */}
        <DailyShuffle
          initialVideos={initialDailyVideos}
          domainId={domain.id}
          onVideoDeleted={handleVideoDeleted}
          onPlaylistUpdated={refreshWorkspaceData}
        />

        {/* 2. Curated Playlists (Consolidated Horizontal Shelf with Stacked Decks - ABOVE What's New) */}
        {playlists.length > 0 && (
          <section className="mb-10 group/shelf">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-950/40 border border-violet-500/20 text-violet-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                    <span>Curated Playlists</span>
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400">
                      {playlists.length}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Structured routine decks and multi-part practices
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPlaylistOpen(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded-lg hover:bg-indigo-950/30 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Playlist</span>
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 shelf-scroll scroll-smooth">
              {playlists.map((pl) => (
                <PlaylistCard
                  key={pl.id}
                  playlist={pl}
                  domainId={domain.id}
                  onDeleted={handlePlaylistDeleted}
                  onUpdated={refreshWorkspaceData}
                />
              ))}
            </div>
          </section>
        )}

        {/* 3. What's New (Subscribed Creators) */}
        <Shelf
          title="What's New"
          subtitle="Latest uploads from creators subscribed inside this workspace"
          icon={<Rss className="w-5 h-5 text-indigo-400" />}
          videos={whatsNewVideos}
          domainId={domain.id}
          emptyMessage="No new creator uploads yet. Use Quick Add or Creators to follow channel feeds (e.g. @TomMerrick)."
          onVideoDeleted={handleVideoDeleted}
          onVideoCurated={refreshWorkspaceData}
          onPlaylistUpdated={refreshWorkspaceData}
          actionButton={
            <button
              onClick={() => setIsCreatorsOpen(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded-lg hover:bg-indigo-950/30 transition-colors"
            >
              Manage Channels
            </button>
          }
        />

        {/* 4. Recently Played / History */}
        <Shelf
          title="Recently Practiced"
          subtitle="Resume routines sorted chronologically by last session"
          icon={<History className="w-5 h-5 text-emerald-400" />}
          videos={recentVideos}
          domainId={domain.id}
          emptyMessage="Your practice history will appear here once you complete or launch a video routine."
          onVideoDeleted={handleVideoDeleted}
          onPlaylistUpdated={refreshWorkspaceData}
        />

        {/* 5. Complete Workspace Library */}
        <Shelf
          title="Workspace Library"
          subtitle="All curated routines and instructional materials in this workspace"
          icon={<Sparkles className="w-5 h-5 text-amber-400" />}
          videos={allVideos}
          domainId={domain.id}
          emptyMessage="Your workspace library is empty. Click '+ Quick Add' to paste your first routine or curate from 'What's New'."
          onVideoDeleted={handleVideoDeleted}
          onPlaylistUpdated={refreshWorkspaceData}
        />
      </main>

      {/* Persistent Bottom Bar for mobile quick add */}
      <div className="sm:hidden fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-2xl border border-indigo-400/40"
          aria-label="Quick Add"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Modals */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        domainId={domain.id}
        onSuccess={refreshWorkspaceData}
      />

      <CreatorsModal
        isOpen={isCreatorsOpen}
        onClose={() => setIsCreatorsOpen(false)}
        domainId={domain.id}
        onSyncCompleted={refreshWorkspaceData}
      />

      <CreatePlaylistModal
        isOpen={isPlaylistOpen}
        onClose={() => setIsPlaylistOpen(false)}
        domainId={domain.id}
        availableVideos={allVideos}
        onPlaylistCreated={refreshWorkspaceData}
      />
    </div>
  );
}
