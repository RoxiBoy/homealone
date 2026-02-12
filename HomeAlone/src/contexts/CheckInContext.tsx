import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Linking, ScrollView } from 'react-native';
import { View, Text, Button, YStack, XStack } from 'tamagui';
import { useAuth } from './AuthContext';
import { apiFetch } from '../config/api';
import { onCheckInPush } from '../services/checkInEvents';
import { clearFullScreenCheckInAlert } from '../services/fullScreenCheckIn';

export type CheckInSession = {
  _id: string;
  status: 'pending' | 'ok' | 'emergency' | 'expired';
  responseDeadline: string; // ISO string
};

type Friend = {
  _id: string;
  name: string;
  phone: string;
  countryCode?: string;
  email?: string;
  priority: number;
};

type CheckInContextValue = {
  activeSession: CheckInSession | null;
  refreshActiveSession: () => Promise<void>;
};

const CheckInContext = createContext<CheckInContextValue | undefined>(undefined);

const POLL_APP_STATE = true; // simple hook to re-check when app comes to foreground

export const CheckInProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [activeSession, setActiveSession] = useState<CheckInSession | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [showEmergencyNotice, setShowEmergencyNotice] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeSessionRef = useRef<CheckInSession | null>(null);
  const tokenRef = useRef<string | null>(null);

  const notificationsSilenced = user?.dnd ?? false;

  // Keep refs in sync with state
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('[CheckInContext] Cleared countdown timer');
    }
  };

  const handleTimerExpired = useCallback(async () => {
    console.log('[CheckInContext] ===== TIMER EXPIRED =====');
    console.log('[CheckInContext] User did not respond to check-in prompt');
    console.log('[CheckInContext] Escalating to emergency protocol...');

    const currentSession = activeSessionRef.current;
    const currentToken = tokenRef.current;

    console.log('[CheckInContext] Current session from ref:', currentSession?._id);
    console.log('[CheckInContext] Current token from ref:', currentToken ? 'present' : 'missing');

    if (!currentSession) {
      console.log('[CheckInContext] No active session found in ref');
      // Still show emergency notice
      setShowEmergencyNotice(true);
      setCountdownSeconds(null);
      return;
    }

    if (!currentToken) {
      console.log('[CheckInContext] No token available');
      setShowEmergencyNotice(true);
      setCountdownSeconds(null);
      return;
    }

    try {
      // First, mark the session as emergency and let the backend trigger notifications
      console.log('[CheckInContext] Calling getActiveSession to trigger server-side escalation');
      const response = await apiFetch<{ session: CheckInSession | null }>('/checkins/active', {
        method: 'GET',
        token: currentToken,
      });

      console.log('[CheckInContext] Server response:', JSON.stringify(response, null, 2));

      if (response.session?.status === 'emergency') {
        console.log('[CheckInContext] ✅ Session escalated to emergency on server');
        console.log('[CheckInContext] 📧 SMS and email should have been sent to priority-1 friend');
        
        setActiveSession(response.session);
        setShowEmergencyNotice(true);
        setCountdownSeconds(null);
        clearTimer();
      } else {
        console.log('[CheckInContext] Unexpected session status:', response.session?.status);
        // Still show emergency notice even if status is unexpected
        setShowEmergencyNotice(true);
        setCountdownSeconds(null);
        clearTimer();
      }
    } catch (err) {
      console.error('[CheckInContext] Error during timer expiration:', err);
      // Still show the emergency notice even if the API call fails
      setShowEmergencyNotice(true);
      setCountdownSeconds(null);
      clearTimer();
    }
  }, []);

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
        clearFullScreenCheckInAlert();
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
              console.log('[CheckInContext] ⏰ TIMER EXPIRED - Initiating emergency protocol');
              clearTimer();
              // Trigger emergency escalation
              handleTimerExpired();
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
  }, [token, handleTimerExpired]);

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

  // When a check-in FCM push is received while the app is in the foreground,
  // push.ts will emit an event. Listen for it and refresh the active session
  // so the in-app "Are you okay?" modal appears.
  useEffect(() => {
    if (!token) return;

    const unsubscribe = onCheckInPush(() => {
      fetchActiveSession();
    });

    return unsubscribe;
  }, [token, fetchActiveSession]);

  // Debug: Log when friends modal state changes
  useEffect(() => {
    console.log('[CheckInContext] showFriendsModal changed:', showFriendsModal);
    console.log('[CheckInContext] friends array:', JSON.stringify(friends, null, 2));
    console.log('[CheckInContext] friends.length:', friends.length);
  }, [showFriendsModal, friends]);

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
      clearFullScreenCheckInAlert();
      setActiveSession(null);
      setCountdownSeconds(null);
      setShowEmergencyNotice(false);
      clearTimer();
    }
  };

  const handleNotOkay = async () => {
    if (!token) {
      console.log('[CheckInContext] No token available');
      return;
    }

    try {
      console.log('[CheckInContext] User pressed "I\'m Not OK" - fetching friends list');
      console.log('[CheckInContext] Token:', token ? 'present' : 'missing');
      
      const friendsList = await apiFetch<Friend[]>('/friends', {
        method: 'GET',
        token,
      });

      console.log('[CheckInContext] Friends API response:', JSON.stringify(friendsList, null, 2));
      console.log('[CheckInContext] Friends count:', friendsList?.length || 0);
      
      setFriends(friendsList || []);
      setShowFriendsModal(true);
      clearFullScreenCheckInAlert();
      setCountdownSeconds(null);
      clearTimer();
      
      console.log('[CheckInContext] Friends modal should now be visible with', friendsList?.length || 0, 'friends');
    } catch (err) {
      console.error('[CheckInContext] Error fetching friends:', err);
      console.error('[CheckInContext] Error details:', JSON.stringify(err, null, 2));
      setFriends([]);
      setShowFriendsModal(true);
      clearFullScreenCheckInAlert();
    }
  };

  const handleCallFriend = (friend: Friend) => {
    const phoneNumber = `${friend.countryCode || ''}${friend.phone}`;
    const url = `tel:${phoneNumber}`;
    console.log('[CheckInContext] Opening phone dialer for', friend.name, 'at', phoneNumber);
    Linking.openURL(url).catch(err => {
      console.error('[CheckInContext] Error opening phone dialer:', err);
    });
  };

  const handleImSafe = async () => {
    if (!token || !activeSession) {
      clearFullScreenCheckInAlert();
      setShowFriendsModal(false);
      setActiveSession(null);
      setCountdownSeconds(null);
      clearTimer();
      return;
    }

    try {
      console.log('[CheckInContext] User pressed "I\'m Safe" - marking session as OK');
      await apiFetch(`/checkins/${activeSession._id}/ok`, {
        method: 'POST',
        token,
      });
      console.log('[CheckInContext] Session marked as OK, timer reset');
    } catch (e) {
      console.log('[CheckInContext] Error marking session as OK:', e);
    } finally {
      clearFullScreenCheckInAlert();
      setShowFriendsModal(false);
      setActiveSession(null);
      setCountdownSeconds(null);
      setShowEmergencyNotice(false);
      clearTimer();
    }
  };

  const handleClearEmergency = async () => {
    if (!token) {
      clearFullScreenCheckInAlert();
      setShowEmergencyNotice(false);
      setActiveSession(null);
      setCountdownSeconds(null);
      clearTimer();
      return;
    }

    try {
      console.log('[CheckInContext] Clearing emergency status');
      await apiFetch('/users/check-in-status', {
        method: 'POST',
        token,
        body: JSON.stringify({ status: 'ok' }),
      });
    } catch (e) {
      console.log('[CheckInContext] Error clearing emergency status', e);
    } finally {
      clearFullScreenCheckInAlert();
      setShowEmergencyNotice(false);
      setActiveSession(null);
      setCountdownSeconds(null);
      clearTimer();
    }
  };

  const value: CheckInContextValue = {
    activeSession,
    refreshActiveSession: fetchActiveSession,
  };

  const showCheckInPrompt =
    !!activeSession &&
    activeSession.status === 'pending' &&
    !showFriendsModal &&
    !notificationsSilenced;

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
                I'm OK
              </Button>
              <Button size="$5" variant="outlined" onPress={() => handleNotOkay ()}>
                I'm Not OK
              </Button>
            </YStack>
          </YStack>
        </View>
      )}

      {/* Friends modal - shown when user presses "I'm Not OK" */}
      {showFriendsModal && (
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
            width="90%"
            maxHeight="80%"
            padding="$4"
            backgroundColor="$backgroundStrong"
            borderRadius="$4"
          >
            <Text fontSize="$7" fontWeight="700" textAlign="center" marginBottom="$3">
              Emergency Contacts
            </Text>
            <Text fontSize="$4" color="$color11" textAlign="center" marginBottom="$4">
              Call someone who can help you
            </Text>

            <View style={{ maxHeight: 300 }}>
              <ScrollView>
                <YStack space="$3" paddingBottom="$4">
                  {friends.length === 0 ? (
                    <View backgroundColor="$backgroundHover" padding="$4" borderRadius="$3">
                      <Text fontSize="$4" textAlign="center" color="$color11">
                        No emergency contacts found. Please add contacts in settings.
                      </Text>
                    </View>
                  ) : (
                    friends
                      .slice()
                      .sort((a, b) => a.priority - b.priority)
                      .map((friend, index) => (
                        <View
                          key={friend._id || `friend-${index}`}
                          backgroundColor="$backgroundHover"
                          padding="$3"
                          borderRadius="$3"
                          marginBottom="$2"
                        >
                          <XStack alignItems="center" justifyContent="space-between">
                            <YStack flex={1} marginRight="$3">
                              <Text fontSize="$5" fontWeight="600">
                                {friend.name}
                              </Text>
                              <Text fontSize="$3" color="$color11">
                                Priority {friend.priority}
                              </Text>
                              <Text fontSize="$3" color="$color11">
                                {friend.countryCode || ''}{friend.phone}
                              </Text>
                            </YStack>
                            <Button
                              size="$4"
                              backgroundColor="$green9"
                              onPress={() => handleCallFriend(friend)}
                            >
                              Call
                            </Button>
                          </XStack>
                        </View>
                      ))
                  )}
                </YStack>
              </ScrollView>
            </View>

            <Button
              size="$5"
              marginTop="$4"
              backgroundColor="$blue9"
              onPress={handleImSafe}
            >
              I'm Safe Now
            </Button>
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
              Your emergency contact has been notified via SMS and email (if provided). 
              They should reach out to you soon.
            </Text>

            <Button marginTop="$3" onPress={handleClearEmergency}>
              I'm safe now
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
