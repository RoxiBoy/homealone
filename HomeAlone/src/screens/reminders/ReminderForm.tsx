import React from 'react';
import { TouchableOpacity } from 'react-native';
import { View, Text, Button, YStack, XStack, Input } from 'tamagui';
import { AppCard } from '../../components/AppCard';
import { colors } from '../../theme/colors';

type ReminderFormValues = {
  title: string;
  type: 'Medicine' | 'Checkup';
  dosage: string;
  times: string[];
  time: string;
  date: string;
  address: string;
  notes: string;
};

type ReminderFormProps = {
  editingId: string | undefined;
  form: ReminderFormValues;
  saving: boolean;
  error: string | null;
  onUpdateField: <K extends keyof ReminderFormValues>(key: K, value: ReminderFormValues[K]) => void;
  onSave: () => void;
  onNew: () => void;
  onDelete?: () => void;
};

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const isValidTime = (t: string) => TIME_REGEX.test(t);

export const defaultFormValues = (type: 'Medicine' | 'Checkup' = 'Medicine'): ReminderFormValues => ({
  title: '',
  type,
  dosage: '',
  times: [''],
  time: '',
  date: '',
  address: '',
  notes: '',
});

export type { ReminderFormValues };

const ReminderForm: React.FC<ReminderFormProps> = ({
  editingId,
  form,
  saving,
  error,
  onUpdateField,
  onSave,
  onNew,
  onDelete,
}) => {
  const isMedicine = form.type === 'Medicine';

  const setType = (t: 'Medicine' | 'Checkup') => {
    if (t === form.type) return;
    onUpdateField('type', t);
    onUpdateField('title', form.title);
    onUpdateField('notes', form.notes);
    if (t === 'Medicine') {
      onUpdateField('dosage', form.dosage);
      onUpdateField('times', ['']);
    } else {
      onUpdateField('time', form.time);
      onUpdateField('date', form.date);
      onUpdateField('address', form.address);
    }
  };

  const addTime = () => {
    onUpdateField('times', [...form.times, '']);
  };

  const removeTime = (idx: number) => {
    const next = form.times.filter((_, i) => i !== idx);
    onUpdateField('times', next.length > 0 ? next : ['']);
  };

  const updateTime = (idx: number, val: string) => {
    const next = [...form.times];
    next[idx] = val;
    onUpdateField('times', next);
  };

  const inputStyle = {
    color: colors.text.primary,
    placeholderTextColor: colors.text.tertiary,
    height: 48,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    backgroundColor: colors.bg.base,
  } as const;

  return (
    <AppCard>
      <Text fontSize={17} fontWeight="600" color={colors.text.primary} marginBottom={14}>
        {editingId ? 'Edit reminder' : 'Add reminder'}
      </Text>

      <YStack space={14}>
        {/* Type Toggle */}
        <XStack space={10}>
          <TouchableOpacity
            onPress={() => setType('Medicine')}
            style={{ flex: 1 }}
            activeOpacity={0.7}
          >
            <YStack
              backgroundColor={isMedicine ? colors.bg.cool : colors.bg.subtle}
              borderRadius={12}
              paddingVertical={12}
              alignItems="center"
              borderWidth={1}
              borderColor={isMedicine ? colors.primary.light : colors.border}
            >
              <Text
                fontSize={14}
                fontWeight="700"
                color={isMedicine ? colors.primary.base : colors.text.secondary}
              >
                Medicine
              </Text>
            </YStack>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setType('Checkup')}
            style={{ flex: 1 }}
            activeOpacity={0.7}
          >
            <YStack
              backgroundColor={!isMedicine ? colors.bg.warm : colors.bg.subtle}
              borderRadius={12}
              paddingVertical={12}
              alignItems="center"
              borderWidth={1}
              borderColor={!isMedicine ? '#F5DDB9' : colors.border}
            >
              <Text
                fontSize={14}
                fontWeight="700"
                color={!isMedicine ? colors.secondary.dark : colors.text.secondary}
              >
                Checkup
              </Text>
            </YStack>
          </TouchableOpacity>
        </XStack>

        {/* Title */}
        <YStack>
          <Text fontSize={13} color={colors.text.secondary} marginBottom={4}>
            Title *
          </Text>
          <Input
            value={form.title}
            onChangeText={t => onUpdateField('title', t)}
            placeholder={isMedicine ? 'e.g. Blood pressure medication' : 'e.g. Dr. Smith appointment'}
            autoCapitalize="sentences"
            {...inputStyle}
          />
        </YStack>

        {/* Medicine-specific fields */}
        {isMedicine && (
          <>
            <YStack>
              <Text fontSize={13} color={colors.text.secondary} marginBottom={4}>
                Dosage (optional)
              </Text>
              <Input
                value={form.dosage}
                onChangeText={t => onUpdateField('dosage', t)}
                placeholder="e.g. 1 tablet, 10mg"
                autoCapitalize="none"
                {...inputStyle}
              />
            </YStack>

            <YStack>
              <XStack justifyContent="space-between" alignItems="center" marginBottom={4}>
                <Text fontSize={13} color={colors.text.secondary}>
                  Times *
                </Text>
                <TouchableOpacity onPress={addTime} activeOpacity={0.7}>
                  <View
                    width={28}
                    height={28}
                    borderRadius={8}
                    backgroundColor={colors.primary.light}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text fontSize={16} fontWeight="700" color={colors.primary.base}>
                      +
                    </Text>
                  </View>
                </TouchableOpacity>
              </XStack>
              {form.times.map((t, i) => (
                <XStack key={i} space={8} marginBottom={i < form.times.length - 1 ? 8 : 0}>
                  <Input
                    flex={1}
                    value={t}
                    onChangeText={val => updateTime(i, val)}
                    placeholder="HH:mm"
                    autoCapitalize="none"
                    keyboardType="numbers-and-punctuation"
                    {...inputStyle}
                  />
                  {form.times.length > 1 && (
                    <TouchableOpacity onPress={() => removeTime(i)} activeOpacity={0.7}>
                      <View
                        width={48}
                        height={48}
                        borderRadius={10}
                        backgroundColor={colors.bg.base}
                        borderWidth={1}
                        borderColor={colors.border}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Text fontSize={18} fontWeight="700" color={colors.accent.danger}>
                          {'\u2212'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </XStack>
              ))}
            </YStack>
          </>
        )}

        {/* Checkup-specific fields */}
        {!isMedicine && (
          <>
            <XStack space={10}>
              <YStack flex={1}>
                <Text fontSize={13} color={colors.text.secondary} marginBottom={4}>
                  Date *
                </Text>
                <Input
                  value={form.date}
                  onChangeText={t => onUpdateField('date', t)}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                  {...inputStyle}
                />
              </YStack>
              <YStack width={100}>
                <Text fontSize={13} color={colors.text.secondary} marginBottom={4}>
                  Time *
                </Text>
                <Input
                  value={form.time}
                  onChangeText={t => onUpdateField('time', t)}
                  placeholder="HH:mm"
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                  {...inputStyle}
                />
              </YStack>
            </XStack>

            <YStack>
              <Text fontSize={13} color={colors.text.secondary} marginBottom={4}>
                Address (optional)
              </Text>
              <Input
                value={form.address}
                onChangeText={t => onUpdateField('address', t)}
                placeholder="e.g. 123 Main St, Room 202"
                autoCapitalize="sentences"
                {...inputStyle}
              />
            </YStack>
          </>
        )}

        {/* Notes */}
        <YStack>
          <Text fontSize={13} color={colors.text.secondary} marginBottom={4}>
            Notes (optional)
          </Text>
          <Input
            value={form.notes}
            onChangeText={t => onUpdateField('notes', t)}
            placeholder={isMedicine ? 'e.g. Take with food' : 'e.g. Bring insurance card'}
            autoCapitalize="sentences"
            {...inputStyle}
          />
        </YStack>

        {error ? (
          <View backgroundColor="#F5EDE0" borderRadius={10} padding={12} borderWidth={1} borderColor="#E8DCC8">
            <Text fontSize={13} color={colors.accent.warning}>
              {error}
            </Text>
          </View>
        ) : null}

        <XStack marginTop={4} space={12}>
          <Button
            flex={1}
            height={48}
            borderRadius={12}
            backgroundColor="transparent"
            borderWidth={1}
            borderColor={colors.border}
            disabled={saving}
            onPress={onNew}
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
            onPress={onSave}
            disabled={saving}
            opacity={saving ? 0.6 : 1}
          >
            <Text fontSize={15} fontWeight="600" color="#FFFFFF">
              {saving ? 'Saving\u2026' : 'Save'}
            </Text>
          </Button>
        </XStack>

        {editingId && onDelete && (
          <Button
            height={44}
            borderRadius={12}
            backgroundColor="transparent"
            borderWidth={1}
            borderColor={colors.accent.danger}
            onPress={onDelete}
            disabled={saving}
            opacity={saving ? 0.6 : 1}
          >
            <Text fontSize={15} fontWeight="600" color={colors.accent.danger}>
              Delete reminder
            </Text>
          </Button>
        )}
      </YStack>
    </AppCard>
  );
};

export default ReminderForm;
