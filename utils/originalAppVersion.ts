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
 * Sets originalAppVersion only if it has never been set AND the user was already
 * using the app before subscriptions (detected via prior onboarding completion).
 * This prevents brand-new installs from being grandfathered past the paywall.
 */
export async function setOriginalAppVersionIfNeeded(currentVersion: string): Promise<void> {
  const existing = await AsyncStorage.getItem(ORIGINAL_APP_VERSION_KEY);
  if (existing != null && existing !== '') return;

  const priorOnboarding = await AsyncStorage.getItem('onboarding_complete');
  const isExistingUser = priorOnboarding === 'true';
  if (!isExistingUser) {
    console.log('[Grandfather] New install detected — not grandfathering.');
    return;
  }
  console.log('[Grandfather] Existing user detected — grandfathering to', currentVersion);
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
