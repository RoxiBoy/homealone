package com.mynewapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.PowerManager;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class ActivityDetectionModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private BroadcastReceiver screenReceiver;
    private boolean isRegistered = false;
    private static final String TAG = "ActivityDetectionModule";

    public ActivityDetectionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        Log.d(TAG, "Module initialized");
    }

    @Override
    public String getName() {
        return "ActivityDetectionModule";
    }

    @ReactMethod
    public void startListening() {
        Log.d(TAG, "startListening called");
        if (!isRegistered) {
            screenReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    String action = intent.getAction();
                    Log.d(TAG, "Broadcast received: " + action);

                    if (Intent.ACTION_SCREEN_OFF.equals(action)) {
                        Log.d(TAG, "Screen OFF detected");
                        sendEvent("screenLocked", null);
                    } else if (Intent.ACTION_USER_PRESENT.equals(action)) {
                        Log.d(TAG, "User unlocked the screen (ACTION_USER_PRESENT)");
                        sendEvent("screenUnlocked", null);
                    } else if (Intent.ACTION_SCREEN_ON.equals(action)) {
                        Log.d(TAG, "Screen ON detected");
                        // Optional: may also consider emitting screenUnlocked here
                    }
                }
            };

            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_SCREEN_OFF);
            filter.addAction(Intent.ACTION_SCREEN_ON);
            filter.addAction(Intent.ACTION_USER_PRESENT);

            reactContext.registerReceiver(screenReceiver, filter);
            isRegistered = true;
            Log.d(TAG, "BroadcastReceiver registered");
        } else {
            Log.d(TAG, "BroadcastReceiver already registered");
        }
    }

    @ReactMethod
    public void stopListening() {
        Log.d(TAG, "stopListening called");
        if (isRegistered && screenReceiver != null) {
            reactContext.unregisterReceiver(screenReceiver);
            isRegistered = false;
            Log.d(TAG, "BroadcastReceiver unregistered");
        } else {
            Log.d(TAG, "BroadcastReceiver not registered");
        }
    }

    private void sendEvent(String eventName, Object params) {
        Log.d(TAG, "Sending event to JS: " + eventName);
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    @ReactMethod
    public boolean isScreenLocked() {
        PowerManager pm = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
        boolean locked = !pm.isInteractive();
        Log.d(TAG, "isScreenLocked called, result: " + locked);
        return locked;
    }

    
    @ReactMethod
    public void testEvent() {
        Log.d(TAG, "testEvent called");
        sendEvent("screenLocked", null); // just to test sending to JS
    }
}

