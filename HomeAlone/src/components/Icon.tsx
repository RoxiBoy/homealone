import React from 'react';
import { Text } from 'tamagui';

const ICON_MAP: Record<string, string> = {
  home: '\u2302',
  clock: '\u23F0',
  bell: '\uD83D\uDD14',
  shield: '\uD83D\uDEE1',
  person: '\uD83D\uDC64',
  phone: '\uD83D\uDCDE',
  email: '\u2709',
  settings: '\u2699',
  info: '\u2139',
  check: '\u2713',
  x: '\u2717',
  chevron: '\u276F',
  moon: '\uD83C\uDF19',
  alert: '\u26A0',
  plus: '\u002B',
  heart: '\u2764',
  menu: '\u2630',
  star: '\u2605',
  target: '\uD83C\uDFAF',
  sleep: '\uD83D\uDE34',
  emergency: '\uD83D\uDEA8',
  safety: '\uD83D\uDEE1',
  calendar: '\uD83D\uDCC5',
  thumbsup: '\uD83D\uDC4D',
};

type IconProps = {
  name: string;
  size?: number;
  color?: string;
};

export const Icon: React.FC<IconProps> = ({ name, size = 20, color = '#2C2C2A' }) => {
  const char = ICON_MAP[name] || '?';
  return (
    <Text fontSize={size} color={color} selectable={false}>
      {char}
    </Text>
  );
};
