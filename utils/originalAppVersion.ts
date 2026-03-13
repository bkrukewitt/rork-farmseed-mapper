import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Key for storing the app version the user had when they first used the app.
 * Used to grandfather paid/legacy users into a future subscription model:
 * if originalAppVersion is set, treat as grandfathered (no subscription required).
 */
export const ORIGINAL_APP_VERSION_KEY = 'farmseed_original_app_version';

/**
 * Returns the version the user had when they were first seen (e.g. pre-subscription).
 * Never overwritten after initial set.
 */
export async function getOriginalAppVersion(): Promise<string | null> {
  return AsyncStorage.getItem(ORIGINAL_APP_VERSION_KEY);
}

/**
 * Sets originalAppVersion only if it has never been set.
 * Call once at app launch so existing/paid users get grandfathered.
 */
export async function setOriginalAppVersionIfNeeded(currentVersion: string): Promise<void> {
  const existing = await AsyncStorage.getItem(ORIGINAL_APP_VERSION_KEY);
  if (existing != null && existing !== '') return;
  await AsyncStorage.setItem(ORIGINAL_APP_VERSION_KEY, currentVersion);
}

/**
 * True if this user should be grandfathered into the subscription era (no paywall).
 * Use when you add subscriptions: if isGrandfathered() then skip subscription requirement.
 */
export async function isGrandfathered(): Promise<boolean> {
  const version = await getOriginalAppVersion();
  return version != null && version !== '';
}
