import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { View, Text, Button, YStack, Input } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../config/api';
import { initPush } from '../../services/push';
import { AppCard } from '../../components/AppCard';
import { AppSectionHeader } from '../../components/AppSectionHeader';
import { colors } from '../../theme/colors';

const TEST_SETTINGS_KEY = '@homealone/test-settings';

const TestTab: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState('0.1');
  const [countdownSeconds, setCountdownSeconds] = useState('10');

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
      const intervalHours = intervalM / 60;
      const countdownMinutes = countdownS / 60;

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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <YStack space={16} padding={16}>
        <AppSectionHeader
          title="Test FCM + check-in flow"
          subtitle="Use this screen to send a basic FCM test notification and arm a very short server-driven check-in interval so you can see the full flow quickly."
        />

        <AppCard accent="primary">
          <Text fontSize={17} fontWeight="600" color={colors.text.primary} marginBottom={12}>
            1. Send a basic test notification
          </Text>
          <Button
            height={48}
            borderRadius={12}
            backgroundColor={colors.primary.base}
            borderWidth={0}
            disabled={sending}
            opacity={sending ? 0.6 : 1}
            onPress={handleSendTestNotification}
          >
            <Text fontSize={15} fontWeight="600" color="#FFFFFF">
              {sending ? 'Sending\u2026' : 'Send test notification'}
            </Text>
          </Button>
        </AppCard>

        <AppCard>
          <Text fontSize={17} fontWeight="600" color={colors.text.primary} marginBottom={12}>
            2. Arm a short check-in interval
          </Text>
          <Text fontSize={13} color={colors.text.secondary} marginBottom={12}>
            Set a very small check-in interval and response window. The backend scheduler will create
            a check-in session and send an FCM push.
          </Text>

          <YStack space={12}>
            <View>
              <Text fontSize={13} color={colors.text.secondary} marginBottom={4}>
                Check-in interval (minutes)
              </Text>
              <Input
                value={intervalMinutes}
                onChangeText={setIntervalMinutes}
                keyboardType="numeric"
                placeholder="e.g. 0.1 (\u2248 6 seconds)"
                color={colors.text.primary}
                placeholderTextColor={colors.text.tertiary}
                height={48}
                borderRadius={10}
                fontSize={15}
                borderWidth={1}
                borderColor={colors.border}
                paddingHorizontal={14}
                backgroundColor={colors.bg.base}
              />
            </View>

            <View>
              <Text fontSize={13} color={colors.text.secondary} marginBottom={4}>
                Response window (seconds)
              </Text>
              <Input
                value={countdownSeconds}
                onChangeText={setCountdownSeconds}
                keyboardType="numeric"
                placeholder="e.g. 10"
                color={colors.text.primary}
                placeholderTextColor={colors.text.tertiary}
                height={48}
                borderRadius={10}
                fontSize={15}
                borderWidth={1}
                borderColor={colors.border}
                paddingHorizontal={14}
                backgroundColor={colors.bg.base}
              />
            </View>

            <Button
              height={48}
              borderRadius={12}
              backgroundColor={colors.primary.base}
              borderWidth={0}
              marginTop={4}
              disabled={sending}
              opacity={sending ? 0.6 : 1}
              onPress={handleArmShortCheckIn}
            >
              <Text fontSize={15} fontWeight="600" color="#FFFFFF">
                {sending ? 'Saving\u2026' : 'Save & arm short check-in'}
              </Text>
            </Button>
          </YStack>
        </AppCard>

        <AppCard>
          <Text fontSize={17} fontWeight="600" color={colors.text.primary} marginBottom={12}>
            Logs
          </Text>
          {logs.length === 0 ? (
            <Text fontSize={13} color={colors.text.tertiary}>
              No logs yet. Press the button above to send a test notification.
            </Text>
          ) : (
            <YStack space={6}>
              {logs
                .slice()
                .reverse()
                .map(line => (
                  <Text key={line} fontSize={11} color={colors.text.tertiary} fontFamily="monospace">
                    {line}
                  </Text>
                ))}
            </YStack>
          )}
        </AppCard>
      </YStack>
    </ScrollView>
  );
};

export default TestTab;
