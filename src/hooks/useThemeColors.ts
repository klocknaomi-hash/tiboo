/**
 * Global theme colors derived from the accent the user picked for their agent.
 *
 * Every interactive element (buttons, active tabs, switches, links, chips,
 * the user's chat bubbles…) must use these values instead of a fixed color,
 * so the chosen theme applies on every screen. The choice is saved with the
 * agent profile (AgentContext → AsyncStorage) and survives restarts.
 * Status colors (success / error / warning) stay in Colors on purpose.
 */

import { useMemo } from 'react';
import { useAgent } from '@/context/AgentContext';
import { Colors } from '@/constants/colors';

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance, used to pick readable text on the accent. */
function luminance([r, g, b]: [number, number, number]): number {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export interface ThemeColors {
  /** Main accent: buttons, active states, links */
  accent: string;
  /** Text / icons drawn on top of `accent` */
  onAccent: string;
  /** Very light tint: selected rows, active tab pill, chips */
  accentSubtle: string;
  /** Light border around accent-tinted surfaces */
  accentBorder: string;
}

export function themeFromAccent(accent: string): ThemeColors {
  const rgb = hexToRgb(accent);
  if (!rgb) {
    return {
      accent: Colors.primary,
      onAccent: Colors.white,
      accentSubtle: Colors.primarySubtle,
      accentBorder: Colors.primaryBorder,
    };
  }
  const [r, g, b] = rgb;
  return {
    accent,
    onAccent: luminance(rgb) > 0.45 ? Colors.textPrimary : Colors.white,
    accentSubtle: `rgba(${r}, ${g}, ${b}, 0.10)`,
    accentBorder: `rgba(${r}, ${g}, ${b}, 0.30)`,
  };
}

export function useThemeColors(): ThemeColors {
  const { agent } = useAgent();
  return useMemo(() => themeFromAccent(agent.color), [agent.color]);
}
