'use client';

import { useEffect } from 'react';

export default function FaviconSwitcher() {
  useEffect(() => {
    const updateFavicon = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      
      if (favicon) {
        favicon.href = isDark ? '/dark_vision_map.ico' : '/light_vision_map.ico';
      }
    };

    updateFavicon();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateFavicon);

    return () => {
      mediaQuery.removeEventListener('change', updateFavicon);
    };
  }, []);

  return null;
}