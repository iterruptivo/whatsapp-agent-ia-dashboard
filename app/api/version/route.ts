/**
 * Version API Endpoint
 *
 * Returns the current build ID and version information.
 * Used by the client-side version checker to detect new deployments.
 *
 * IMPORTANT: This endpoint must NEVER be cached.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // Build ID is generated in next.config.ts using git commit hash
  const buildId = process.env.NEXT_BUILD_ID
    || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
    || 'development';

  const deploymentUrl = process.env.VERCEL_URL || 'localhost:3000';
  const environment = process.env.NODE_ENV || 'development';
  const vercelEnv = process.env.VERCEL_ENV || 'local';

  return Response.json({
    buildId,
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    environment,
    vercelEnv,
    deploymentUrl,
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
