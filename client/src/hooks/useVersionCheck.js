import { useState, useEffect, useCallback } from 'react';

const CHECK_INTERVAL = 60000; // Check every minute

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);

  const checkVersion = useCallback(async () => {
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
    // Initial check
    checkVersion();

    // Set up interval
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [checkVersion]);

  return { updateAvailable, doUpdate };
}
