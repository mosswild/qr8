export interface ParsedYouTubeUrl {
  type: 'video' | 'playlist' | 'channel' | 'unknown';
  id?: string;
  channelHandle?: string;
  originalUrl: string;
}

export function parseYouTubeUrl(rawUrl: string): ParsedYouTubeUrl {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { type: 'unknown', originalUrl: rawUrl };

  // 1. Bare handle: @creator
  if (trimmed.startsWith('@')) {
    const handle = trimmed.slice(1).split(/[/?#&]/)[0];
    if (handle) {
      return { type: 'channel', channelHandle: handle, originalUrl: trimmed };
    }
  }

  // 2. Bare channel ID: UC...
  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return { type: 'channel', id: trimmed, originalUrl: trimmed };
  }

  // 3. Bare 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { type: 'video', id: trimmed, originalUrl: trimmed };
  }

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);

    // Shortened youtu.be/<id>
    if (url.hostname.includes('youtu.be')) {
      const videoId = url.pathname.slice(1).split(/[?#&]/)[0];
      if (videoId) {
        return { type: 'video', id: videoId, originalUrl: trimmed };
      }
    }

    // Standard youtube.com URLs
    if (url.hostname.includes('youtube.com')) {
      // Playlist: /playlist?list=PL...
      const listId = url.searchParams.get('list');
      if (url.pathname.includes('/playlist') && listId) {
        return { type: 'playlist', id: listId, originalUrl: trimmed };
      }

      // Standard watch?v=...
      const videoId = url.searchParams.get('v');
      if (videoId) {
        return { type: 'video', id: videoId, originalUrl: trimmed };
      }

      // Embed or Shorts: /embed/<id>, /shorts/<id>
      const matchEmbedOrShorts = url.pathname.match(/\/(embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
      if (matchEmbedOrShorts && matchEmbedOrShorts[2]) {
        return { type: 'video', id: matchEmbedOrShorts[2], originalUrl: trimmed };
      }

      // Channel by ID: /channel/UC...
      const matchChannelId = url.pathname.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
      if (matchChannelId && matchChannelId[1]) {
        return { type: 'channel', id: matchChannelId[1], originalUrl: trimmed };
      }

      // Channel by Handle: /@handle
      const matchHandle = url.pathname.match(/\/@([a-zA-Z0-9_.-]+)/);
      if (matchHandle && matchHandle[1]) {
        return { type: 'channel', channelHandle: matchHandle[1], originalUrl: trimmed };
      }
    }
  } catch (err) {
    // If URL parsing failed, fall through to unknown
  }

  return { type: 'unknown', originalUrl: rawUrl };
}
