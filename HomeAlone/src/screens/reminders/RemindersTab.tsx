import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { View, Text, Button, YStack, XStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../config/api';
import { AppCard } from '../../components/AppCard';
import { AppEmptyState } from '../../components/AppEmptyState';
import { AppSectionHeader } from '../../components/AppSectionHeader';
import { colors } from '../../theme/colors';
import ReminderForm, { ReminderFormValues, defaultFormValues } from './ReminderForm';

export type Reminder = {
  _id: string;
  user: string;
  title: string;
  type: 'Medicine' | 'Checkup';
  dosage?: string;
  times?: string[];
  time?: string;
  date?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  lastNotifiedAt?: string;
  createdAt: string;
  updatedAt: string;
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatTimesList = (times: string[]) => {
  return times
    .filter(t => t.trim())
    .map(t => {
      try {
        const [h, m] = t.split(':');
        const hour = parseInt(h, 10);
        const suffix = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 === 0 ? 12 : hour % 12;
        return `${hour12}:${m} ${suffix}`;
      } catch {
        return t;
      }
    })
    .join('  ·  ');
};

const RemindersTab: React.FC = () => {
  const { token } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<ReminderFormValues>(defaultFormValues('Medicine'));

  useEffect(() => {
    if (!token) return;
    loadReminders();
  }, [token]);

  const loadReminders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<Reminder[]>('/reminders', { method: 'GET', token });
      setReminders(data);
    } catch (e: any) {
      console.warn('[RemindersTab] Failed to load reminders', e);
    } finally {
      setLoading(false);
    }
  };

  const startNew = useCallback(() => {
    setEditingId(undefined);
    setForm(defaultFormValues('Medicine'));
    setError(null);
  }, []);

  const startEdit = useCallback((reminder: Reminder) => {
    setEditingId(reminder._id);
    setForm({
      title: reminder.title,
      type: reminder.type,
      dosage: reminder.dosage || '',
      times: reminder.times && reminder.times.length > 0 ? reminder.times : [''],
      time: reminder.time || '',
      date: reminder.date ? reminder.date.split('T')[0] : '',
      address: reminder.address || '',
      notes: reminder.notes || '',
    });
    setError(null);
  }, []);

  const updateField = <K extends keyof ReminderFormValues>(
    key: K,
    value: ReminderFormValues[K],
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!token) return;

    const isMedicine = form.type === 'Medicine';

    if (!form.title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }

    if (isMedicine) {
      const validTimes = form.times.filter(t => t.trim());
      if (validTimes.length === 0) {
        Alert.alert('Validation', 'At least one time is required for medication reminders.');
        return;
      }
    } else {
      if (!form.date.trim()) {
        Alert.alert('Validation', 'Date is required for appointment reminders.');
        return;
      }
      if (!form.time.trim()) {
        Alert.alert('Validation', 'Time is required for appointment reminders.');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, any> = {
        title: form.title.trim(),
        type: form.type,
        notes: form.notes.trim() || undefined,
      };

      if (isMedicine) {
        payload.dosage = form.dosage.trim() || undefined;
        payload.times = form.times.filter(t => t.trim());
      } else {
        payload.time = form.time.trim();
        payload.date = form.date.trim();
        payload.address = form.address.trim() || undefined;
      }

      if (editingId) {
        await apiFetch<Reminder>(`/reminders/${editingId}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch<Reminder>('/reminders', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        });
      }

      await loadReminders();
      Alert.alert('Success', 'Reminder saved successfully.');
      startNew();
    } catch (e: any) {
      console.warn('[RemindersTab] Failed to save', e);
      setError(e?.message || 'Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;

    Alert.alert(
      'Delete reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/reminders/${id}`, { method: 'DELETE', token });
              await loadReminders();
              if (editingId === id) {
                startNew();
              }
            } catch (e: any) {
              setError(e?.message || 'Failed to delete reminder');
            }
          },
        },
      ],
    );
  };

  const medicineReminders = reminders.filter(r => r.type === 'Medicine');
  const checkupReminders = reminders.filter(r => r.type === 'Checkup');

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <YStack space={16} padding={16}>
        <AppSectionHeader
          title="Reminders"
          subtitle="Manage your medication and appointment reminders."
        />

        {/* Count summary */}
        {!loading && reminders.length > 0 && (
          <XStack alignItems="center" space={16}>
            <XStack alignItems="center" space={6}>
              <View width={8} height={8} borderRadius={4} backgroundColor={colors.primary.base} />
              <Text fontSize={13} color={colors.text.tertiary}>
                {medicineReminders.length} medication
              </Text>
            </XStack>
            <XStack alignItems="center" space={6}>
              <View width={8} height={8} borderRadius={4} backgroundColor={colors.secondary.base} />
              <Text fontSize={13} color={colors.text.tertiary}>
                {checkupReminders.length} appointment{checkupReminders.length !== 1 ? 's' : ''}
              </Text>
            </XStack>
          </XStack>
        )}

        {loading ? (
          <Text fontSize={15} color={colors.text.secondary} textAlign="center" marginTop={16}>
            Loading reminders...
          </Text>
        ) : (
          <>
            {/* Medicine section */}
            {medicineReminders.length > 0 && (
              <YStack space={10}>
                <Text fontSize={14} fontWeight="800" color={colors.text.tertiary} textTransform="uppercase" letterSpacing={0.8}>
                    Medication
                  </Text>
                {medicineReminders.map(r => (
                  <AppCard key={r._id} accent="primary">
                    <XStack alignItems="flex-start" space={12}>
                      <YStack flex={1} space={2}>
                        <Text fontSize={17} fontWeight="700" color={colors.text.primary}>
                          {r.title}
                        </Text>
                        {r.dosage && (
                          <Text fontSize={14} color={colors.text.secondary}>
                            {r.dosage}
                          </Text>
                        )}
                        {r.times && r.times.length > 0 && (
                          <Text fontSize={14} fontWeight="600" color={colors.primary.dark} marginTop={2}>
                            {formatTimesList(r.times)}
                          </Text>
                        )}
                        {r.notes && (
                          <Text fontSize={13} color={colors.text.tertiary} marginTop={2}>
                            {r.notes}
                          </Text>
                        )}
                      </YStack>
                      <Button
                        size="$2"
                        height={36}
                        borderRadius={10}
                        backgroundColor="transparent"
                        borderWidth={1}
                        borderColor={colors.border}
                        paddingHorizontal={14}
                        onPress={() => startEdit(r)}
                      >
                        <Text fontSize={13} fontWeight="600" color={colors.primary.base}>
                          Edit
                        </Text>
                      </Button>
                    </XStack>
                  </AppCard>
                ))}
              </YStack>
            )}

            {/* Checkup section */}
            {checkupReminders.length > 0 && (
              <YStack space={10}>
                <Text fontSize={14} fontWeight="800" color={colors.text.tertiary} textTransform="uppercase" letterSpacing={0.8}>
                    Appointments
                  </Text>
                {checkupReminders.map(r => (
                  <AppCard key={r._id} accent="warning">
                    <XStack alignItems="flex-start" space={12}>
                      <YStack flex={1} space={2}>
                        <Text fontSize={17} fontWeight="700" color={colors.text.primary}>
                          {r.title}
                        </Text>
                        {r.date && (
                          <Text fontSize={14} fontWeight="600" color={colors.secondary.dark} marginTop={2}>
                            {formatDate(r.date)}{r.time ? ` at ${r.time}` : ''}
                          </Text>
                        )}
                        {r.address && (
                          <Text fontSize={14} color={colors.text.secondary}>
                            {r.address}
                          </Text>
                        )}
                        {r.notes && (
                          <Text fontSize={13} color={colors.text.tertiary} marginTop={2}>
                            {r.notes}
                          </Text>
                        )}
                      </YStack>
                      <Button
                        size="$2"
                        height={36}
                        borderRadius={10}
                        backgroundColor="transparent"
                        borderWidth={1}
                        borderColor={colors.border}
                        paddingHorizontal={14}
                        onPress={() => startEdit(r)}
                      >
                        <Text fontSize={13} fontWeight="600" color={colors.primary.base}>
                          Edit
                        </Text>
                      </Button>
                    </XStack>
                  </AppCard>
                ))}
              </YStack>
            )}

            {/* Empty state */}
            {reminders.length === 0 && (
              <AppEmptyState
                title="No reminders yet"
                subtitle="Add medication or appointment reminders to stay on top of your health."
              />
            )}

            {/* Inline form */}
            <ReminderForm
              editingId={editingId}
              form={form}
              saving={saving}
              error={error}
              onUpdateField={updateField}
              onSave={handleSave}
              onNew={startNew}
              onDelete={editingId ? () => handleDelete(editingId) : undefined}
            />

            {/* How it works */}
            <AppCard>
              <YStack space={8}>
                <Text fontSize={17} fontWeight="700" color={colors.text.primary}>
                  How reminders work
                </Text>
                <XStack gap={10} alignItems="flex-start">
                  <Text fontSize={14} fontWeight="700" color={colors.primary.base}>1.</Text>
                  <Text fontSize={14} color={colors.text.secondary} flex={1}>
                    Medication reminders repeat daily at your set times.
                  </Text>
                </XStack>
                <XStack gap={10} alignItems="flex-start">
                  <Text fontSize={14} fontWeight="700" color={colors.secondary.base}>2.</Text>
                  <Text fontSize={14} color={colors.text.secondary} flex={1}>
                    Appointment reminders notify you daily starting 3 days before.
                  </Text>
                </XStack>
                <XStack gap={10} alignItems="flex-start">
                  <Text fontSize={14} fontWeight="700" color={colors.accent.success}>3.</Text>
                  <Text fontSize={14} color={colors.text.secondary} flex={1}>
                    You will receive a push notification at each reminder time.
                  </Text>
                </XStack>
              </YStack>
            </AppCard>
          </>
        )}
      </YStack>
    </ScrollView>
  );
};

export default RemindersTab;
