import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better dev experience
  reactStrictMode: true,

  // Disable Next.js development indicators
  devIndicators: false,

  // Compress responses with gzip/brotli
  compress: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Caching & security headers
  async headers() {
    return [
      // Static assets: aggressive long-term caching
      {
        source: '/:all*(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Service worker: no cache (must always be fresh)
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      // Security headers on all routes
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
