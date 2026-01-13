import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { View, Text, Button, YStack } from 'tamagui';
import { useAuth } from './AuthContext';
import { apiFetch } from '../config/api';

export type CheckInSession = {
  _id: string;
  status: 'pending' | 'ok' | 'emergency' | 'expired';
  responseDeadline: string; // ISO string
};

type CheckInContextValue = {
  activeSession: CheckInSession | null;
  refreshActiveSession: () => Promise<void>;
};

const CheckInContext = createContext<CheckInContextValue | undefined>(undefined);

const POLL_APP_STATE = true; // simple hook to re-check when app comes to foreground

export const CheckInProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [activeSession, setActiveSession] = useState<CheckInSession | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [showEmergencyNotice, setShowEmergencyNotice] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('[CheckInContext] Cleared countdown timer');
    }
  };

  const fetchActiveSession = useCallback(async () => {
    if (!token) return;

    console.log('[CheckInContext] Fetching active session from server');

    try {
      const data = await apiFetch<{ session: CheckInSession | null }>('/checkins/active', {
        method: 'GET',
        token,
      });

      if (!data.session) {
        console.log('[CheckInContext] No active check-in session');
        setActiveSession(null);
        setCountdownSeconds(null);
        setShowEmergencyNotice(false);
        clearTimer();
        return;
      }

      const session = data.session;
      console.log('[CheckInContext] Active session received', session);
      setActiveSession(session);

      const deadline = new Date(session.responseDeadline).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.round((deadline - now) / 1000));

      if (session.status === 'pending' && remaining > 0) {
        console.log('[CheckInContext] Starting countdown', remaining, 'seconds');
        setCountdownSeconds(remaining);
        clearTimer();
        intervalRef.current = setInterval(() => {
          setCountdownSeconds(prev => {
            if (prev === null) return null;
            if (prev <= 1) {
              clearTimer();
              // If still pending when countdown hits zero, escalate to emergency
              if (session.status === 'pending') {
                handleRespondEmergency(session._id, true);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (session.status === 'emergency') {
        console.log('[CheckInContext] Session already in emergency state');
        setCountdownSeconds(null);
        setShowEmergencyNotice(true);
        clearTimer();
      } else {
        setCountdownSeconds(null);
        clearTimer();
      }
    } catch (e) {
      console.log('[CheckInContext] Error fetching active session', e);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setActiveSession(null);
      setCountdownSeconds(null);
      setShowEmergencyNotice(false);
      clearTimer();
      return;
    }

    fetchActiveSession();
  }, [token, fetchActiveSession]);

  useEffect(() => {
    if (!POLL_APP_STATE || !token) return;

    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        fetchActiveSession();
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [token, fetchActiveSession]);

  const handleRespondOk = async () => {
    if (!token || !activeSession) return;

    try {
      console.log('[CheckInContext] Sending OK response for session', activeSession._id);
      await apiFetch(`/checkins/${activeSession._id}/ok`, {
        method: 'POST',
        token,
      });
      console.log('[CheckInContext] OK response acknowledged by server');
    } catch (e) {
      console.log('[CheckInContext] Error sending OK response', e);
    } finally {
      setActiveSession(null);
      setCountdownSeconds(null);
      setShowEmergencyNotice(false);
      clearTimer();
    }
  };

  const handleRespondEmergency = async (id?: string, fromTimeout = false) => {
    const sessionId = id ?? activeSession?._id;
    if (!token || !sessionId) return;

    try {
      console.log('[CheckInContext] Sending EMERGENCY response for session', sessionId, 'fromTimeout=', fromTimeout);
      await apiFetch(`/checkins/${sessionId}/emergency`, {
        method: 'POST',
        token,
      });
      console.log('[CheckInContext] Emergency response acknowledged by server');
    } catch (e) {
      console.log('[CheckInContext] Error sending emergency response', e);
    } finally {
      setShowEmergencyNotice(true);
      setCountdownSeconds(null);
      clearTimer();
      // keep activeSession so we know why we're in emergency
    }
  };

  const value: CheckInContextValue = {
    activeSession,
    refreshActiveSession: fetchActiveSession,
  };

  const showCheckInPrompt = !!activeSession && activeSession.status === 'pending';

  return (
    <CheckInContext.Provider value={value}>
      {children}

      {/* Full-screen check-in alert */}
      {showCheckInPrompt && countdownSeconds !== null && (
        <View
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0,0,0,0.8)"
          justifyContent="center"
          alignItems="center"
        >
          <YStack
            width="85%"
            padding="$4"
            space="$3"
            backgroundColor="$backgroundStrong"
            borderRadius="$4"
          >
            <Text fontSize="$7" fontWeight="700" textAlign="center">
              Are you okay?
            </Text>
            <Text fontSize="$4" color="$color11" textAlign="center">
              Please confirm your safety.
            </Text>
            <Text fontSize="$4" fontWeight="600" textAlign="center">
              Time remaining: {countdownSeconds}s
            </Text>

            <YStack space="$2" marginTop="$2">
              <Button size="$5" onPress={handleRespondOk}>
                Im OK
              </Button>
              <Button size="$5" variant="outlined" onPress={() => handleRespondEmergency()}>
                Im Not OK
              </Button>
            </YStack>
          </YStack>
        </View>
      )}

      {/* Emergency-protocol-initiated notice */}
      {showEmergencyNotice && (
        <View
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0,0,0,0.8)"
          justifyContent="center"
          alignItems="center"
        >
          <YStack
            width="85%"
            padding="$4"
            space="$3"
            backgroundColor="$backgroundStrong"
            borderRadius="$4"
          >
            <Text fontSize="$7" fontWeight="700" textAlign="center">
              Emergency protocol initiated
            </Text>
            <Text fontSize="$4" color="$color11" textAlign="center">
              We detected no response or a distress signal. In a future version, your emergency
              contacts will be alerted from the server.
            </Text>

            <Button marginTop="$3" onPress={() => setShowEmergencyNotice(false)}>
              Dismiss
            </Button>
          </YStack>
        </View>
      )}
    </CheckInContext.Provider>
  );
};

export const useCheckIn = (): CheckInContextValue => {
  const ctx = useContext(CheckInContext);
  if (!ctx) {
    throw new Error('useCheckIn must be used within a CheckInProvider');
  }
  return ctx;
};
