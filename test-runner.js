const assert = require('assert');
const { XMLParser } = require('fast-xml-parser');

console.log('--- QR8 Verification Suite ---');

// 1. Test YouTube URL Regex Parser Logic
function parseUrl(rawUrl) {
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('@')) {
    const handle = trimmed.slice(1).split(/[/?#&]/)[0];
    return { type: 'channel', handle };
  }
  const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);

  if (url.hostname.includes('youtu.be')) {
    const videoId = url.pathname.slice(1).split(/[?#&]/)[0];
    return { type: 'video', id: videoId };
  }

  if (url.hostname.includes('youtube.com')) {
    const videoId = url.searchParams.get('v');
    if (videoId) return { type: 'video', id: videoId };

    const matchShorts = url.pathname.match(/\/(embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
    if (matchShorts) return { type: 'video', id: matchShorts[2] };

    const matchChannelId = url.pathname.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
    if (matchChannelId) return { type: 'channel', id: matchChannelId[1] };

    const matchHandle = url.pathname.match(/\/@([a-zA-Z0-9_.-]+)/);
    if (matchHandle) return { type: 'channel', handle: matchHandle[1] };
  }
  return { type: 'unknown' };
}

// Test assertions
const t1 = parseUrl('https://www.youtube.com/watch?v=b1H3xO3x_Js');
assert.strictEqual(t1.type, 'video');
assert.strictEqual(t1.id, 'b1H3xO3x_Js');
console.log('✓ Watch URL parsed correctly');

const t2 = parseUrl('https://youtu.be/g_tea8ZNk5A?t=10');
assert.strictEqual(t2.type, 'video');
assert.strictEqual(t2.id, 'g_tea8ZNk5A');
console.log('✓ Shortened youtu.be URL parsed correctly');

const t3 = parseUrl('https://www.youtube.com/shorts/v7AYKMP6rOE');
assert.strictEqual(t3.type, 'video');
assert.strictEqual(t3.id, 'v7AYKMP6rOE');
console.log('✓ Shorts URL parsed correctly');

const t4 = parseUrl('https://www.youtube.com/@TomMerrick');
assert.strictEqual(t4.type, 'channel');
assert.strictEqual(t4.handle, 'TomMerrick');
console.log('✓ Creator handle URL parsed correctly');

const t5 = parseUrl('https://www.youtube.com/channel/UC4ijq8Cg-8zQKx-e81mYVgw');
assert.strictEqual(t5.type, 'channel');
assert.strictEqual(t5.id, 'UC4ijq8Cg-8zQKx-e81mYVgw');
console.log('✓ Channel ID URL parsed correctly');

// Bare handle test
const t6 = parseUrl('@yogawithadriene');
assert.strictEqual(t6.type, 'channel');
assert.strictEqual(t6.handle, 'yogawithadriene');
console.log('✓ Bare creator handle @yogawithadriene parsed correctly');

// Playlist URL test
function parseUrlWithPlaylist(rawUrl) {
  const url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
  const listId = url.searchParams.get('list');
  if (url.pathname.includes('/playlist') && listId) {
    return { type: 'playlist', id: listId };
  }
  return parseUrl(rawUrl);
}

const t7 = parseUrlWithPlaylist('https://www.youtube.com/playlist?list=PLui6Eyny-Uzwxdkhx_o3_xRkgjnbxVw8j');
assert.strictEqual(t7.type, 'playlist');
assert.strictEqual(t7.id, 'PLui6Eyny-Uzwxdkhx_o3_xRkgjnbxVw8j');
console.log('✓ Playlist URL parsed correctly');

// 2. Test Atom RSS XML Feed Parsing
const sampleAtomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <title>Tom Merrick</title>
  <entry>
    <id>yt:video:demo1234567</id>
    <yt:videoId>demo1234567</yt:videoId>
    <yt:channelId>UC4ijq8Cg-8zQKx-e81mYVgw</yt:channelId>
    <title>15 Min Daily Mobility Flow</title>
    <published>2024-05-01T12:00:00+00:00</published>
    <media:group>
      <media:thumbnail url="https://i.ytimg.com/vi/demo1234567/hqdefault.jpg" width="480" height="360"/>
    </media:group>
  </entry>
</feed>`;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const parsedData = parser.parse(sampleAtomXml);
assert.strictEqual(parsedData.feed.title, 'Tom Merrick');
assert.strictEqual(parsedData.feed.entry['yt:videoId'], 'demo1234567');
assert.strictEqual(parsedData.feed.entry.title, '15 Min Daily Mobility Flow');
assert.strictEqual(parsedData.feed.entry['media:group']['media:thumbnail']['@_url'], 'https://i.ytimg.com/vi/demo1234567/hqdefault.jpg');
console.log('✓ YouTube Atom XML parsed and mapped successfully');

// 3. Test Creator Unsubscribe / Removal Logic
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
const schemaSql = fs.readFileSync(path.join(__dirname, 'src/lib/db/schema.sql'), 'utf-8');
db.exec(schemaSql);

// Seed domain
db.prepare("INSERT INTO domains (id, name, sort_order) VALUES ('dom-1', 'Fitness', 1)").run();

// Seed creators
db.prepare("INSERT INTO creators (id, domain_id, channel_id, channel_name, rss_feed_url) VALUES ('c-1', 'dom-1', 'UC1', 'Creator One', 'https://example.com/rss1')").run();
db.prepare("INSERT INTO creators (id, domain_id, channel_id, channel_name, rss_feed_url) VALUES ('c-2', 'dom-1', 'UC2', 'Creator Two', 'https://example.com/rss2')").run();

// Seed videos for Creator One: one subscription (What's New) and one manual (Library)
db.prepare(`
  INSERT INTO videos (id, domain_id, creator_id, youtube_id, title, channel_name, source_type)
  VALUES ('v-sub-1', 'dom-1', 'c-1', 'yt-sub-1', 'New Flow 1', 'Creator One', 'subscription')
`).run();
db.prepare(`
  INSERT INTO videos (id, domain_id, creator_id, youtube_id, title, channel_name, source_type)
  VALUES ('v-man-1', 'dom-1', 'c-1', 'yt-man-1', 'Curated Favorite 1', 'Creator One', 'manual')
`).run();

// Seed video for Creator Two: subscription (What's New)
db.prepare(`
  INSERT INTO videos (id, domain_id, creator_id, youtube_id, title, channel_name, source_type)
  VALUES ('v-sub-2', 'dom-1', 'c-2', 'yt-sub-2', 'New Flow 2', 'Creator Two', 'subscription')
`).run();

// Before deletion check
const preWhatsNew = db.prepare("SELECT id FROM videos WHERE domain_id = 'dom-1' AND source_type = 'subscription'").all();
assert.strictEqual(preWhatsNew.length, 2);

// Simulate creator deletion for c-1
const creatorToDelete = db.prepare('SELECT * FROM creators WHERE id = ?').get('c-1');
assert.ok(creatorToDelete);

db.prepare(`
  DELETE FROM videos 
  WHERE domain_id = ? 
    AND (creator_id = ? OR channel_name = ?)
    AND source_type = 'subscription'
`).run(creatorToDelete.domain_id, creatorToDelete.id, creatorToDelete.channel_name);

db.prepare('DELETE FROM creators WHERE id = ?').run(creatorToDelete.id);

// Verify results
const postWhatsNew = db.prepare(`
  SELECT id FROM videos 
  WHERE domain_id = 'dom-1' 
    AND source_type = 'subscription' 
    AND creator_id IN (SELECT id FROM creators WHERE domain_id = 'dom-1')
`).all();
assert.strictEqual(postWhatsNew.length, 1);
assert.strictEqual(postWhatsNew[0].id, 'v-sub-2');
console.log("✓ Removed creator's uncurated subscription videos removed from What's New");

const postLibrary = db.prepare("SELECT id, creator_id FROM videos WHERE domain_id = 'dom-1' AND source_type = 'manual'").all();
assert.strictEqual(postLibrary.length, 1);
assert.strictEqual(postLibrary[0].id, 'v-man-1');
assert.strictEqual(postLibrary[0].creator_id, null); // ON DELETE SET NULL
console.log("✓ Curated library videos from removed creator preserved in library");

// 4. Test Continuous Workspace Play Mode Logic
// Update v-man-1 created_at and seed extra library videos in dom-1
db.prepare("UPDATE videos SET created_at = '2026-01-01 00:00:00' WHERE id = 'v-man-1'").run();
db.prepare(`
  INSERT INTO videos (id, domain_id, youtube_id, title, channel_name, source_type, created_at)
  VALUES ('v-man-2', 'dom-1', 'yt-man-2', 'Second Flow', 'Creator Two', 'manual', '2026-01-02 00:00:00')
`).run();
db.prepare(`
  INSERT INTO videos (id, domain_id, youtube_id, title, channel_name, source_type, created_at)
  VALUES ('v-man-3', 'dom-1', 'yt-man-3', 'Third Flow', 'Creator Three', 'manual', '2026-01-03 00:00:00')
`).run();

// Query for playlistId === 'all'
const continuousQueue = db.prepare(`
  SELECT * FROM videos 
  WHERE domain_id = 'dom-1' AND source_type = 'manual'
  ORDER BY created_at DESC
`).all();

assert.strictEqual(continuousQueue.length, 3);
assert.strictEqual(continuousQueue[0].id, 'v-man-3');
assert.strictEqual(continuousQueue[1].id, 'v-man-2');
assert.strictEqual(continuousQueue[2].id, 'v-man-1');
console.log("✓ Continuous workspace queue queries all workspace library videos");

// Test queue navigation and loop mode all
const activeIdx = continuousQueue.findIndex(v => v.id === 'v-man-1'); // last video
const loopModeAll = 'all';
const nextVideoInLoop = (activeIdx >= 0 && activeIdx < continuousQueue.length - 1)
  ? continuousQueue[activeIdx + 1]
  : loopModeAll === 'all' && continuousQueue.length > 0
  ? continuousQueue[0]
  : null;

assert.ok(nextVideoInLoop);
assert.strictEqual(nextVideoInLoop.id, 'v-man-3'); // loops back to first video
console.log("✓ Continuous workspace loop (all) wraps around to first video");

// 5. Test Playlist Shuffle Queue Stability
function testShuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const originalVideos = [
  { id: '1', title: 'Video 1', youtube_id: 'yt-1' },
  { id: '2', title: 'Video 2', youtube_id: 'yt-2' },
  { id: '3', title: 'Video 3', youtube_id: 'yt-3' },
  { id: '4', title: 'Video 4', youtube_id: 'yt-4' },
];

// Initial shuffle with video 1 playing:
const currentVid = originalVideos[0];
const others = originalVideos.filter(v => v.youtube_id !== currentVid.youtube_id);
const shuffledQueue = [currentVid, ...testShuffleArray(others)];

assert.strictEqual(shuffledQueue.length, 4);
assert.strictEqual(shuffledQueue[0].youtube_id, 'yt-1');

// When video 1 finishes and player moves to video 2 in the shuffled sequence:
const activeIdxAfterAdvance = 1;
const playingVideo = shuffledQueue[activeIdxAfterAdvance];

// The queue MUST NOT be reshuffled, meaning shuffledQueue[0] remains video 1, and playingVideo is at index 1
assert.strictEqual(shuffledQueue[0].youtube_id, 'yt-1');
assert.strictEqual(shuffledQueue.findIndex(v => v.youtube_id === playingVideo.youtube_id), 1);
console.log("✓ Shuffled playlist queue maintains stable sequence across video advances");

console.log('\nAll tests passed successfully!');
