/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const primaryRedLight = '#DC2626'; // Red-600 for Light Mode
const primaryRedDark = '#F87171';  // Red-400 for Dark Mode

export const Colors = {
  light: {
    text: '#0F172A',
    textMuted: '#64748B',
    background: '#FFFFFF',
    card: '#F8FAFC',
    border: '#E2E8F0',
    tint: primaryRedLight,
    primary: primaryRedLight,
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: primaryRedLight,
    tabBackground: '#FFFFFF',
    badge: primaryRedLight,
  },
  dark: {
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    background: '#0F172A',
    card: '#1E293B',
    border: '#334155',
    tint: primaryRedDark,
    primary: primaryRedDark,
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: primaryRedDark,
    tabBackground: '#1E293B',
    badge: primaryRedDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

