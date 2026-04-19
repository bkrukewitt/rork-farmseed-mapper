import { useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useSubscription } from '@/contexts/SubscriptionContext';

const DEMO_ACTIVE_KEY = 'farmseed_demo_active';
const DEMO_SCANS_USED_KEY = 'farmseed_demo_scans_used';
const DEMO_SCAN_LIMIT = 1;

export const [DemoProvider, useDemo] = createContextHook(() => {
  const { isProUser } = useSubscription();
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [demoActive, setDemoActive] = useState<boolean>(false);
  const [scansUsed, setScansUsed] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const [active, used] = await Promise.all([
          AsyncStorage.getItem(DEMO_ACTIVE_KEY),
          AsyncStorage.getItem(DEMO_SCANS_USED_KEY),
        ]);
        setDemoActive(active === '1');
        setScansUsed(used ? parseInt(used, 10) || 0 : 0);
      } catch (err) {
        console.warn('[Demo] hydrate error', err);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (isProUser && demoActive) {
      console.log('[Demo] User is now pro, ending demo mode');
      setDemoActive(false);
      setScansUsed(0);
      void AsyncStorage.multiRemove([DEMO_ACTIVE_KEY, DEMO_SCANS_USED_KEY]);
    }
  }, [isProUser, demoActive]);

  const startDemo = useCallback(async () => {
    console.log('[Demo] Starting demo mode');
    setDemoActive(true);
    await AsyncStorage.setItem(DEMO_ACTIVE_KEY, '1');
  }, []);

  const exitDemo = useCallback(async () => {
    console.log('[Demo] Exiting demo mode');
    setDemoActive(false);
    setScansUsed(0);
    await AsyncStorage.multiRemove([DEMO_ACTIVE_KEY, DEMO_SCANS_USED_KEY]);
  }, []);

  const consumeScan = useCallback(async () => {
    const next = scansUsed + 1;
    setScansUsed(next);
    await AsyncStorage.setItem(DEMO_SCANS_USED_KEY, String(next));
  }, [scansUsed]);

  const scansRemaining = Math.max(0, DEMO_SCAN_LIMIT - scansUsed);
  const canScan = demoActive ? scansRemaining > 0 : false;

  return useMemo(
    () => ({
      hydrated,
      demoActive,
      scansUsed,
      scansRemaining,
      scanLimit: DEMO_SCAN_LIMIT,
      canScan,
      startDemo,
      exitDemo,
      consumeScan,
    }),
    [hydrated, demoActive, scansUsed, scansRemaining, canScan, startDemo, exitDemo, consumeScan]
  );
});
