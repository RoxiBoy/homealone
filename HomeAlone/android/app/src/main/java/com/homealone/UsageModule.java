package com.homealone;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class UsageModule extends ReactContextBaseJavaModule {
  private static final String MODULE_NAME = "UsageModule";
  private static final String TAG = "UsageModule";
  private static final long LOOKBACK_MS = 24L * 60L * 60L * 1000L;

  public UsageModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return MODULE_NAME;
  }

  @ReactMethod
  public void hasUsageAccess(Promise promise) {
    try {
      boolean allowed = hasUsageStatsPermission();
      Log.d(TAG, "hasUsageAccess -> " + allowed);
      promise.resolve(allowed);
    } catch (Exception e) {
      Log.e(TAG, "hasUsageAccess failed", e);
      promise.reject("USAGE_ACCESS_CHECK_FAILED", e);
    }
  }

  @ReactMethod
  public void openUsageAccessSettings() {
    Log.d(TAG, "Opening usage access settings");
    Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getReactApplicationContext().startActivity(intent);
  }

  @ReactMethod
  public void getMostRecentForegroundUsage(Promise promise) {
    try {
      if (!hasUsageStatsPermission()) {
        Log.d(TAG, "getMostRecentForegroundUsage denied: usage permission missing");
        promise.reject("USAGE_ACCESS_NOT_GRANTED", "Usage access permission is not granted");
        return;
      }

      long now = System.currentTimeMillis();
      long start = now - LOOKBACK_MS;

      UsageStatsManager usm =
        (UsageStatsManager) getReactApplicationContext().getSystemService(Context.USAGE_STATS_SERVICE);

      if (usm == null) {
        Log.e(TAG, "UsageStatsManager unavailable");
        promise.reject("USAGE_STATS_UNAVAILABLE", "UsageStatsManager unavailable");
        return;
      }

      String packageName = null;
      long lastTimeUsed = 0L;
      long totalTimeInForeground = 0L;

      UsageEvents events = usm.queryEvents(start, now);
      UsageEvents.Event event = new UsageEvents.Event();

      while (events.hasNextEvent()) {
        events.getNextEvent(event);
        int type = event.getEventType();
        boolean interactionEvent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
          && type == UsageEvents.Event.USER_INTERACTION;
        if (
          type == UsageEvents.Event.MOVE_TO_FOREGROUND
            || type == UsageEvents.Event.ACTIVITY_RESUMED
            || interactionEvent
        ) {
          long ts = event.getTimeStamp();
          if (ts > lastTimeUsed) {
            lastTimeUsed = ts;
            packageName = event.getPackageName();
          }
        }
      }

      if (lastTimeUsed == 0L) {
        List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, now);
        if (stats != null) {
          for (UsageStats stat : stats) {
            if (stat != null && stat.getLastTimeUsed() > lastTimeUsed) {
              lastTimeUsed = stat.getLastTimeUsed();
              packageName = stat.getPackageName();
              totalTimeInForeground = stat.getTotalTimeInForeground();
            }
          }
        }
      }

      WritableMap map = Arguments.createMap();
      map.putDouble("lastTimeUsed", (double) lastTimeUsed);
      map.putDouble("totalTimeInForeground", (double) totalTimeInForeground);
      map.putString("packageName", packageName == null ? "" : packageName);
      map.putBoolean("hasUsageAccess", true);
      Log.d(
        TAG,
        "getMostRecentForegroundUsage -> package="
          + (packageName == null ? "" : packageName)
          + " lastTimeUsed="
          + lastTimeUsed
      );
      promise.resolve(map);
    } catch (Exception e) {
      Log.e(TAG, "getMostRecentForegroundUsage failed", e);
      promise.reject("USAGE_QUERY_FAILED", e);
    }
  }

  @ReactMethod
  public void getForegroundUsageWithTime(Promise promise) {
    try {
      if (!hasUsageStatsPermission()) {
        Log.d(TAG, "getForegroundUsageWithTime denied: usage permission missing");
        promise.reject("USAGE_ACCESS_NOT_GRANTED", "Usage access permission is not granted");
        return;
      }

      long now = System.currentTimeMillis();
      long start = now - LOOKBACK_MS;

      UsageStatsManager usm =
        (UsageStatsManager) getReactApplicationContext().getSystemService(Context.USAGE_STATS_SERVICE);

      if (usm == null) {
        Log.e(TAG, "UsageStatsManager unavailable");
        promise.reject("USAGE_STATS_UNAVAILABLE", "UsageStatsManager unavailable");
        return;
      }

      List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, now);
      String packageName = null;
      long lastTimeUsed = 0L;
      long totalTimeInForeground = 0L;

      if (stats != null) {
        for (UsageStats stat : stats) {
          if (stat == null) continue;
          if (stat.getLastTimeUsed() > lastTimeUsed) {
            lastTimeUsed = stat.getLastTimeUsed();
            packageName = stat.getPackageName();
            totalTimeInForeground = stat.getTotalTimeInForeground();
          }
        }
      }

      WritableMap map = Arguments.createMap();
      map.putString("packageName", packageName == null ? "" : packageName);
      map.putDouble("lastTimeUsed", (double) lastTimeUsed);
      map.putDouble("totalTimeInForeground", (double) totalTimeInForeground);
      Log.d(
        TAG,
        "getForegroundUsageWithTime -> package="
          + (packageName == null ? "" : packageName)
          + " lastTimeUsed="
          + lastTimeUsed
          + " totalTimeInForeground="
          + totalTimeInForeground
      );
      promise.resolve(map);
    } catch (Exception e) {
      Log.e(TAG, "getForegroundUsageWithTime failed", e);
      promise.reject("USAGE_QUERY_FAILED", e);
    }
  }

  @ReactMethod
  public void getRecentForegroundUsage(int limit, Promise promise) {
    try {
      if (!hasUsageStatsPermission()) {
        Log.d(TAG, "getRecentForegroundUsage denied: usage permission missing");
        promise.reject("USAGE_ACCESS_NOT_GRANTED", "Usage access permission is not granted");
        return;
      }

      int maxCount = limit > 0 ? limit : 3;
      long now = System.currentTimeMillis();
      long start = now - LOOKBACK_MS;

      UsageStatsManager usm =
        (UsageStatsManager) getReactApplicationContext().getSystemService(Context.USAGE_STATS_SERVICE);

      if (usm == null) {
        Log.e(TAG, "UsageStatsManager unavailable");
        promise.reject("USAGE_STATS_UNAVAILABLE", "UsageStatsManager unavailable");
        return;
      }

      Map<String, Long> lastUsedByPackage = new HashMap<>();
      UsageEvents events = usm.queryEvents(start, now);
      UsageEvents.Event event = new UsageEvents.Event();

      while (events.hasNextEvent()) {
        events.getNextEvent(event);
        int type = event.getEventType();
        boolean interactionEvent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
          && type == UsageEvents.Event.USER_INTERACTION;
        if (
          type == UsageEvents.Event.MOVE_TO_FOREGROUND
            || type == UsageEvents.Event.ACTIVITY_RESUMED
            || interactionEvent
        ) {
          long ts = event.getTimeStamp();
          String pkg = event.getPackageName();
          Long prev = lastUsedByPackage.get(pkg);
          if (prev == null || ts > prev) {
            lastUsedByPackage.put(pkg, ts);
          }
        }
      }

      Map<String, Long> fgByPackage = new HashMap<>();
      List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, now);
      if (stats != null) {
        for (UsageStats stat : stats) {
          if (stat == null) continue;
          String pkg = stat.getPackageName();
          long ts = stat.getLastTimeUsed();
          Long prev = lastUsedByPackage.get(pkg);
          if (prev == null || ts > prev) {
            lastUsedByPackage.put(pkg, ts);
          }
          long existing = fgByPackage.containsKey(pkg) ? fgByPackage.get(pkg) : 0L;
          fgByPackage.put(pkg, existing + stat.getTotalTimeInForeground());
        }
      }

      List<Map.Entry<String, Long>> entries = new ArrayList<>(lastUsedByPackage.entrySet());
      entries.sort(
        (a, b) -> Long.compare(b.getValue(), a.getValue())
      );

      WritableArray array = Arguments.createArray();
      int count = Math.min(maxCount, entries.size());
      for (int i = 0; i < count; i += 1) {
        Map.Entry<String, Long> entry = entries.get(i);
        WritableMap map = Arguments.createMap();
        map.putString("packageName", entry.getKey());
        map.putDouble("lastTimeUsed", entry.getValue());
        map.putDouble("totalTimeInForeground", fgByPackage.containsKey(entry.getKey()) ? fgByPackage.get(entry.getKey()) : 0L);
        array.pushMap(map);
      }

      Log.d(TAG, "getRecentForegroundUsage -> count=" + count);
      promise.resolve(array);
    } catch (Exception e) {
      Log.e(TAG, "getRecentForegroundUsage failed", e);
      promise.reject("USAGE_QUERY_FAILED", e);
    }
  }

  private boolean hasUsageStatsPermission() {
    AppOpsManager appOps =
      (AppOpsManager) getReactApplicationContext().getSystemService(Context.APP_OPS_SERVICE);
    if (appOps == null) return false;

    String packageName = getReactApplicationContext().getPackageName();
    int uid = Process.myUid();
    int mode;

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      mode = appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, uid, packageName);
    } else {
      mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, uid, packageName);
    }

    return mode == AppOpsManager.MODE_ALLOWED;
  }
}
