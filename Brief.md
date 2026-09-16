# Project Spec: QR8 (Self-Hosted Distraction-Free Video Curator)

## Overview

Build a lightweight, self-hostable web application named **QR8** (pronounced "Curate"). QR8 allows users to create distraction-free, user-curated video routines (e.g., Yoga, Mobility, Weight Lifting, Guided Meditation) using embedded YouTube streams.

The application never downloads or hosts media files; it acts strictly as a curated link lens. It eliminates algorithmic distractions, uncurated recommendations, sidebar rabbit holes, and comment feeds.

---

## Core Requirements & Functional Architecture

### 1. Workspaces ("Interests" / "Domains")

* **Top-Level Hub:** The home view displays user-defined spaces (e.g., "Yoga", "Strength", "Cooking Techniques").
* Users can create, rename, reorder, and assign an icon or emoji to each workspace.
* Clicking an interest enters that isolated workspace; navigating out returns to the launcher hub.

### 2. Workspace Dashboard (The Curated Deck)

Within a selected workspace, videos are organized into modular, clean horizontal shelves in strict order:

* **Daily Shuffle ("Pick for Today"):** 3–5 randomized items selected from the current workspace's library, with a "Reroll" button to combat choice fatigue.
* **What's New (Subscribed Creators):** A horizontal feed of the latest uploads ingested from creators followed within this specific workspace, sorted by publish date.
* **Curated Playlists:** Horizontal carousels representing custom sub-groupings (e.g., "15-Min Morning Flow", "Hips & Back").
* **Recently Played / History:** Chronologically sorted by `last_played_at` to jump back into past routines.
* **Quick-Add Interface:** A persistent action to paste a YouTube link (single video, playlist, or creator channel) directly into the active workspace.

### 3. Creator Subscriptions & RSS Polling

* Users can subscribe to specific YouTube channels inside any workspace.
* **Key-Free Ingestion:** Use public YouTube channel Atom/RSS feeds (`[https://www.youtube.com/feeds/videos.xml?channel_id=](https://www.youtube.com/feeds/videos.xml?channel_id=)...`) to poll for new videos automatically without requiring a Google Cloud API key.
* A lightweight background worker (or on-load stale-while-revalidate routine) polls feeds every 6 hours and upserts new uploads directly into the workspace with `source_type = 'subscription'`.

### 4. Dedicated Player Mode

* Distraction-free embedded player using the official YouTube IFrame API.
* Mandatory player configurations: `modestbranding=1`, `rel=0` (shows only related videos from the same channel, preventing random algorithmic drift), and `iv_load_policy=3`.
* Track progress: Listen to playback state; trigger a completion count increment and update `last_played_at` on video finish.
* Minimal controls: Return to workspace, Next in Playlist (if launched from a collection), and an optional collapsible notes drawer for personal routine cues.

### 5. Metadata Fetching & Ingestion

* Extract YouTube video/playlist/channel IDs via regex from standard (`watch?v=`), shortened (`youtu.be/`), embed, and channel URLs.
* **Zero-Token Fetching:** Use the public YouTube oEmbed endpoint (`[https://www.youtube.com/oembed?url=...&format=json](https://www.youtube.com/oembed?url=...&format=json)`) to automatically pull title, author, and default thumbnail without requiring external API keys.
* Optional: Support an environment variable (`YOUTUBE_API_KEY`) for automated multi-item playlist unrolling or channel handle lookups if needed.

---

## Data Model (SQLite)

```sql
CREATE TABLE domains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE creators (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    rss_feed_url TEXT NOT NULL,
    last_polled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE videos (
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
    published_at DATETIME,
    last_played_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlists (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlist_items (
    playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    PRIMARY KEY (playlist_id, video_id)
);

```

---

## Deployment & Operational Targets

* **Distribution:** Standalone `docker-compose.yml` service.
* **Persistence:** Local volume binding (e.g., `./data:/data`) to preserve the SQLite database.
* **Footprint:** Minimal resource overhead, fast cold starts, no external database containers (Postgres/Redis) required.
* **UI:** Clean, dark-mode first, mobile/tablet responsive layout optimized for hands-off viewing from a workout mat or kitchen counter.

See `../centrd` or `../FTMS-rower` for examples of how deployment is typically organized.

---

## Instructions for Implementation

Please propose:

1. Recommended frontend and backend stack (e.g., Next.js with SQLite/Prisma, Go + HTMX, or SvelteKit).
2. The initial project file structure.
3. The RSS parser utility for fetching and syncing channel videos.
4. The base `docker-compose.yml` and `Dockerfile`.
5. The step-by-step implementation plan starting with the database setup, YouTube oEmbed ingestion, and dashboard shelf layout.