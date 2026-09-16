import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'qr8.db');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);

  // Enable performance pragmas & foreign keys
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Load and execute schema
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schemaSql);
  }

  // Ensure incremental migrations
  try {
    const tableInfo = db.prepare("PRAGMA table_info(domains)").all() as any[];
    const hasIsArchived = tableInfo.some((c) => c.name === 'is_archived');
    if (!hasIsArchived) {
      db.exec("ALTER TABLE domains ADD COLUMN is_archived INTEGER DEFAULT 0");
    }
  } catch (err) {
    console.error('Migration error checking is_archived column:', err);
  }

  // Ensure default seed data if no domains exist
  seedInitialData(db);

  dbInstance = db;
  return dbInstance;
}

function seedInitialData(db: Database.Database) {
  const rowCount = db.prepare('SELECT COUNT(*) as count FROM domains').get() as { count: number };
  if (rowCount && rowCount.count > 0) return;

  const insertDomain = db.prepare(
    'INSERT INTO domains (id, name, icon, sort_order) VALUES (?, ?, ?, ?)'
  );
  const insertVideo = db.prepare(`
    INSERT INTO videos (id, domain_id, youtube_id, title, thumbnail_url, channel_name, source_type, completion_count, published_at, last_played_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPlaylist = db.prepare(
    'INSERT INTO playlists (id, domain_id, name, sort_order) VALUES (?, ?, ?, ?)'
  );
  const insertPlaylistItem = db.prepare(
    'INSERT INTO playlist_items (playlist_id, video_id, position) VALUES (?, ?, ?)'
  );

  const seedTransaction = db.transaction(() => {
    // 1. Mobility & Yoga
    insertDomain.run('yoga-mobility', 'Yoga & Mobility', '', 0);

    // 2. Strength & Conditioning
    insertDomain.run('strength-training', 'Strength & Calisthenics', '', 1);

    // 3. Culinary Craft
    insertDomain.run('culinary-craft', 'Culinary Techniques', '', 2);

    // Seed sample videos for Yoga & Mobility
    const yogaVideos = [
      {
        id: 'vid-yoga-1',
        domain_id: 'yoga-mobility',
        youtube_id: 'b1H3xO3x_Js',
        title: '15 Min Morning Yoga Routine for Full Body Mobility',
        thumbnail_url: 'https://i.ytimg.com/vi/b1H3xO3x_Js/hqdefault.jpg',
        channel_name: 'Breathe and Flow',
        source_type: 'manual',
        completion_count: 3,
        published_at: '2024-01-10 08:00:00',
        last_played_at: '2024-05-12 09:30:00',
      },
      {
        id: 'vid-yoga-2',
        domain_id: 'yoga-mobility',
        youtube_id: 'g_tea8ZNk5A',
        title: 'Complete 20-Min Hip Mobility Routine (Follow Along)',
        thumbnail_url: 'https://i.ytimg.com/vi/g_tea8ZNk5A/hqdefault.jpg',
        channel_name: 'Tom Merrick',
        source_type: 'manual',
        completion_count: 5,
        published_at: '2023-11-20 14:00:00',
        last_played_at: '2024-06-01 17:15:00',
      },
      {
        id: 'vid-yoga-3',
        domain_id: 'yoga-mobility',
        youtube_id: 'v7AYKMP6rOE',
        title: '10 Min Daily Spine & Shoulder Relief Routine',
        thumbnail_url: 'https://i.ytimg.com/vi/v7AYKMP6rOE/hqdefault.jpg',
        channel_name: 'Movement Culture',
        source_type: 'manual',
        completion_count: 1,
        published_at: '2024-03-05 10:00:00',
        last_played_at: null,
      },
      {
        id: 'vid-yoga-4',
        domain_id: 'yoga-mobility',
        youtube_id: 'sTANio_2E0Q',
        title: 'Evening Decompression & Guided Deep Stretching',
        thumbnail_url: 'https://i.ytimg.com/vi/sTANio_2E0Q/hqdefault.jpg',
        channel_name: 'Yoga With Tim',
        source_type: 'manual',
        completion_count: 2,
        published_at: '2024-02-18 19:30:00',
        last_played_at: '2024-04-20 21:00:00',
      },
    ];

    for (const v of yogaVideos) {
      insertVideo.run(
        v.id,
        v.domain_id,
        v.youtube_id,
        v.title,
        v.thumbnail_url,
        v.channel_name,
        v.source_type,
        v.completion_count,
        v.published_at,
        v.last_played_at
      );
    }

    // Seed a playlist for Yoga
    insertPlaylist.run('pl-morning-flow', 'yoga-mobility', '15-Min Morning Flow', 0);
    insertPlaylistItem.run('pl-morning-flow', 'vid-yoga-1', 0);
    insertPlaylistItem.run('pl-morning-flow', 'vid-yoga-3', 1);

    insertPlaylist.run('pl-hip-spine', 'yoga-mobility', 'Hips & Decompression', 1);
    insertPlaylistItem.run('pl-hip-spine', 'vid-yoga-2', 0);
    insertPlaylistItem.run('pl-hip-spine', 'vid-yoga-4', 1);

    // Seed sample video for Strength
    insertVideo.run(
      'vid-str-1',
      'strength-training',
      'YdB1HMCldJY',
      'The Only Core Routine You Ever Need (Science-Based)',
      'https://i.ytimg.com/vi/YdB1HMCldJY/hqdefault.jpg',
      'Jeff Nippard',
      'manual',
      4,
      '2024-02-01 12:00:00',
      '2024-05-18 11:00:00'
    );
  });

  seedTransaction();
}

export default getDb;
