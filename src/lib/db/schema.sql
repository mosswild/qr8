CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    is_archived INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS creators (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    rss_feed_url TEXT NOT NULL,
    last_polled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    creator_id TEXT REFERENCES creators(id) ON DELETE SET NULL,
    youtube_id TEXT NOT NULL,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    channel_name TEXT,
    source_type TEXT CHECK(source_type IN ('manual', 'subscription')) DEFAULT 'manual',
    duration_seconds INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    published_at DATETIME,
    last_played_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain_id, youtube_id)
);

CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playlist_items (
    playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    PRIMARY KEY (playlist_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_videos_domain ON videos(domain_id);
CREATE INDEX IF NOT EXISTS idx_videos_creator ON videos(creator_id);
CREATE INDEX IF NOT EXISTS idx_videos_last_played ON videos(last_played_at);
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published_at);
CREATE INDEX IF NOT EXISTS idx_creators_domain ON creators(domain_id);
CREATE INDEX IF NOT EXISTS idx_playlists_domain ON playlists(domain_id);
