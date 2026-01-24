import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Alert, Modal, TouchableOpacity, FlatList } from 'react-native';
import { View, Text, Input, Button, YStack, XStack } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../config/api';

const EMERGENCY_CONTACTS_KEY = '@homealone/emergency-contacts';

const COUNTRY_CODES = [
  { code: '+1', name: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+977', name: 'Nepal', flag: '🇳🇵' },
  { code: '+7', name: 'Russia', flag: '🇷🇺' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+30', name: 'Greece', flag: '🇬🇷' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+98', name: 'Iran', flag: '🇮🇷' },
  { code: '+972', name: 'Israel', flag: '🇮🇱' },
];

export type EmergencyContact = {
  _id?: string;
  name: string;
  countryCode?: string;
  phone: string;
  email?: string;
  relationship?: string;
  priority: number; // 1-3
};

const emptyContact = (priority: number): EmergencyContact => ({
  priority,
  name: '',
  countryCode: '+1',
  phone: '',
  email: '',
  relationship: '',
});

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
      } catch (e) {
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
    console.log('[EmergencyContactsTab] updateFormField:', key, '=', value);
    setForm(prev => {
      const newForm = { ...prev, [key]: value };
      console.log('[EmergencyContactsTab] New form state:', JSON.stringify(newForm, null, 2));
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

    console.log('[EmergencyContactsTab] Saving contact with form:', JSON.stringify(form, null, 2));
    console.log('[EmergencyContactsTab] countryCode being sent:', form.countryCode);

    try {
      const payload = {
        name: form.name.trim(),
        countryCode: form.countryCode,
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        relationship: form.relationship.trim() || undefined,
        priority: form.priority,
      };
      console.log('[EmergencyContactsTab] API payload:', JSON.stringify(payload, null, 2));

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
    <ScrollView style={{ flex: 1 }}>
      <YStack space="$4" padding="$4">
        <Text fontSize="$7" fontWeight="700">
          Emergency contacts
        </Text>
        <Text fontSize="$4" color="$color11">
          Add up to three trusted people who will be contacted if an emergency is detected.
        </Text>

        {loading ? (
          <Text marginTop="$4">Loading contacts...</Text>
        ) : (
          <>
            {/* Existing contacts as full-width horizontal cards */}
            <YStack space="$3" marginTop="$2">
              {contacts.length === 0 ? (
                <Text color="$color11">No contacts yet. Add your first emergency contact below.</Text>
              ) : (
                contacts.map(contact => (
                  <View
                    key={contact._id || contact.priority}
                    backgroundColor="$backgroundStrong"
                    borderRadius="$4"
                    padding="$4"
                  >
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack space="$1" flex={1}>
                        <Text fontSize="$5" fontWeight="600">
                          {contact.name}
                        </Text>
                        <Text fontSize="$3" color="$color11">
                          {contact.countryCode || ''} {contact.phone}
                        </Text>
                        {contact.email ? (
                          <Text fontSize="$3" color="$color11">
                            {contact.email}
                          </Text>
                        ) : null}
                        {contact.relationship ? (
                          <Text fontSize="$3" color="$color11">
                            {contact.relationship}
                          </Text>
                        ) : null}
                        <Text fontSize="$3" color="$color11">
                          Priority {contact.priority}
                        </Text>
                      </YStack>

                      <Button
                        size="$3"
                        variant="outlined"
                        onPress={() => startEditContact(contact)}
                      >
                        Edit
                      </Button>
                    </XStack>
                  </View>
                ))
              )}
            </YStack>

            {/* Single contact form */}
            <View
              backgroundColor="$backgroundStrong"
              borderRadius="$4"
              padding="$4"
              marginTop="$4"
            >
              <Text fontSize="$5" fontWeight="600" marginBottom="$2">
                {editingId ? 'Edit emergency contact' : 'Add emergency contact'}
              </Text>

              <YStack space="$2">
                <View>
                  <Text fontSize="$3" marginBottom="$1">
                    Name *
                  </Text>
                  <Input
                    value={form.name}
                    onChangeText={text => updateFormField('name', text)}
                    placeholder="Full name"
                    autoCapitalize="words"
                  />
                </View>

                <View>
                  <Text fontSize="$3" marginBottom="$1">
                    Phone *
                  </Text>
                  <XStack space="$2">
                    <TouchableOpacity onPress={() => setShowCountryPicker(true)}>
                      <View
                        backgroundColor="$backgroundHover"
                        padding="$3"
                        borderRadius="$3"
                        borderWidth={1}
                        borderColor="$borderColor"
                        minWidth={80}
                      >
                        <Text fontSize="$4" textAlign="center">
                          {COUNTRY_CODES.find(c => c.code === form.countryCode)?.flag || '🌍'}{' '}
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
                    />
                  </XStack>
                </View>

                <View>
                  <Text fontSize="$3" marginBottom="$1">
                    Email (optional)
                  </Text>
                  <Input
                    value={form.email}
                    onChangeText={text => updateFormField('email', text)}
                    placeholder="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View>
                  <Text fontSize="$3" marginBottom="$1">
                    Relationship (optional)
                  </Text>
                  <Input
                    value={form.relationship}
                    onChangeText={text => updateFormField('relationship', text)}
                    placeholder="e.g. Family, friend, neighbour"
                  />
                </View>

                <View>
                  <Text fontSize="$3" marginBottom="$1">
                    Priority (1 = first to contact)
                  </Text>
                  <XStack space="$2">
                    {[1, 2, 3].map(p => (
                      <Button
                        key={p}
                        size="$2"
                        variant={form.priority === p ? 'solid' : 'outlined'}
                        onPress={() => updateFormField('priority', p)}
                      >
                        <Text color="$color12">{p}</Text>
                      </Button>
                    ))}
                  </XStack>
                </View>

                {error ? (
                  <Text color="red" marginTop="$2">
                    {error}
                  </Text>
                ) : null}

                <XStack marginTop="$3" justifyContent="space-between">
                  <Button
                    size="$3"
                    variant="outlined"
                    disabled={saving}
                    onPress={startNewContact}
                  >
                    New
                  </Button>
                  <Button size="$3" onPress={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </XStack>
              </YStack>
            </View>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
              <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
                <Text fontSize="$6" fontWeight="600">
                  Select Country Code
                </Text>
                <Button
                  size="$3"
                  variant="outlined"
                  onPress={() => {
                    setShowCountryPicker(false);
                    setCountrySearchQuery('');
                  }}
                >
                  Close
                </Button>
              </XStack>
              <Input
                placeholder="Search country or code..."
                value={countrySearchQuery}
                onChangeText={setCountrySearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
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
                    borderBottomColor: '#f0f0f0',
                    backgroundColor: form.countryCode === item.code ? '#e3f2fd' : 'white',
                  }}
                >
                  <XStack space="$3" alignItems="center">
                    <Text fontSize="$6">{item.flag}</Text>
                    <View flex={1}>
                      <Text fontSize="$4" fontWeight="500">
                        {item.name}
                      </Text>
                      <Text fontSize="$3" color="$color11">
                        {item.code}
                      </Text>
                    </View>
                    {form.countryCode === item.code && (
                      <Text fontSize="$5" color="$blue9">
                        ✓
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
