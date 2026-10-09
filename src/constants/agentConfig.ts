/**
 * Agent & Brand Configuration
 *
 * Single place to rebrand the app and choose the default AI agent.
 * Everything here can also be changed at runtime from the "Edit Agent"
 * modal (tap the avatar in the header); runtime changes are saved on
 * the device and override these defaults.
 */

import { AgentPersona, AgentProfile } from '@/types';
import { Colors } from './colors';

/** App brand wordmark (sign-in screen, drawer, logo component). */
export const APP_BRAND = {
  name: 'tiboo',
};

/** Ready-made agent characters offered in the Edit Agent modal. */
export const AGENT_PERSONAS: AgentPersona[] = [
  { id: 'leo', name: 'Leo', image: require('../../assets/images/agents/leo.png') },
  { id: 'chloe', name: 'Chloé', image: require('../../assets/images/agents/chloe.png') },
  { id: 'amir', name: 'Amir', image: require('../../assets/images/agents/amir.png') },
  { id: 'kaya', name: 'Kaya', image: require('../../assets/images/agents/kaya.png') },
];

/** Accent colors offered in the Edit Agent modal (Tiboo violet first). */
export const AGENT_THEME_COLORS = [
  Colors.primary, // Tiboo Violet
  '#5E5CE6', // Indigo
  '#0A84FF', // Blue
  '#30B0C7', // Teal
  '#34C759', // Green
  '#FF9F0A', // Orange
  '#FF375F', // Pink
  '#1D1D1F', // Graphite
];

/** Profile used on first launch and after "Reset". */
export const DEFAULT_AGENT_PROFILE: AgentProfile = {
  name: AGENT_PERSONAS[0].name,
  subtitle: 'Autonomous Agent',
  avatar: { type: 'persona', id: AGENT_PERSONAS[0].id },
  color: AGENT_THEME_COLORS[0],
  greeting:
    "I'd love to help with that. In your own words, what would this health goal be about — what's the change you'd want to see?",
};
