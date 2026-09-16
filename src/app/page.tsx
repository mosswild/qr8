import React from 'react';
import getDb from '@/lib/db';
import DomainLauncher from '@/components/hub/DomainLauncher';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const db = getDb();
  const domains = db.prepare(`
    SELECT 
      d.id, 
      d.name, 
      d.icon, 
      COALESCE(d.is_archived, 0) as is_archived,
      d.sort_order, 
      d.created_at,
      COUNT(DISTINCT v.id) as video_count,
      COUNT(DISTINCT c.id) as creator_count,
      (SELECT thumbnail_url FROM videos WHERE domain_id = d.id AND thumbnail_url IS NOT NULL ORDER BY RANDOM() LIMIT 1) as thumbnail_url
    FROM domains d
    LEFT JOIN videos v ON v.domain_id = d.id
    LEFT JOIN creators c ON c.domain_id = d.id
    WHERE COALESCE(d.is_archived, 0) = 0
    GROUP BY d.id
    ORDER BY d.sort_order ASC, d.created_at ASC
  `).all() as any[];

  const archivedCountRow = db.prepare(
    'SELECT COUNT(*) as count FROM domains WHERE COALESCE(is_archived, 0) = 1'
  ).get() as { count: number };

  return (
    <DomainLauncher 
      initialDomains={domains} 
      initialArchivedCount={archivedCountRow?.count || 0} 
    />
  );
}
