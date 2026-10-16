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
  {
    id: 'leo',
    name: 'Léo',
    image: require('../../assets/images/agents/leo.png'),
    role: 'Stratégie & Projets',
    description: 'Expert en organisation, productivité et suivi des objectifs.',
  },
  {
    id: 'chloe',
    name: 'Chloé',
    image: require('../../assets/images/agents/chloe.png'),
    role: 'Créativité & Rédaction',
    description: 'Spécialiste de la communication, du contenu et des idées.',
  },
  {
    id: 'amir',
    name: 'Amir',
    image: require('../../assets/images/agents/amir.png'),
    role: 'Organisation & Logique',
    description: 'Analyste des tâches, des flux de travail et de l’automatisation.',
  },
  {
    id: 'kaya',
    name: 'Kaya',
    image: require('../../assets/images/agents/kaya.png'),
    role: 'Bien-être & Santé',
    description: 'Compagne pour le bien-être, les routines saines et la sérénité.',
  },
];

/** Accent colors offered in the Edit Agent modal (Tiboo violet first). */
export const AGENT_THEME_COLORS = [
  Colors.primary, // Tiboo Violet (#7623D5)
  '#5E5CE6', // Indigo
  '#0A84FF', // Bleu
  '#30B0C7', // Turquoise
  '#34C759', // Vert
  '#FF9F0A', // Orange
  '#FF375F', // Rose
  '#1D1D1F', // Graphite
];

/** Profile used on first launch and after "Reset". */
export const DEFAULT_AGENT_PROFILE: AgentProfile = {
  name: AGENT_PERSONAS[0].name,
  subtitle: AGENT_PERSONAS[0].role || 'Agent Autonome',
  avatar: { type: 'persona', id: AGENT_PERSONAS[0].id },
  color: AGENT_THEME_COLORS[0],
  greeting:
    "Bonjour ! Je suis Léo, ton agent autonome Tiboo. En quelques mots, quel objectif ou quelle tâche souhaites-tu accomplir aujourd'hui ?",
};

