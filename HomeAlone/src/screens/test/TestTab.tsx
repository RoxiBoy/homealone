import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { View, Text, Button, YStack, Input } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../config/api';
import { initPush } from '../../services/push';

const TEST_SETTINGS_KEY = '@homealone/test-settings';

const TestTab: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState('0.1'); // ~6 seconds
  const [countdownSeconds, setCountdownSeconds] = useState('10'); // 10 seconds

  const appendLog = (message: string) => {
    const line = `${new Date().toISOString()} - ${message}`;
    console.log('[TestTab]', line);
    setLogs(prev => [...prev.slice(-19), line]);
  };

  const handleSendTestNotification = async () => {
    if (!token) {
      appendLog('No auth token available; please log in first.');
      return;
    }

    setSending(true);
    try {
      const pushInit = await initPush(token);
      appendLog(`Push init: enabled=${pushInit.enabled}${pushInit.reason ? ` (${pushInit.reason})` : ''}`);

      appendLog('Requesting backend to send a basic FCM test notification...');

      const result = await apiFetch<{ message?: string; reason?: string }>('/users/test-notification', {
        method: 'POST',
        token,
      });

      appendLog(`Server response: ${result?.message || 'accepted'}${result?.reason ? ` (reason=${result.reason})` : ''}`);
      appendLog('If notifications are enabled, you should see a test notification shortly.');
    } catch (e: any) {
      appendLog(`Error sending test notification: ${e?.message || String(e)}`);
    } finally {
      setSending(false);
    }
  };

  // Arm a short-interval check-in using the real scheduler + /users/settings.
  const handleArmShortCheckIn = async () => {
    if (!token) {
      appendLog('No auth token available; please log in first.');
      return;
    }

    const intervalM = Number(intervalMinutes);
    const countdownS = Number(countdownSeconds);

    if (!Number.isFinite(intervalM) || !Number.isFinite(countdownS) || intervalM <= 0 || countdownS <= 0) {
      appendLog('Invalid test values. Interval and countdown must be positive numbers.');
      return;
    }

    setSending(true);

    try {
      const intervalHours = intervalM / 60; // server expects hours
      const countdownMinutes = countdownS / 60; // server field is minutes

      appendLog(
        `Saving short check-in settings: interval=${intervalM}m (${intervalHours}h), countdown=${countdownS}s (${countdownMinutes}m)`,
      );

      if (intervalM < 15) {
        appendLog(
          'Note: interval < 15 minutes is only good for notification smoke tests. Android background usage polling is throttled, so inactivity-based postponing cannot be validated reliably at this interval.',
        );
      }

      await AsyncStorage.setItem(
        TEST_SETTINGS_KEY,
        JSON.stringify({ checkInIntervalHours: intervalHours, emergencyCountdownMinutes: countdownMinutes }),
      );

      // Test helper: clear emergency/pending state so a fresh short timer can arm reliably.
      try {
        await apiFetch('/users/check-in-status', {
          method: 'POST',
          token,
          body: JSON.stringify({ status: 'ok' }),
        });
      } catch (e: any) {
        appendLog(`Non-blocking: could not clear emergency state (${e?.message || String(e)})`);
      }

      try {
        const active = await apiFetch<{ session: { _id: string; status: string } | null }>('/checkins/active', {
          method: 'GET',
          token,
        });
        if (active.session?.status === 'pending') {
          await apiFetch(`/checkins/${active.session._id}/ok`, {
            method: 'POST',
            token,
          });
          appendLog('Cleared existing pending check-in session before arming.');
        }
      } catch (e: any) {
        appendLog(`Non-blocking: could not inspect active session (${e?.message || String(e)})`);
      }

      const updatedUser = await apiFetch<any>('/users/settings', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          checkInIntervalHours: intervalHours,
          emergencyCountdownMinutes: countdownMinutes,
          dnd: false,
        }),
      });

      appendLog(
        `Server settings saved: dnd=${updatedUser?.dnd}, effectiveDnd=${updatedUser?.effectiveDnd}, reason=${updatedUser?.dndReason || 'none'}, status=${updatedUser?.checkInStatus}, nextCheckInAt=${updatedUser?.nextCheckInAt || 'null'}`,
      );

      const delayMs = intervalM * 60 * 1000;
      const fireAt = new Date(Date.now() + delayMs);
      appendLog(
        `Server scheduler will start a check-in around ${fireAt.toLocaleTimeString()}. When it fires, you should receive an FCM push and see the in-app "Are you okay?" prompt.`,
      );
    } catch (e: any) {
      appendLog(`Error arming short check-in: ${e?.message || String(e)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack space="$4" padding="$4">
        <Text fontSize="$7" fontWeight="700">
          Test FCM + check-in flow
        </Text>
        <Text fontSize="$4" color="$color11">
          Use this screen to (1) send a basic FCM test notification and (2) arm a very short
          server-driven check-in interval so you can see the full "Are you okay?" flow quickly.
          Very short intervals (for example 0.1 minute) are not valid for testing inactivity-based
          postponing in background.
        </Text>

        <View backgroundColor="$backgroundStrong" borderRadius="$4" padding="$4">
          <Text fontSize="$5" fontWeight="600" marginBottom="$2">
            1. Send a basic test notification
          </Text>
          <Button disabled={sending} onPress={handleSendTestNotification}>
            {sending ? 'Sending…' : 'Send test notification'}
          </Button>
        </View>

        <View backgroundColor="$backgroundStrong" borderRadius="$4" padding="$4" marginTop="$4">
          <Text fontSize="$5" fontWeight="600" marginBottom="$2">
            2. Arm a short check-in interval
          </Text>
          <Text fontSize="$3" color="$color11" marginBottom="$2">
            Set a very small check-in interval and response window. The backend scheduler will create
            a check-in session and send an FCM push. You should then see the in-app "Are you okay?"
            modal with "I'm OK" / "I'm Not OK".
          </Text>

          <YStack space="$2">
            <View>
              <Text fontSize="$3" marginBottom="$1">
                Check-in interval (minutes)
              </Text>
              <Input
                value={intervalMinutes}
                onChangeText={setIntervalMinutes}
                keyboardType="numeric"
                placeholder="e.g. 0.1 (≈ 6 seconds)"
              />
            </View>

            <View>
              <Text fontSize="$3" marginBottom="$1">
                Response window (seconds)
              </Text>
              <Input
                value={countdownSeconds}
                onChangeText={setCountdownSeconds}
                keyboardType="numeric"
                placeholder="e.g. 10"
              />
            </View>

            <Button marginTop="$2" disabled={sending} onPress={handleArmShortCheckIn}>
              {sending ? 'Saving…' : 'Save & arm short check-in'}
            </Button>
          </YStack>
        </View>

        <View backgroundColor="$backgroundStrong" borderRadius="$4" padding="$4" marginTop="$2">
          <Text fontSize="$5" fontWeight="600" marginBottom="$2">
            Logs
          </Text>
          {logs.length === 0 ? (
            <Text fontSize="$3" color="$color11">
              No logs yet. Press the button above to send a test notification.
            </Text>
          ) : (
            <YStack space="$1">
              {logs
                .slice()
                .reverse()
                .map(line => (
                  <Text key={line} fontSize="$2" color="$color11">
                    {line}
                  </Text>
                ))}
            </YStack>
          )}
        </View>
      </YStack>
    </ScrollView>
  );
};

export default TestTab;
