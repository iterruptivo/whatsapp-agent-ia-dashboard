/**
 * API Route - POST /api/dev/clear-rbac-cache
 *
 * Endpoint de desarrollo para limpiar el cache de RBAC.
 * Solo disponible en desarrollo.
 */

import { NextResponse } from 'next/server';
import { invalidateAllCache, getCacheStats } from '@/lib/permissions/cache';

export async function POST() {
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const statsBefore = getCacheStats();
    const cleared = invalidateAllCache();
    const statsAfter = getCacheStats();

    return NextResponse.json({
      success: true,
      message: `Cache cleared: ${cleared} entries removed`,
      before: statsBefore,
      after: statsAfter,
    });
  } catch (error) {
    console.error('[API clear-rbac-cache] Error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const stats = getCacheStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[API clear-rbac-cache] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}
