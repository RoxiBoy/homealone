import React, { useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { View, Text, Input, Button, YStack } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { useCheckIn } from '../../contexts/CheckInContext';
import { apiFetch } from '../../config/api';

const TEST_SETTINGS_KEY = '@homealone/test-settings';

const TestTab: React.FC = () => {
  const { token } = useAuth();
  const { refreshActiveSession } = useCheckIn();
  const [intervalHours, setIntervalHours] = useState('0.001'); // default tiny interval for tests
  const [countdownMinutes, setCountdownMinutes] = useState('0.05'); // default tiny countdown for tests
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const appendLog = (message: string) => {
    const line = `${new Date().toISOString()} - ${message}`;
    console.log('[TestTab]', line);
    setLogs(prev => [...prev.slice(-19), line]);
  };

  const simulateCheckIn = async () => {
    if (!token) {
      appendLog('No token available; please log in first.');
      return;
    }

    const interval = Number(intervalHours);
    const countdown = Number(countdownMinutes);

    if (!Number.isFinite(interval) || !Number.isFinite(countdown) || countdown <= 0) {
      appendLog('Invalid test values. Interval and countdown must be numbers; countdown > 0.');
      return;
    }

    setRunning(true);

    try {
      appendLog(`Saving test settings: interval=${interval}h, countdown=${countdown}m`);

      await AsyncStorage.setItem(
        TEST_SETTINGS_KEY,
        JSON.stringify({ checkInIntervalHours: interval, emergencyCountdownMinutes: countdown }),
      );

      await apiFetch('/users/settings', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          checkInIntervalHours: interval,
          emergencyCountdownMinutes: countdown,
        }),
      });

      const delayMs = interval * 60 * 60 * 1000;
      const fireAt = new Date(Date.now() + delayMs);
      appendLog(
        `Server check-in will be started after interval; simulating scheduler with delayMs=${delayMs} (fires at ${fireAt.toLocaleTimeString()})`,
      );

      // Clear any previous scheduled test
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        appendLog('Cleared previously scheduled test check-in.');
      }

      timeoutRef.current = setTimeout(async () => {
        try {
          appendLog('Interval elapsed; calling /checkins/start to create a server check-in session.');

          const startResponse = await apiFetch<{
            session: { _id: string };
            countdownSeconds: number;
          }>('/checkins/start', {
            method: 'POST',
            token,
          });

          appendLog(
            `Check-in session created: id=${startResponse.session._id}, countdownSeconds=${startResponse.countdownSeconds}`,
          );

          await refreshActiveSession();
          appendLog('Requested active session refresh in CheckInContext (prompt should appear if pending).');
        } catch (e: any) {
          appendLog(`Error while starting test check-in after delay: ${e?.message || String(e)}`);
        }
      }, delayMs);
    } catch (e: any) {
      appendLog(`Error during simulation setup: ${e?.message || String(e)}`);
      setRunning(false);
      return;
    }

    setRunning(false);
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack space="$4" padding="$4">
        <Text fontSize="$7" fontWeight="700">
          Test check-in flow
        </Text>
        <Text fontSize="$4" color="$color11">
          Use this screen to simulate the safety loop with short timers so you do not have to wait
          hours.
        </Text>

        <View backgroundColor="$backgroundStrong" borderRadius="$4" padding="$4">
          <Text fontSize="$5" fontWeight="600" marginBottom="$2">
            Timers
          </Text>

          <YStack space="$2">
            <View>
              <Text fontSize="$3" marginBottom="$1">
                Check-in interval (hours)
              </Text>
              <Input
                value={intervalHours}
                onChangeText={setIntervalHours}
                keyboardType="numeric"
                placeholder="e.g. 0.001"
              />
            </View>

            <View>
              <Text fontSize="$3" marginBottom="$1">
                Response window (minutes)
              </Text>
              <Input
                value={countdownMinutes}
                onChangeText={setCountdownMinutes}
                keyboardType="numeric"
                placeholder="e.g. 0.05"
              />
            </View>

            <Button marginTop="$3" disabled={running} onPress={simulateCheckIn}>
              {running ? 'Running test…' : 'Simulate check-in now'}
            </Button>
          </YStack>
        </View>

        <View backgroundColor="$backgroundStrong" borderRadius="$4" padding="$4" marginTop="$2">
          <Text fontSize="$5" fontWeight="600" marginBottom="$2">
            Logs
          </Text>
          {logs.length === 0 ? (
            <Text fontSize="$3" color="$color11">
              No logs yet. Run a simulation to see the protocol steps.
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
