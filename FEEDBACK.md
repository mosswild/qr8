# User Feedback & Feature Backlog

Logged on: 2026-09-15

## Completed Feedback Items (Implemented on 2026-09-15)

### 1. Ultra-Minimal Opening Portal Hub
- **Feedback:** Remove the promotional/explanatory hero block at the top of the home view (*"Curated Video Hubs without Algorithmic Clutter"*).
- **Target:** Strip down `src/components/hub/DomainLauncher.tsx` to directly show the workspace grid with minimal header overhead.

### 2. Remove "Zero Algorithm Drift" Badge
- **Feedback:** Remove the *"Zero Algorithm Drift"* badge located in the top navigation header.
- **Target:** Clean up header in `src/components/hub/DomainLauncher.tsx`.

### 3. YouTube Playlist Ingestion Support
- **Feedback:** In addition to single videos and creator channels, Quick Add should accept full YouTube playlist URLs (e.g., `https://www.youtube.com/playlist?list=PL...`).
- **Behavior:** Ingest all videos contained in that YouTube playlist and automatically create a corresponding curated playlist/carousel inside the active workspace with the items pre-populated.
- **Implementation Note:** Can be resolved via YouTube's public playlist RSS Atom feed (`https://www.youtube.com/feeds/videos.xml?playlist_id=...`) or HTML scraping/API unrolling with zero API key.

### 4. Smart TV & Apple TV Streaming / Casting
- **Question:** Does QR8 allow streaming video to a smart TV like Apple TV?
- **Status & Findings:**
  - **AirPlay (Apple TV / AirPlay 2 Smart TVs):** 
    - Available natively when accessed from Safari (iOS, iPadOS, macOS). When full-screened or via system AirPlay in Control Center, video streams directly to Apple TV.
    - Inside third-party desktop browsers (e.g. Chrome on Mac/PC), Apple restricts native AirPlay controls inside iframes unless using browser casting or system screen mirroring.
  - **Google Cast / Chromecast / Android TV:**
    - Available directly via Chrome's native Cast feature (`Menu -> Cast...` or right-click -> Cast).
  - **Future Enhancement Possibility:** Implement explicit Cast / AirPlay button integration or remote display mode if needed.

### 5. Correct Logo Badge Typo (Q8 -> QR8)
- **Feedback:** The application is called QR8, but the square header icon badge currently says "Q8".
- **Target:** Update `src/components/hub/DomainLauncher.tsx` to display "QR8" instead of "Q8".

### 6. Unified Playlists Shelf & Stacked Deck Player Experience
- **Feedback:** Instead of dedicating a separate horizontal scroll shelf to every individual playlist, consolidate them into **one single "Curated Playlists" horizontal shelf**.
- **Visual Presentation:** Each playlist card appears as a "stacked" deck of video thumbnails (indicating multiple videos inside, item count badge, playlist name).
- **Player Experience:** Clicking a playlist opens the player with the first video playing on the main canvas and a **collapsible playlist queue sidebar on the right** showing all queued videos.
- **Playback Controls:** Users can let all playlist videos play sequentially or click any item in the right-hand queue to immediately jump to it.

### 7. Creator Subscriptions Isolation & Manual Library Curation
- **Feedback:** When subscribing to a YouTube creator/channel, new videos should **only populate the "What's New" carousel** and must **not** automatically flood the curated "Workspace Library" or "Daily Shuffle".
- **User Action:** The user must explicitly choose to add a video from "What's New" into their curated library (e.g., via an "Add to Library" / "+ Curate" action button).
- **Benefit:** Keeps the permanent library focused and high-signal, preserving the Daily Shuffle for deliberately curated routines rather than raw subscription feeds.

### 8. Dynamic Thumbnail Visual for Workspace Cards
- **Feedback:** Instead of an emoticon/emoji as a visual for each workspace on the workspace selection page, use a thumbnail from a random video in that workspace, blended into the workspace card background.
- **Target:** `src/components/hub/DomainCard.tsx` and workspace selection UI.

### 9. Remove Redundant "Enter Workspace" Text
- **Feedback:** Since clicking anywhere on a workspace card already takes the user into the workspace, the explicit "Enter Workspace" text is unnecessary and should be removed.
- **Target:** `src/components/hub/DomainCard.tsx`.

### 10. Uniform Terminology (Workspaces vs. Domains)
- **Feedback:** Standardize naming across the application. The app intermixes calling these "workspaces" and "domains" (especially in the portal). Be uniform across UI copy, labels, and documentation.
- **Target:** Portal copy, UI text, component labels, and documentation.

### 11. Shelf Layout: Playlists Above "What's New"
- **Feedback:** Reorder the horizontal shelves within the workspace dashboard to place curated Playlists above the "What's New" carousel.
- **Target:** `src/app/w/[domainId]/page.tsx` shelf ordering.
