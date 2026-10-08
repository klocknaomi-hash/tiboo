/**
 * Agent & Brand Configuration
 *
 * Single place to rebrand the app and choose the default AI agent.
 * Everything here can also be changed at runtime from the "Edit Agent"
 * modal (tap the avatar in the header); runtime changes are saved on
 * the device and override these defaults.
 */

import { AgentProfile } from '@/types';

/** App brand wordmark shown on the sign-in screen ("Muse" + " AI"). */
export const APP_BRAND = {
  name: 'Muse',
  suffix: 'AI',
};

/** Accent colors offered in the Edit Agent modal. */
export const AGENT_THEME_COLORS = [
  '#2563EB', // Muse Blue
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#E11D48', // Rose
  '#0891B2', // Cyan
  '#1E2022', // Charcoal
];

/** Emoji avatars offered in the Edit Agent modal. */
export const AGENT_EMOJI_AVATARS = ['🤖', '🦊', '🐱', '🦉', '🐼', '🌟', '🧠', '🚀', '💼', '🌸'];

/** Profile used on first launch and after "Reset". */
export const DEFAULT_AGENT_PROFILE: AgentProfile = {
  name: 'Muse',
  subtitle: 'Autonomous Agent',
  avatar: { type: 'mascot' },
  color: AGENT_THEME_COLORS[0],
  greeting:
    "I'd love to help with that. In your own words, what would this health goal be about — what's the change you'd want to see?",
};
