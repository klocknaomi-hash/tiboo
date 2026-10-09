/**
 * Muse AI Clone - Theme, Typography & Layout Constants
 *
 * Provides cross-platform font families, standardized spacing scales,
 * and layout geometry tokens used across screens and components.
 */

import { Platform } from 'react-native';
import { Colors } from './colors';

export { Colors } from './colors';

/**
 * Valid theme keys supported by light and dark color palettes.
 */
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Cross-platform font family mappings:
 * - iOS: native Apple San Francisco system design fonts
 * - Android/Default: robust platform fallbacks
 * - Web: clean modern sans-serif typography stack
 */
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
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    rounded: '"SF Pro Rounded", "Hiragino Maru Gothic ProN", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
});

/**
 * Clean typography (Inter, loaded in the root layout).
 * Use these font families instead of fontWeight so weights render the
 * same on iOS, Android and web.
 */
export const Typography = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

/**
 * Corner radii for the soft, rounded look.
 */
export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/**
 * Consistent 8-point spacing grid used for padding, margins, and gaps.
 */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * Platform-dependent safe insets for bottom floating tab bar dock.
 */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/**
 * Maximum content container width for responsive web / tablet rendering.
 */
export const MaxContentWidth = 800;

