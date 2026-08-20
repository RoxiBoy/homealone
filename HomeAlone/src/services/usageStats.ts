import { NativeModules, Platform } from 'react-native';

type UsageSnapshot = {
  packageName: string;
  lastTimeUsed: number;
  totalTimeInForeground: number;
  hasUsageAccess: boolean;
};

type UsageNativeModule = {
  hasUsageAccess: () => Promise<boolean>;
  openUsageAccessSettings: () => void;
  getMostRecentForegroundUsage: () => Promise<UsageSnapshot>;
  getRecentForegroundUsage: (limit: number) => Promise<UsageSnapshot[]>;
  getForegroundUsageWithTime: () => Promise<UsageSnapshot>;
};

const usageModule: UsageNativeModule | null =
  Platform.OS === 'android' ? (NativeModules.UsageModule as UsageNativeModule) : null;

export function hasUsageModule(): boolean {
  const available = !!usageModule;
  if (!available) {
    console.log('[usageStats] UsageModule unavailable on this platform/build');
  }
  return available;
}

export async function hasUsageAccess(): Promise<boolean> {
  if (!usageModule) return false;
  try {
    const allowed = await usageModule.hasUsageAccess();
    console.log(`[usageStats] hasUsageAccess=${allowed}`);
    return allowed;
  } catch (error) {
    console.log('[usageStats] hasUsageAccess failed', error);
    return false;
  }
}

export function openUsageAccessSettings(): void {
  if (!usageModule) return;
  usageModule.openUsageAccessSettings();
}

export async function getMostRecentForegroundUsage(): Promise<UsageSnapshot | null> {
  if (!usageModule) return null;
  try {
    const snapshot = await usageModule.getMostRecentForegroundUsage();
    console.log(
      '[usageStats] snapshot',
      JSON.stringify({
        packageName: snapshot?.packageName || '',
        lastTimeUsed: snapshot?.lastTimeUsed || 0,
      }),
    );
    return snapshot;
  } catch (error) {
    console.log('[usageStats] getMostRecentForegroundUsage failed', error);
    return null;
  }
}

export async function getRecentForegroundUsage(limit = 3): Promise<UsageSnapshot[]> {
  if (!usageModule) return [];
  try {
    const recent = await usageModule.getRecentForegroundUsage(limit);
    console.log('[usageStats] recent snapshot', JSON.stringify(recent || []));
    return Array.isArray(recent) ? recent : [];
  } catch (error) {
    console.log('[usageStats] getRecentForegroundUsage failed', error);
    return [];
  }
}

export async function getForegroundUsageWithTime(): Promise<UsageSnapshot | null> {
  if (!usageModule) return null;
  try {
    const snapshot = await usageModule.getForegroundUsageWithTime();
    console.log(
      '[usageStats] fgWithTime',
      JSON.stringify({
        packageName: snapshot?.packageName || '',
        lastTimeUsed: snapshot?.lastTimeUsed || 0,
        totalTimeInForeground: snapshot?.totalTimeInForeground || 0,
      }),
    );
    return snapshot;
  } catch (error) {
    console.log('[usageStats] getForegroundUsageWithTime failed', error);
    return null;
  }
}

export async function isDeviceActiveFromUsage(thresholdMs: number): Promise<boolean> {
  const snapshot = await getMostRecentForegroundUsage();
  if (!snapshot || !snapshot.lastTimeUsed) return false;

  const myPackage = 'com.homealone';

  if(snapshot.packageName === myPackage){
      return false
  }

  const now = Date.now();
  return now - snapshot.lastTimeUsed < thresholdMs;
}
