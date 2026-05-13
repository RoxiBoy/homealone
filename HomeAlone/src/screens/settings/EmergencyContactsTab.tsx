import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Alert, Modal, TouchableOpacity, FlatList } from 'react-native';
import { View, Text, Input, Button, YStack, XStack } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../config/api';
import { COUNTRY_CODES } from '../../assets/countryCodes';
import { AppCard } from '../../components/AppCard';
import { AppEmptyState } from '../../components/AppEmptyState';
import { AppStatusBadge } from '../../components/AppStatusBadge';
import { AppSectionHeader } from '../../components/AppSectionHeader';
import { colors } from '../../theme/colors';

const EMERGENCY_CONTACTS_KEY = '@homealone/emergency-contacts';

export type EmergencyContact = {
  _id?: string;
  name: string;
  countryCode?: string;
  phone: string;
  email?: string;
  relationship?: string;
  priority: number;
};

const EmergencyContactsTab: React.FC = () => {
  const { token } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [form, setForm] = useState<Omit<EmergencyContact, '_id'>>({
    name: '',
    countryCode: '+1',
    phone: '',
    email: '',
    relationship: '',
    priority: 1,
  });

  const filteredCountryCodes = useMemo(() => {
    const query = countrySearchQuery.toLowerCase().trim();
    if (!query) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      c =>
        c.code.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query),
    );
  }, [countrySearchQuery]);

  const hasRoomForMore = useMemo(() => contacts.length < 3, [contacts]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadContacts = async () => {
      setLoading(true);
      try {
        const remote = await apiFetch<EmergencyContact[]>('/friends', {
          method: 'GET',
          token,
        });

        const sorted = [...remote].sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3));
        setContacts(sorted);
        await AsyncStorage.setItem(EMERGENCY_CONTACTS_KEY, JSON.stringify(sorted));
      } catch {
        console.warn('[EmergencyContactsTab] Failed to load from server, falling back to device');
        try {
          const stored = await AsyncStorage.getItem(EMERGENCY_CONTACTS_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as EmergencyContact[];
            const sorted = [...parsed].sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3));
            setContacts(sorted);
          }
        } catch (localError) {
          console.warn('[EmergencyContactsTab] Failed to load from device', localError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [token]);

  const startNewContact = () => {
    const usedPriorities = new Set(contacts.map(c => c.priority));
    const nextPriority = [1, 2, 3].find(p => !usedPriorities.has(p)) ?? 3;
    setEditingId(undefined);
    setForm({ name: '', countryCode: '+1', phone: '', email: '', relationship: '', priority: nextPriority });
  };

  const startEditContact = (contact: EmergencyContact) => {
    setEditingId(contact._id);
    setForm({
      name: contact.name,
      countryCode: contact.countryCode || '+1',
      phone: contact.phone,
      email: contact.email || '',
      relationship: contact.relationship || '',
      priority: contact.priority,
    });
  };

  const updateFormField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => {
      const newForm = { ...prev, [key]: value };
      return newForm;
    });
  };

  const handleSave = async () => {
    if (!token) {
      return;
    }

    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert('Validation', 'Name and phone are required for an emergency contact.');
      return;
    }

    if (!editingId && !hasRoomForMore) {
      Alert.alert('Limit reached', 'You can only have up to three emergency contacts.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        countryCode: form.countryCode,
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        relationship: form.relationship.trim() || undefined,
        priority: form.priority,
      };

      if (editingId) {
        await apiFetch<EmergencyContact>(`/friends/${editingId}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch<EmergencyContact>('/friends', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        });
      }

      const refreshed = await apiFetch<EmergencyContact[]>('/friends', {
        method: 'GET',
        token,
      });
      const sorted = [...refreshed].sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3));
      setContacts(sorted);
      await AsyncStorage.setItem(EMERGENCY_CONTACTS_KEY, JSON.stringify(sorted));

      Alert.alert('Success', 'Emergency contact saved successfully.');
      setEditingId(undefined);
      startNewContact();
    } catch (e: any) {
      console.warn('[EmergencyContactsTab] Failed to save', e);
      setError(e?.message || 'Failed to save emergency contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <YStack space={16} padding={16}>
        <AppSectionHeader
          title="Emergency contacts"
          subtitle="Add up to three trusted people who will be contacted if an emergency is detected."
        />

        {/* Contact limit indicator */}
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontSize={13} color={colors.text.tertiary}>
            {contacts.length} of 3 contacts used
          </Text>
          <XStack space={6} alignItems="center">
            {[1, 2, 3].map(i => (
              <View
                key={i}
                width={8}
                height={8}
                borderRadius={4}
                backgroundColor={i <= contacts.length ? colors.primary.base : colors.border}
              />
            ))}
          </XStack>
        </XStack>

        {loading ? (
          <Text fontSize={15} color={colors.text.secondary} textAlign="center" marginTop={16}>
            Loading contacts...
          </Text>
        ) : (
          <>
            {/* Existing contacts */}
            <YStack space={12}>
              {contacts.length === 0 ? (
                <AppEmptyState
                  icon="\uD83D\uDC64"
                  title="No contacts yet"
                  subtitle="Add your first emergency contact below."
                />
              ) : (
                contacts.map(contact => (
                  <AppCard key={contact._id || contact.priority} accent="info">
                    <XStack alignItems="center" space={12}>
                      <View
                        width={44}
                        height={44}
                        borderRadius={22}
                        backgroundColor={colors.primary.light}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Text fontSize={18} fontWeight="700" color={colors.primary.base}>
                          {contact.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <YStack flex={1} space={2}>
                        <Text fontSize={17} fontWeight="600" color={colors.text.primary}>
                          {contact.name}
                        </Text>
                        <Text fontSize={13} color={colors.text.secondary}>
                          {contact.countryCode || ''} {contact.phone}
                        </Text>
                        {contact.email ? (
                          <Text fontSize={13} color={colors.text.secondary}>
                            {contact.email}
                          </Text>
                        ) : null}
                        {contact.relationship ? (
                          <Text fontSize={13} color={colors.text.secondary}>
                            {contact.relationship}
                          </Text>
                        ) : null}
                        <XStack marginTop={2}>
                          <AppStatusBadge variant="info" label={`Priority ${contact.priority}`} />
                        </XStack>
                      </YStack>
                      <Button
                        size="$2"
                        height={40}
                        borderRadius={10}
                        backgroundColor="transparent"
                        borderWidth={1}
                        borderColor={colors.border}
                        paddingHorizontal={16}
                        onPress={() => startEditContact(contact)}
                      >
                        <Text fontSize={13} fontWeight="600" color={colors.primary.base}>
                          Edit
                        </Text>
                      </Button>
                    </XStack>
                  </AppCard>
                ))
              )}
            </YStack>

            {/* Add/Edit form */}
            <AppCard>
              <Text fontSize={17} fontWeight="600" color={colors.text.primary} marginBottom={12}>
                {editingId ? 'Edit emergency contact' : 'Add emergency contact'}
              </Text>

              <YStack space={12}>
                <View>
                  <Text fontSize={13} color={colors.text.secondary} marginBottom={4}>
                    Name *
                  </Text>
                  <Input
                    value={form.name}
                    onChangeText={text => updateFormField('name', text)}
                    placeholder="Full name"
                    autoCapitalize="words"
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
                    Phone *
                  </Text>
                  <XStack space={8}>
                    <TouchableOpacity onPress={() => setShowCountryPicker(true)}>
                      <View
                        backgroundColor={colors.bg.base}
                        padding={12}
                        borderRadius={10}
                        borderWidth={1}
                        borderColor={colors.border}
                        minWidth={80}
                        height={48}
                        justifyContent="center"
                      >
                        <Text fontSize={15} textAlign="center">
                          {COUNTRY_CODES.find(c => c.code === form.countryCode)?.flag || '\uD83C\uDF0D'}{' '}
                          {form.countryCode}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <Input
                      flex={1}
                      value={form.phone}
                      onChangeText={text => updateFormField('phone', text)}
                      placeholder="Phone number"
                      keyboardType="phone-pad"
                      height={48}
                      borderRadius={10}
                      fontSize={15}
                      borderWidth={1}
                      borderColor={colors.border}
                      paddingHorizontal={14}
                      backgroundColor={colors.bg.base}
                    />
                  </XStack>
                </View>

                <View>
                  <Text fontSize={13} color={colors.text.secondary} marginBottom={4}>
                    Email (optional)
                  </Text>
                  <Input
                    value={form.email}
                    onChangeText={text => updateFormField('email', text)}
                    placeholder="Email address"
                    autoCapitalize="none"
                    keyboardType="email-address"
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
                    Relationship (optional)
                  </Text>
                  <Input
                    value={form.relationship}
                    onChangeText={text => updateFormField('relationship', text)}
                    placeholder="e.g. Family, friend, neighbour"
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
                    Priority (1 = first to contact)
                  </Text>
                  <XStack space={8}>
                    {[1, 2, 3].map(p => (
                      <Button
                        key={p}
                        flex={1}
                        height={44}
                        borderRadius={10}
                        backgroundColor={form.priority === p ? colors.primary.base : colors.bg.base}
                        borderWidth={1}
                        borderColor={form.priority === p ? colors.primary.base : colors.border}
                        onPress={() => updateFormField('priority', p)}
                      >
                        <Text
                          fontSize={17}
                          fontWeight="600"
                          color={form.priority === p ? '#FFFFFF' : colors.text.primary}
                        >
                          {p}
                        </Text>
                      </Button>
                    ))}
                  </XStack>
                </View>

                {error ? (
                  <View backgroundColor="#F5EDE0" borderRadius={10} padding={12} borderWidth={1} borderColor="#E8DCC8">
                    <Text fontSize={13} color={colors.accent.warning}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                <XStack marginTop={8} space={12}>
                  <Button
                    flex={1}
                    height={48}
                    borderRadius={12}
                    backgroundColor="transparent"
                    borderWidth={1}
                    borderColor={colors.border}
                    disabled={saving}
                    onPress={startNewContact}
                  >
                    <Text fontSize={15} fontWeight="600" color={colors.text.primary}>
                      New
                    </Text>
                  </Button>
                  <Button
                    flex={1}
                    height={48}
                    borderRadius={12}
                    backgroundColor={colors.primary.base}
                    borderWidth={0}
                    onPress={handleSave}
                    disabled={saving}
                    opacity={saving ? 0.6 : 1}
                  >
                    <Text fontSize={15} fontWeight="600" color="#FFFFFF">
                      {saving ? 'Saving\u2026' : 'Save'}
                    </Text>
                  </Button>
                </XStack>
              </YStack>
            </AppCard>
          </>
        )}
      </YStack>

      {/* Country code picker modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCountryPicker(false);
          setCountrySearchQuery('');
        }}
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
              <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
                <Text fontSize={17} fontWeight="600" color={colors.text.primary}>
                  Select Country Code
                </Text>
                <Button
                  size="$2"
                  height={36}
                  borderRadius={10}
                  backgroundColor="transparent"
                  borderWidth={1}
                  borderColor={colors.border}
                  paddingHorizontal={14}
                  onPress={() => {
                    setShowCountryPicker(false);
                    setCountrySearchQuery('');
                  }}
                >
                  <Text fontSize={13} fontWeight="600" color={colors.text.secondary}>
                    Close
                  </Text>
                </Button>
              </XStack>
              <Input
                placeholder="Search country or code..."
                value={countrySearchQuery}
                onChangeText={setCountrySearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                height={44}
                borderRadius={10}
                fontSize={15}
                borderWidth={1}
                borderColor={colors.border}
                paddingHorizontal={14}
                backgroundColor={colors.bg.base}
              />
            </View>
            <FlatList
              data={filteredCountryCodes}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    updateFormField('countryCode', item.code);
                    setShowCountryPicker(false);
                    setCountrySearchQuery('');
                  }}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.divider,
                    backgroundColor: form.countryCode === item.code ? colors.primary.light : 'transparent',
                  }}
                >
                  <XStack space={12} alignItems="center">
                    <Text fontSize={20}>{item.flag}</Text>
                    <View flex={1}>
                      <Text fontSize={15} fontWeight="500" color={colors.text.primary}>
                        {item.name}
                      </Text>
                      <Text fontSize={13} color={colors.text.secondary}>
                        {item.code}
                      </Text>
                    </View>
                    {form.countryCode === item.code && (
                      <Text fontSize={17} color={colors.primary.base} fontWeight="700">
                        {'\u2713'}
                      </Text>
                    )}
                  </XStack>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default EmergencyContactsTab;
