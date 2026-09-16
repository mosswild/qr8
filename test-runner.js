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

console.log('\nAll tests passed successfully!');
