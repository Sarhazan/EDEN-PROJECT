import { useState, useEffect, useCallback } from 'react';

const CHECK_INTERVAL = 60000; // Check every minute

// Disable version check in production - only show in TEST environment
const IS_TEST_ENV = import.meta.env.VITE_ENV === 'test';

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);

  const checkVersion = useCallback(async () => {
    // Skip version check in production
    if (!IS_TEST_ENV) return;

    try {
      // Add cache-busting to always get fresh version.json
      const response = await fetch(`/version.json?t=${Date.now()}`);
      if (!response.ok) return;

      const data = await response.json();
      const serverVersion = data.version;

      if (currentVersion === null) {
        // First check - just store the version
        setCurrentVersion(serverVersion);
      } else if (serverVersion !== currentVersion) {
        // Version changed - update available!
        setUpdateAvailable(true);
      }
    } catch (error) {
      // Silently fail - version check is not critical
      console.log('Version check failed:', error.message);
    }
  }, [currentVersion]);

  const doUpdate = useCallback(() => {
    // Clear all caches and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    // Hard reload - bypass cache
    window.location.reload(true);
  }, []);

  useEffect(() => {
    // Skip in production
    if (!IS_TEST_ENV) return;

    // Initial check
    checkVersion();

    // Set up interval
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [checkVersion]);

  return { updateAvailable, doUpdate };
}
