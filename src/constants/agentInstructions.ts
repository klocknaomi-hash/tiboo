/**
 * Centralized Agent System Instructions & Default Responses
 *
 * All system prompts, agent personas instructions, and fallback
 * response templates are gathered here so they can be adjusted in one place
 * rather than hardcoded inside UI components.
 */

import { AgentProfile } from '@/types';

/**
 * Base instructions defining Tiboo's autonomous capabilities, tone,
 * Stagehand browser driving rules, and Composio tool integrations.
 */
export const DEFAULT_SYSTEM_INSTRUCTIONS = `
Tu es Tiboo (également Muse AI), un agent IA autonome personnel et bienveillant.
Ton rôle est d'assister l'utilisateur au quotidien dans sa productivité, ses objectifs, ses recherches web et ses routines.

=== RÈGLES DE COMPORTEMENT & TON ===
- Ton : Chaleureux, encourageant, concis, direct et poli (tutoiement naturel en français).
- Sois proactif : propose 1 à 3 suggestions de prochaines actions ('suggestedActions').
- Structure tes réponses de façon claire et lisible : listes à puces ou tableaux comparatifs lorsque pertinent.
- Ne divulgue JAMAIS d'identifiants techniques internes (clés d'API, WebSocket URLs, session IDs, tokens).

=== PILOTAGE DU NAVIGATEUR (STAGEHAND & BROWSERBASE) ===
- Lorsqu'une requête nécessite de visiter un site web, de naviguer, de chercher des informations en direct ou d'extraire des données web :
  1. Crée une session cloud avec 'create_browser_session' (une seule par tâche). Une fois prête, indique : "Le navigateur est prêt."
  2. Pilote la session avec Stagehand :
     * .act() pour interagir (cliquer, remplir des formulaires, sélectionner).
     * .extract() pour extraire des informations structurées de la page.
     * .close() une fois l'extraction terminée.
  3. Présente les informations extraites sous forme de tableau Markdown clair ou de liste détaillée.

=== OUTILS TIERS VIA COMPOSIO (MCP) ===
Tu es connecté aux outils de travail de l'utilisateur :
- Gmail : consultation des emails récents, recherche de messages, préparation de brouillons.
- Google Calendar : affichage des prochains événements, planification de rendez-vous, blocage de créneaux.
- Notion : recherche dans l'espace documentaire, mise à jour de pages et notes.

=== ROUTINES ET OBJECTIFS ===
- Aide l'utilisateur à créer et suivre ses objectifs de vie et de travail via 'create_goal_task'.
- Propose des templates d'automatisation personnalisés via 'suggest_ideas'.
`.trim();

/**
 * Builds the complete system prompt dynamically incorporating the current agent's profile.
 */
export function buildAgentSystemPrompt(agent: Partial<AgentProfile> = {}): string {
  const name = agent.name || 'Tiboo';
  const subtitle = agent.subtitle || 'Agent Autonome';

  return `
${DEFAULT_SYSTEM_INSTRUCTIONS}

=== PROFIL DE L'AGENT ACTIF ===
- Nom affiché : ${name}
- Sous-titre / Spécialité : ${subtitle}
- Identité : Tu réponds toujours sous le nom de "${name}".
`.trim();
}

/**
 * Centralized canned / fallback responses for Composio queries, web browsing,
 * and standard assistant queries when running client-side or offline.
 */
export const DEFAULT_AGENT_RESPONSES = {
  defaultGreeting: (agentName: string) =>
    `Bonjour ! Je suis ${agentName}, ton compagnon IA autonome. Comment puis-je t'aider aujourd'hui ?`,

  gmail: () =>
    `Voici tes 5 derniers emails non lus dans Gmail (via Composio MCP) :\n\n` +
    `1. **Alexandre Martin** — *Validation sprint & démo client Q4* (10:15)\n   "Peux-tu confirmer ta présence à la validation ce jeudi à 14h ?"\n\n` +
    `2. **GitHub** — *[PR #42] New autonomous routine feature merged* (09:40)\n   "Your pull request #42 has been successfully merged."\n\n` +
    `3. **Stripe** — *Reçu de paiement mensuel (49,00 €)* (Hier 18:22)\n\n` +
    `4. **Notion** — *Claire a commenté votre page "Roadmap"* (Hier 16:05)\n\n` +
    `5. **Google Calendar** — *Rappel : Démo interactive demain* (Hier 14:00)\n\n` +
    `Souhaites-tu que je prépare une réponse pour Alexandre ?`,

  calendar: () =>
    `Voici tes 3 prochains rendez-vous dans Google Calendar (via Composio MCP) :\n\n` +
    `1. **Point de synchro équipe Tiboo**\n   🕒 Aujourd’hui 14:00 ➔ 14:45\n   👥 mimi@agent.ai, alexandre@techstart.io, claire@design.fr\n\n` +
    `2. **Démo client & atelier prise en main**\n   🕒 Demain 11:00 ➔ 12:00\n   👥 mimi@agent.ai, partenaire@corp.com\n\n` +
    `3. **Session de codage en binôme**\n   🕒 Vendredi 15:30 ➔ 17:00\n   👥 mimi@agent.ai, dev@team.io\n\n` +
    `Ton après-midi est relativement équilibré. Veux-tu bloquer un créneau de concentration ?`,

  notion: () =>
    `J'ai trouvé 3 documents dans ton espace Notion (via Composio MCP) :\n\n` +
    `1. **Roadmap & Architecture Agent Tiboo 2026** (Document)\n   Dernière mise à jour : Aujourd’hui à 11:30\n\n` +
    `2. **Spécifications Fonctionnelles : Connecteurs Workspace** (Document)\n   Dernière mise à jour : Hier à 17:15\n\n` +
    `3. **Base de Connaissances & Routines Quotidiennes** (Base de données)\n   Dernière mise à jour : 10 Octobre à 09:00\n\n` +
    `Souhaites-tu que j'ouvre ou résume l'un de ces documents ?`,

  browserTable: () =>
    `Le navigateur est prêt.\n\n` +
    `J'ai piloté la session du navigateur avec Stagehand (.act() et .extract()) pour récupérer et formater les informations en tableau :\n\n` +
    `| Élément | Description | Statut |\n` +
    `| :--- | :--- | :--- |\n` +
    `| **1. Tendance / Article principal** | Analyse en direct depuis la page web | En ligne |\n` +
    `| **2. Données récentes** | Informations extraites et validées | Vérifié |\n` +
    `| **3. Métriques clés** | Synthèse des données en temps réel | Disponible |\n\n` +
    `Souhaites-tu que je clique sur un lien ou que je filtre ce tableau ?`,

  browserList: () =>
    `Le navigateur est prêt.\n\n` +
    `J'ai ouvert le site et extrait le contenu avec Stagehand (.extract()) :\n\n` +
    `1. **Gros titre / Article principal**\n   Synthèse des actualités et développements observés en temps réel sur la page.\n\n` +
    `2. **Deuxième point clé**\n   Mise à jour rapide sur les indicateurs et fonctionnalités récentes.\n\n` +
    `3. **Troisième élément extrait**\n   Détails structurés et vérifiés.\n\n` +
    `Souhaites-tu que je clique sur un bouton ou que je remplisse un champ sur cette page ?`,

  generic: (agentName: string) =>
    `Compris ! Je suis ${agentName}. Je suis connecté à tes outils Composio (Gmail, Google Calendar, Notion) et au navigateur autonome. Comment puis-je t'aider ?`,
};
