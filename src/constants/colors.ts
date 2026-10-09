/**
 * Muse AI Clone - Centralized Design Tokens & Color Palette
 * Tiboo "clean" theme: white / very light grey surfaces, near-black text,
 * and the Tiboo violet (from the logo) reserved for buttons, active
 * states and the user's chat bubbles.
 */

export const Colors = {
  // Brand Primary (Tiboo Violet)
  primary: '#7623D5',
  primaryDark: '#5A16B0',
  primaryLight: '#9B55E6',
  primaryGradientStart: '#4F17AE',
  primaryGradientEnd: '#CE64EA',
  primarySubtle: '#F4EDFD',
  primaryGlow: 'rgba(118, 35, 213, 0.12)',
  primaryBorder: '#DCC8F5',

  // Neutral / Layout Colors (Clean White Theme)
  white: '#FFFFFF',
  black: '#000000',
  background: '#FFFFFF',
  surface: '#F5F5F7',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#EFEFF4',

  // Text Colors
  text: '#1D1D1F',
  textPrimary: '#1D1D1F',
  textSecondary: '#6E6E73',
  textMuted: '#A1A1A6',
  textDisabled: '#D1D1D6',
  textWhite: '#FFFFFF',
  textLink: '#7623D5',

  // Border & Dividers
  border: '#E5E5EA',
  borderLight: '#F2F2F7',
  borderFocus: '#7623D5',
  divider: '#E5E5EA',

  // Status & Feedback
  success: '#34C759',
  successLight: '#E9F9EE',
  warning: '#FF9F0A',
  warningLight: '#FFF4E5',
  error: '#FF3B30',
  errorLight: '#FFEBEA',
  info: '#0A84FF',
  infoLight: '#E8F2FF',

  // Tab & Chat UI specific tokens
  tabInactive: '#A1A1A6',
  tabActive: '#1D1D1F',
  tabActiveBg: '#F4EDFD',
  chatBubbleUser: '#7623D5',
  chatBubbleAi: '#F2F2F7',
  chatBubbleAiBorder: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.28)',
  statusBlue: '#7623D5',
  iconDark: '#1D1D1F',
  iconMuted: '#A1A1A6',
  inputBg: '#F5F5F7',
  inputBorder: '#E5E5EA',
  dockBg: '#FFFFFF',
  userBubbleText: '#FFFFFF',
  shadow: '#000000',

  // Google Branding
  googleBlue: '#4285F4',
  googleRed: '#EA4335',
  googleYellow: '#FBBC05',
  googleGreen: '#34A853',
  googleBorder: '#DADCE0',
  googleBgHover: '#F8FAFD',

  // Dark Scheme Palette (for dark mode compatibility)
  light: {
    text: '#1D1D1F',
    background: '#FFFFFF',
    backgroundElement: '#F5F5F7',
    backgroundSelected: '#F4EDFD',
    textSecondary: '#6E6E73',
    tint: '#7623D5',
    card: '#FFFFFF',
    border: '#E5E5EA',
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
