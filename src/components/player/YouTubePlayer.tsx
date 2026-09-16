'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  SkipForward,
  FileText,
  Save,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Tv,
  Cast,
  Play,
  Maximize2,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { VideoItem } from '../dashboard/VideoCard';
import Modal from '@/components/ui/Modal';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  video: VideoItem;
  domainId: string;
  domainName: string;
  playlistId?: string;
  playlistVideos?: VideoItem[];
  currentPlaylistIndex?: number;
}

export default function YouTubePlayer({
  video,
  domainId,
  domainName,
  playlistId,
  playlistVideos = [],
  currentPlaylistIndex = -1,
}: YouTubePlayerProps) {
  const router = useRouter();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const cinemaContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completionCount, setCompletionCount] = useState(video.completion_count);
  const [notes, setNotes] = useState(video.notes || '');
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [queueVideos, setQueueVideos] = useState<VideoItem[]>(playlistVideos);
  const [isQueueOpen, setIsQueueOpen] = useState(playlistVideos.length > 0);
  const [isCastModalOpen, setIsCastModalOpen] = useState(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [isCurated, setIsCurated] = useState(video.source_type === 'manual');
  const [isCurating, setIsCurating] = useState(false);

  useEffect(() => {
    setQueueVideos(playlistVideos);
  }, [playlistVideos]);

  const handleCurate = async () => {
    setIsCurating(true);
    try {
      const res = await fetch('/api/videos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, action: 'curate' }),
      });
      if (res.ok) {
        setIsCurated(true);
      }
    } catch (err) {
      console.error('Failed to curate video to library:', err);
    } finally {
      setIsCurating(false);
    }
  };

  const hasPlaylist = queueVideos.length > 0;
  const activePlaylistIndex = queueVideos.findIndex((v) => v.youtube_id === video.youtube_id);
  const nextVideo =
    activePlaylistIndex >= 0 && activePlaylistIndex < queueVideos.length - 1
      ? queueVideos[activePlaylistIndex + 1]
      : null;

  const handleRemoveFromQueue = async (e: React.MouseEvent, plItem: VideoItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!playlistId) return;

    if (!confirm(`Remove "${plItem.title}" from this playlist?`)) {
      return;
    }

    try {
      const res = await fetch('/api/playlists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_item',
          playlistId,
          videoId: plItem.id || plItem.youtube_id,
        }),
      });

      if (res.ok) {
        const updated = queueVideos.filter(
          (v) => (v.id && plItem.id ? v.id !== plItem.id : v.youtube_id !== plItem.youtube_id)
        );
        setQueueVideos(updated);

        // If removed video is currently playing
        if (plItem.youtube_id === video.youtube_id) {
          if (updated.length > 0) {
            const nextIdx = activePlaylistIndex < updated.length ? activePlaylistIndex : 0;
            router.push(`/w/${domainId}/player?v=${updated[nextIdx].youtube_id}&playlist=${playlistId}`);
          } else {
            router.push(`/w/${domainId}`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to remove item from playlist queue:', err);
    }
  };

  // Record initial play start in database
  const markAsPlayed = async () => {
    try {
      await fetch('/api/videos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, action: 'played' }),
      });
    } catch (err) {
      console.error('Failed to mark video as played:', err);
    }
  };

  // Record video completion in database
  const handleVideoCompleted = async () => {
    if (completed) return;
    setCompleted(true);
    setCompletionCount((c) => c + 1);

    try {
      await fetch('/api/videos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, action: 'completed' }),
      });
    } catch (err) {
      console.error('Failed to record completion:', err);
    }

    // Auto-advance if next video in playlist
    if (nextVideo) {
      setAutoAdvanceCountdown(3);
      const timer = setInterval(() => {
        setAutoAdvanceCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            const playlistParam = playlistId ? `&playlist=${playlistId}` : '';
            router.push(`/w/${domainId}/player?v=${nextVideo.youtube_id}${playlistParam}`);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Save notes
  const handleSaveNotes = async () => {
    setIsSavingNote(true);
    try {
      await fetch('/api/videos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, action: 'note', note: notes }),
      });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleFullscreen = () => {
    if (cinemaContainerRef.current) {
      if (!document.fullscreenElement) {
        cinemaContainerRef.current.requestFullscreen().catch((err) => {
          console.error('Fullscreen request error:', err);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  // Initialize YouTube IFrame API
  useEffect(() => {
    let isCancelled = false;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player || !playerContainerRef.current) return;

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
      }

      ytPlayerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: video.youtube_id,
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          controls: 1,
          fs: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: () => {
            if (!isCancelled) {
              markAsPlayed();
            }
          },
          onStateChange: (event: any) => {
            if (isCancelled) return;
            // YT.PlayerState.PLAYING = 1
            if (event.data === 1) {
              setIsPlaying(true);
            }
            // YT.PlayerState.PAUSED = 2
            if (event.data === 2) {
              setIsPlaying(false);
            }
            // YT.PlayerState.ENDED = 0
            if (event.data === 0) {
              setIsPlaying(false);
              handleVideoCompleted();
            }
          },
        },
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }

    return () => {
      isCancelled = true;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [video.youtube_id]);

  return (
    <div className="min-h-screen bg-[#06070a] flex flex-col text-zinc-100">
      {/* Distraction-Free Header Bar */}
      <header className="h-14 border-b border-zinc-900 px-4 sm:px-6 flex items-center justify-between bg-[#0a0c13]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href={`/w/${domainId}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to {domainName}</span>
          </Link>
          <span className="text-zinc-700 hidden sm:inline">|</span>
          <span className="text-xs text-zinc-400 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
            {video.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Add to Library button if not yet curated */}
          {!isCurated ? (
            <button
              onClick={handleCurate}
              disabled={isCurating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
              title="Add this routine to your Workspace Library"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCurating ? 'Adding...' : 'Add to Library'}</span>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">In Library</span>
            </div>
          )}

          {/* Smart TV / Casting button */}
          <button
            onClick={() => setIsCastModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Cast to Smart TV / Apple TV"
          >
            <Tv className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Cast / AirPlay</span>
          </button>

          {/* Playlist Queue Toggle */}
          {hasPlaylist && (
            <button
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isQueueOpen
                  ? 'bg-violet-950/50 border-violet-500/50 text-violet-300 shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-violet-400" />
              <span>Queue ({activePlaylistIndex >= 0 ? activePlaylistIndex + 1 : 1}/{queueVideos.length})</span>
            </button>
          )}

          {/* Completion Counter */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
              completed
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 animate-pulse'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${completed ? 'text-emerald-400' : 'text-zinc-400'}`}
            />
            <span>{completionCount}x</span>
          </div>

          {/* Notes Toggle */}
          <button
            onClick={() => setIsNotesOpen(!isNotesOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isNotesOpen || notes.length > 0
                ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Notes</span>
            {isNotesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Next in playlist if present */}
          {nextVideo && (
            <Link
              href={`/w/${domainId}/player?v=${nextVideo.youtube_id}${playlistId ? `&playlist=${playlistId}` : ''}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow transition-colors"
            >
              <span>Next</span>
              <SkipForward className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </header>

      {/* Main Focus Stage & Playlist Queue Sidebar */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-2 sm:p-6 md:p-8 flex flex-col lg:flex-row gap-6 items-start justify-center">
        {/* Cinema Video Player Area */}
        <div className="flex-1 w-full flex flex-col items-center">
          {/* Cinema Container */}
          <div
            ref={cinemaContainerRef}
            className="w-full relative aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl group"
          >
            <div ref={playerContainerRef} className="w-full h-full" />

            {/* Auto Advance Overlay */}
            {autoAdvanceCountdown !== null && nextVideo && (
              <div className="absolute inset-x-0 bottom-12 flex items-center justify-center z-20 pointer-events-auto">
                <div className="bg-black/90 backdrop-blur-md border border-violet-500/50 p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in">
                  <div>
                    <p className="text-xs text-violet-300 font-semibold">Routine Complete!</p>
                    <p className="text-sm font-bold text-white line-clamp-1 max-w-xs">
                      Up Next: {nextVideo.title}
                    </p>
                  </div>
                  <Link
                    href={`/w/${domainId}/player?v=${nextVideo.youtube_id}${playlistId ? `&playlist=${playlistId}` : ''}`}
                    className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow flex items-center gap-1.5"
                  >
                    <span>Play ({autoAdvanceCountdown}s)</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Routine Cues & Notes Drawer */}
          {isNotesOpen && (
            <div className="w-full mt-4 p-4 rounded-2xl bg-[#0e101a] border border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Personal Routine Cues & Form Notes</span>
                </h4>
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNote}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors"
                >
                  {noteSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Cues</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Record cues, breathing instructions, or adjustments (e.g., 'Keep ribs tucked during hollow body hold', '30s rest between supersets')..."
                rows={3}
                className="w-full p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all resize-none"
              />
            </div>
          )}

          {/* Minimal Clean Metadata Footer */}
          <div className="w-full mt-4 flex items-center justify-between text-xs text-zinc-500 px-1">
            <div className="flex items-center gap-3">
              <span className="font-medium text-zinc-300">{video.channel_name}</span>
              <span>•</span>
              <button
                onClick={handleFullscreen}
                className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Theater Mode</span>
              </button>
              {playlistId && (
                <>
                  <span>•</span>
                  <button
                    onClick={(e) => handleRemoveFromQueue(e, video)}
                    className="inline-flex items-center gap-1 text-zinc-500 hover:text-rose-400 transition-colors"
                    title="Remove this video from current playlist"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove from playlist</span>
                  </button>
                </>
              )}
              {!isCurated && (
                <>
                  <span>•</span>
                  <button
                    onClick={handleCurate}
                    disabled={isCurating}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isCurating ? 'Adding...' : '+ Add to Workspace Library'}</span>
                  </button>
                </>
              )}
            </div>
            <a
              href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <span>YouTube Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Collapsible Playlist Queue Sidebar */}
        {hasPlaylist && isQueueOpen && (
          <aside className="w-full lg:w-80 xl:w-96 rounded-2xl bg-[#0f111a] border border-zinc-800/90 overflow-hidden flex flex-col max-h-[620px] shadow-2xl flex-shrink-0 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-950/60 text-violet-400 border border-violet-500/30">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Playlist Deck Queue</h3>
                  <p className="text-[11px] text-zinc-400">
                    Playing {activePlaylistIndex >= 0 ? activePlaylistIndex + 1 : 1} of {queueVideos.length}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQueueOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Collapse queue"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Queue List */}
            <div className="overflow-y-auto p-2 space-y-1.5 shelf-scroll flex-1">
              {queueVideos.map((plItem, index) => {
                const isActive = plItem.youtube_id === video.youtube_id;
                return (
                  <div
                    key={plItem.id || index}
                    className={`group flex items-center justify-between gap-2 p-2 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-violet-950/40 border-violet-500/50 shadow-md'
                        : 'bg-zinc-900/30 border-transparent hover:bg-zinc-800/60 hover:border-zinc-700/50'
                    }`}
                  >
                    <Link
                      href={`/w/${domainId}/player?v=${plItem.youtube_id}${playlistId ? `&playlist=${playlistId}` : ''}`}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      {/* Index or Playing indicator */}
                      <div className="w-5 flex-shrink-0 text-center text-xs font-semibold text-zinc-500">
                        {isActive ? (
                          <Play className="w-3.5 h-3.5 fill-violet-400 text-violet-400 mx-auto animate-pulse" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>

                      {/* Thumbnail Preview */}
                      <div className="w-16 h-10 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0 relative border border-white/5">
                        <img
                          src={plItem.thumbnail_url || `https://i.ytimg.com/vi/${plItem.youtube_id}/hqdefault.jpg`}
                          alt={plItem.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Video Info */}
                      <div className="flex-1 min-w-0">
                        <h5
                          className={`text-xs font-medium truncate ${
                            isActive ? 'text-violet-200 font-semibold' : 'text-zinc-300'
                          }`}
                          title={plItem.title}
                        >
                          {plItem.title}
                        </h5>
                        <span className="text-[10px] text-zinc-500 truncate block">
                          {plItem.channel_name || 'Creator'}
                        </span>
                      </div>
                    </Link>

                    {/* Remove from Playlist Button */}
                    {playlistId && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveFromQueue(e, plItem)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
                        title="Remove from playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </main>

      {/* Smart TV & Streaming Modal */}
      <Modal
        isOpen={isCastModalOpen}
        onClose={() => setIsCastModalOpen(false)}
        title="Smart TV & Display Streaming"
      >
        <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-indigo-400 flex-shrink-0">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">
                AirPlay (Apple TV & Mac)
              </h4>
              <p className="text-zinc-400">
                When opened in <strong>Safari (iOS, iPadOS, macOS)</strong>, native AirPlay 2 streaming is enabled directly via the system Control Center or the Safari media stream controls.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-indigo-400 flex-shrink-0">
              <Cast className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">
                Google Cast (Chromecast & Android TV)
              </h4>
              <p className="text-zinc-400">
                Inside <strong>Google Chrome</strong>, click the browser three-dots menu <code className="text-zinc-300">&gt; Cast...</code> or right-click any empty space on this page and choose <strong>Cast</strong> to stream high-resolution distraction-free video to any TV receiver.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={handleFullscreen}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow transition-all"
            >
              Enter Fullscreen Mode
            </button>
            <button
              onClick={() => setIsCastModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
