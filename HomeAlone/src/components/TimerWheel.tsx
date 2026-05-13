import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, View as RNView } from 'react-native';
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

export const TimerWheel: React.FC<TimerWheelProps> = ({
  options,
  value,
  onValueChange,
  formatLabel,
}) => {
  const listRef = useRef<FlatList>(null);
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(0, options.indexOf(value)),
  );
  const isScrolling = useRef(false);

  useEffect(() => {
    const idx = options.indexOf(value);
    if (idx >= 0 && idx !== selectedIndex && !isScrolling.current) {
      setSelectedIndex(idx);
      listRef.current?.scrollToIndex({
        index: idx,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [value]);

  const renderItem = useCallback(
    ({ item, index }: { item: number; index: number }) => {
      const isSelected = index === selectedIndex;
      const distance = Math.abs(index - selectedIndex);
      const scale = isSelected ? 1 : distance === 1 ? 0.8 : 0.65;
      const opacity = isSelected ? 1 : distance === 1 ? 0.5 : 0.25;

      return (
        <RNView
          style={{
            height: ITEM_HEIGHT,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            fontSize={isSelected ? 24 : distance === 1 ? 18 : 15}
            fontWeight={isSelected ? '700' : '400'}
            color={isSelected ? colors.primary.base : colors.text.tertiary}
            opacity={opacity}
            transform={[{ scale }]}
          >
            {formatLabel(item)}
          </Text>
        </RNView>
      );
    },
    [selectedIndex, formatLabel],
  );

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrolling.current = false;
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, options.length - 1));
      setSelectedIndex(clamped);
      onValueChange(options[clamped]);
    },
    [options, onValueChange],
  );

  const handleScrollBegin = useCallback(() => {
    isScrolling.current = true;
  }, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((_: number, i: number) => String(i), []);

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
          zIndex: 1,
          opacity: 0.5,
        }}
      />
      <FlatList
        ref={listRef}
        data={options}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollBeginDrag={handleScrollBegin}
        getItemLayout={getItemLayout}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2,
        }}
        initialScrollIndex={Math.max(0, options.indexOf(value))}
      />
    </View>
  );
};
