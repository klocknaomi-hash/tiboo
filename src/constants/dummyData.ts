/**
 * Muse AI Clone - Mock Data Datasets
 *
 * Centralized initial state mocks for:
 * 1. Chat conversation messages & agent responses
 * 2. Sidebar drawer chat sessions & side topics
 * 3. Pre-built prompt idea templates for one-tap agent execution
 * 4. Scheduled autonomous goals and background tasks
 * 5. Account plan limits and third-party workspace connectors
 */

import {
  ChatMessage,
  SideChatItem,
  IdeaItem,
  TaskGoalItem,
  PlanData,
} from '@/types';

// Re-export all types for convenience
export * from '@/types';

/**
 * Initial seed messages presented when opening the main chat screen.
 */
export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'user',
    text: 'Je souhaite démarrer un objectif de santé et de forme',
    timestamp: '15:35',
  },
  {
    id: 'msg-2',
    sender: 'agent',
    text: "Avec grand plaisir ! En quelques mots, quel est ton objectif principal et quel changement concret souhaites-tu obtenir ?",
    timestamp: '15:35',
  },
];

/**
 * Mock side conversations displayed in the sliding sidebar drawer.
 */
export const SIDE_CHATS: SideChatItem[] = [
  {
    id: 'side-1',
    title: 'Synthèse du projet mobile',
    hasUnreadDot: false,
  },
  {
    id: 'side-2',
    title: 'Revue des priorités de la semaine',
    hasUnreadDot: false,
  },
  {
    id: 'side-3',
    title: 'Objectif forme et bien-être',
    hasUnreadDot: false,
  },
  {
    id: 'side-4',
    title: 'Automatisation des emails Gmail',
    hasUnreadDot: true,
  },
  {
    id: 'side-5',
    title: 'Veille technologique & IA',
    hasUnreadDot: true,
  },
];

/**
 * Curated idea templates presented on the Ideas tab.
 */
export const IDEA_ITEMS: IdeaItem[] = [
  {
    id: 'idea-1',
    icon: '🏆',
    title: 'Préparer un dossier de candidature complet',
    description: "Je peux analyser les critères d'évaluation, rédiger une ébauche de présentation, le script de démonstration et le calendrier des livrables pour ton projet.",
    prompt: "Aide-moi à préparer un dossier complet de présentation pour mon projet. Analyse les étapes clés et propose un plan d'action structuré.",
  },
  {
    id: 'idea-2',
    icon: '🗂️',
    title: 'Créer un tableau comparatif automatisé',
    description: "Je peux scanner tes flux d'informations et créer un tableau vivant répertoriant les outils les plus performants avec liens, métriques et statut vérifié.",
    prompt: "Génère un tableau comparatif structuré des meilleurs outils d'IA pour mon projet avec avantages, inconvénients et cas d'usage.",
  },
  {
    id: 'idea-3',
    icon: '📹',
    title: 'Transformer un projet en série de tutoriels courts',
    description: "Partage ton idée et je structure une série de capsules vidéo : plan par épisode, accroches percutantes et scripts prêts à enregistrer.",
    prompt: "Structure une série de capsules courtes et percutantes pour présenter les fonctionnalités clés de Tiboo.",
  },
  {
    id: 'idea-4',
    icon: '🚀',
    title: 'Rédiger une annonce de lancement et ses visuels',
    description: "Je prépare tes textes de communication, tes accroches pour les réseaux sociaux et la stratégie de diffusion pour maximiser l'impact de ton projet.",
    prompt: "Rédige un texte percutant pour le lancement de mon application avec des variations de titres et un appel à l'action clair.",
  },
];

/**
 * Pre-configured scheduled agent check-ins displayed in Tasks tab.
 */
export const TASK_GOALS: TaskGoalItem[] = [
  {
    id: 'task-1',
    title: 'Bilan santé et entraînement du matin',
    schedule: 'Tous les jours à 08:00',
    status: 'active',
    runsCount: 28,
  },
  {
    id: 'task-2',
    title: 'Rétrospective et suivi des habitudes du soir',
    schedule: 'Tous les jours à 21:00',
    status: 'active',
    runsCount: 34,
  },
  {
    id: 'task-3',
    title: 'Revue hebdomadaire des priorités et sprints',
    schedule: 'Tous les dimanches à 18:00',
    status: 'active',
    runsCount: 8,
  },
];

/**
 * Account usage stats and quota reset schedule displayed on Settings tab.
 */
export const SETTINGS_PLAN_DATA: PlanData = {
  planName: 'Forfait Gratuit',
  percentUsed: 11,
  resetText: 'Réinitialisation de la limite hebdomadaire le 2 oct.',
  creditsUsed: 110,
  creditsTotal: 1000,
  remainingCredits: 890,
};

