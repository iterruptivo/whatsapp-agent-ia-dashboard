import type { NextConfig } from "next";
import { execSync } from 'child_process';

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // ============================================================================
  // CACHE BUSTING: Generate unique BUILD_ID based on Git commit
  // ============================================================================
  generateBuildId: async () => {
    try {
      const commit = execSync('git rev-parse --short HEAD').toString().trim();
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      return `${timestamp}-${commit}`;
    } catch {
      return `build-${Date.now()}`;
    }
  },

  // ============================================================================
  // CACHE CONTROL HEADERS
  // ============================================================================
  async headers() {
    return [
      // HTML Documents - NEVER cache (always validate with server)
      {
        source: '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      // API Routes - No cache
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, max-age=0',
          },
        ],
      },
      // Static assets with hash (_next/static) - Long cache (immutable)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
