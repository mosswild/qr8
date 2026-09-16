import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QR8 | Distraction-Free Video Curator',
    short_name: 'QR8',
    description: 'Self-hosted distraction-free video routines, curated decks, and focused practice feeds.',
    start_url: '/qr8',
    display: 'standalone',
    background_color: '#090a0f',
    theme_color: '#090a0f',
    icons: [
      {
        src: '/qr8/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/qr8/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/qr8/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
  };
}
