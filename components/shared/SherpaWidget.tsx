'use client';

import Script from 'next/script';

export function SherpaWidget() {
  const initSherpa = () => {
    // Small delay to ensure script is fully executed
    setTimeout(() => {
      // @ts-ignore - Sherpa exports { Sherpa: instance, SherpaWidget: class }
      const sherpaInstance = window.Sherpa?.Sherpa;
      if (sherpaInstance && typeof sherpaInstance.init === 'function') {
        sherpaInstance.init({
          contentUrl: '/sherpa/help-content.json',
        });
      } else {
        console.warn('[Sherpa] Widget not available or init not a function');
      }
    }, 100);
  };

  return (
    <Script
      src="/sherpa/sherpa.min.js"
      strategy="afterInteractive"
      onLoad={initSherpa}
    />
  );
}
