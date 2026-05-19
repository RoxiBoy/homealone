import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, TouchableOpacity, View as RNView } from 'react-native';
import { View, Text } from 'tamagui';
import { colors } from '../theme/colors';

type TimerWheelProps = {
  options: number[];
  value: number;
  onValueChange: (val: number) => void;
  formatLabel: (val: number) => string;
};

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const LOOP_CYCLES = 21;
const MIDDLE_CYCLE = Math.floor(LOOP_CYCLES / 2);

type TimerWheelItem = {
  value: number;
  optionIndex: number;
  displayIndex: number;
};

export const TimerWheel: React.FC<TimerWheelProps> = ({
  options,
  value,
  onValueChange,
  formatLabel,
}) => {
  const listRef = useRef<FlatList<TimerWheelItem>>(null);
  const getCenteredDisplayIndex = useCallback(
    (optionIndex: number) => MIDDLE_CYCLE * options.length + optionIndex,
    [options.length],
  );
  const wheelItems = useMemo<TimerWheelItem[]>(
    () =>
      Array.from({ length: options.length * LOOP_CYCLES }, (_, displayIndex) => {
        const optionIndex = displayIndex % options.length;
        return {
          value: options[optionIndex],
          optionIndex,
          displayIndex,
        };
      }),
    [options],
  );
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(0, options.indexOf(value)),
  );
  const [selectedDisplayIndex, setSelectedDisplayIndex] = useState(() =>
    getCenteredDisplayIndex(Math.max(0, options.indexOf(value))),
  );

  const scrollToIndex = useCallback((index: number, animated = true) => {
    listRef.current?.scrollToIndex({
      index,
      animated,
      viewPosition: 0.5,
    });
  }, []);

  useEffect(() => {
    const idx = options.indexOf(value);
    if (idx >= 0 && idx !== selectedIndex) {
      const displayIndex = getCenteredDisplayIndex(idx);
      setSelectedIndex(idx);
      setSelectedDisplayIndex(displayIndex);
      scrollToIndex(displayIndex);
    }
  }, [getCenteredDisplayIndex, options, scrollToIndex, selectedIndex, value]);

  const selectDisplayIndex = useCallback(
    (displayIndex: number) => {
      const item = wheelItems[displayIndex];
      if (!item) {
        return;
      }

      setSelectedIndex(item.optionIndex);
      setSelectedDisplayIndex(displayIndex);
      scrollToIndex(displayIndex);

      const nextValue = item.value;
      if (nextValue !== value) {
        onValueChange(nextValue);
      }
    },
    [onValueChange, scrollToIndex, value, wheelItems],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: TimerWheelItem; index: number }) => {
      const isSelected = index === selectedDisplayIndex;
      const distance = Math.abs(index - selectedDisplayIndex);
      const scale = isSelected ? 1 : distance === 1 ? 0.8 : 0.65;
      const opacity = isSelected ? 1 : distance === 1 ? 0.5 : 0.25;

      return (
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          onPress={() => selectDisplayIndex(index)}
        >
          <RNView
            style={{
              height: ITEM_HEIGHT,
              justifyContent: 'center',
              alignItems: 'center',
              marginHorizontal: 8,
              borderRadius: 12,
              backgroundColor: isSelected ? colors.primary.base : 'transparent',
              zIndex: isSelected ? 2 : 0,
            }}
          >
            <Text
              fontSize={isSelected ? 24 : distance === 1 ? 18 : 15}
              fontWeight={isSelected ? '700' : '400'}
              color={isSelected ? '#FFFFFF' : colors.text.tertiary}
              opacity={opacity}
              transform={[{ scale }]}
            >
              {formatLabel(item.value)}
            </Text>
          </RNView>
        </TouchableOpacity>
      );
    },
    [selectedDisplayIndex, formatLabel, selectDisplayIndex],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: TimerWheelItem) => String(item.displayIndex), []);

  const listHeight = ITEM_HEIGHT * VISIBLE_ITEMS;

  return (
    <View height={listHeight} overflow="hidden" position="relative">
      <RNView
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: ITEM_HEIGHT * 2,
          left: 8,
          right: 8,
          height: ITEM_HEIGHT,
          backgroundColor: colors.primary.light,
          borderRadius: 12,
          zIndex: 0,
          opacity: 0.22,
        }}
      />
      <FlatList
        ref={listRef}
        data={wheelItems}
        extraData={selectedDisplayIndex}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        style={{ zIndex: 2 }}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => scrollToIndex(index, false), 50);
        }}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2,
        }}
        initialScrollIndex={selectedDisplayIndex}
      />
    </View>
  );
};
