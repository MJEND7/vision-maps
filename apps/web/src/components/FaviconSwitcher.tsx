'use client';

import { useEffect } from 'react';

export default function FaviconSwitcher() {
  useEffect(() => {
    const setFavicon = (href: string) => {
      // Remove all existing favicons
      document
        .querySelectorAll<HTMLLinkElement>(
          'link[rel="icon"], link[rel="shortcut icon"]'
        )
        .forEach((el) => el.parentNode?.removeChild(el));

      // Create a new favicon link
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/x-icon';
      // Add timestamp to force reload (bypass cache)
      link.href = `${href}?v=${Date.now()}`;
      document.head.appendChild(link);
    };

    const updateFavicon = () => {
      // Check user preference first, then system preference
      const savedTheme = localStorage.getItem('theme');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = savedTheme === 'dark' || (!savedTheme && systemDark);
      setFavicon(isDark ? '/dark_favicon.ico' : '/light_favicon.ico');
    };

    // ✅ Run once on page load
    updateFavicon();

    // ✅ Listen for system/browser theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateFavicon);
    } else {
      // Safari < 14 fallback
      mediaQuery.addListener(updateFavicon);
    }

    // ✅ Listen for localStorage theme changes (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        updateFavicon();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateFavicon);
      } else {
        mediaQuery.removeListener(updateFavicon);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null;
}
