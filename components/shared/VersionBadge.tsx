'use client';

import { useEffect, useState } from 'react';

interface VersionData {
  buildId: string;
  version: string;
  timestamp?: string;
}

interface VersionBadgeProps {
  variant?: 'login' | 'dashboard';
}

export default function VersionBadge({ variant = 'dashboard' }: VersionBadgeProps) {
  const [versionData, setVersionData] = useState<VersionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVersion() {
      try {
        const response = await fetch('/api/version');
        if (response.ok) {
          const data = await response.json();
          setVersionData(data);
        }
      } catch (error) {
        console.error('Error fetching version:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchVersion();
  }, []);

  if (loading || !versionData) {
    return null;
  }

  // Truncate buildId to 7 characters
  const shortBuildId = versionData.buildId?.slice(0, 7) || 'dev';
  const versionText = `v${versionData.version}`;
  const fullText = shortBuildId !== 'development' && shortBuildId !== 'dev'
    ? `${versionText} · ${shortBuildId}`
    : versionText;

  // Login variant: Simple text, gray
  if (variant === 'login') {
    return (
      <span className="text-xs text-gray-400">
        {fullText}
      </span>
    );
  }

  // Dashboard variant: Badge style in sidebar
  return (
    <div className="text-xs text-gray-500 text-center">
      {fullText}
    </div>
  );
}
