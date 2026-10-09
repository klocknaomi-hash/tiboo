/**
 * Muse AI Clone - Centralized Design Tokens & Color Palette
 * "Soft & warm" theme: cream backgrounds, terracotta primary,
 * peach / sage pastel accents and warm brown text.
 */

export const Colors = {
  // Brand Primary (Terracotta)
  primary: '#C8734F',
  primaryDark: '#A95C3B',
  primaryLight: '#E0946F',
  primaryGradientStart: '#E0946F',
  primaryGradientEnd: '#C8734F',
  primarySubtle: '#FBEDE5',
  primaryGlow: 'rgba(200, 115, 79, 0.16)',
  primaryBorder: '#F2CDB9',

  // Neutral / Layout Colors (Warm Cream Theme)
  white: '#FFFFFF',
  black: '#000000',
  background: '#FBF7F2',
  surface: '#F6EFE7',
  surfaceElevated: '#FFFDF9',
  surfaceMuted: '#F1E8DD',

  // Text Colors
  text: '#3A2E26',
  textPrimary: '#3A2E26',
  textSecondary: '#6E6058',
  textMuted: '#A39488',
  textDisabled: '#D6CABE',
  textWhite: '#FFFFFF',
  textLink: '#C8734F',

  // Border & Dividers
  border: '#EADFD3',
  borderLight: '#F2EAE0',
  borderFocus: '#C8734F',
  divider: '#EADFD3',

  // Status & Feedback
  success: '#7FA07A',
  successLight: '#E8EFE6',
  warning: '#E0A458',
  warningLight: '#FBF0DF',
  error: '#D46A5E',
  errorLight: '#FBE9E6',
  info: '#7A9CB8',
  infoLight: '#EAF0F5',

  // Tab & Chat UI specific tokens
  tabInactive: '#A39488',
  tabActive: '#3A2E26',
  tabActiveBg: '#F1E4D6',
  chatBubbleUser: '#F6D5C3',
  chatBubbleAi: '#FFFDF9',
  chatBubbleAiBorder: '#EFE5DA',
  overlay: 'rgba(58, 46, 38, 0.35)',
  statusBlue: '#E07A5F',
  iconDark: '#3A2E26',
  iconMuted: '#A39488',
  inputBg: '#FFFDF9',
  inputBorder: '#EADFD3',
  dockBg: '#FFFDF9',
  userBubbleText: '#4A2C1E',
  shadowWarm: '#5C4033',
  sage: '#7FA07A',
  sageSubtle: '#E8EFE6',
  peach: '#F2B79F',

  // Google Branding
  googleBlue: '#4285F4',
  googleRed: '#EA4335',
  googleYellow: '#FBBC05',
  googleGreen: '#34A853',
  googleBorder: '#DADCE0',
  googleBgHover: '#F8FAFD',

  // Dark Scheme Palette (for dark mode compatibility)
  light: {
    text: '#3A2E26',
    background: '#FBF7F2',
    backgroundElement: '#F6EFE7',
    backgroundSelected: '#FBEDE5',
    textSecondary: '#6E6058',
    tint: '#C8734F',
    card: '#FFFDF9',
    border: '#EADFD3',
  },
  dark: {
    text: '#F8FAFC',
    background: '#0B0F17',
    backgroundElement: '#1E293B',
    backgroundSelected: '#1E3A8A',
    textSecondary: '#94A3B8',
    tint: '#3B82F6',
    card: '#0F172A',
    border: '#1E293B',
  },
} as const;

export type ColorType = typeof Colors;
export default Colors;
