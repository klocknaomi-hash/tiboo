# Choix du fournisseur d'IA pour Tiboo

*État au 16 octobre 2026. Les tarifs et les identifiants de modèles changent souvent : vérifiez-les dans la console de chaque fournisseur avant la mise en production.*

## Ce qui existe dans le code

| | OpenAI | Claude (Anthropic) | Grok (xAI) |
|---|---|---|---|
| Fichier | `src/lib/ai/providers/openaiProvider.ts` | `anthropicProvider.ts` | `grokProvider.ts` |
| Appel | SDK `@openai/agents` | SDK officiel `@anthropic-ai/sdk` | API compatible OpenAI (`fetch`) |
| Modèle par défaut | `gpt-4o-mini` (`OPENAI_MODEL`) | `claude-opus-5-5` (`ANTHROPIC_MODEL`) | à définir (`GROK_MODEL`) |
| Outils Tiboo (Gmail, Agenda, Notion, tâches, web) | **Oui** | Non (conversation seule) | Non (conversation seule) |
| Confirmation avant action sensible | **Oui** (`needsApproval`) | sans objet | sans objet |
| Historique de conversation | Oui | Oui | Oui |

Le fournisseur se choisit **sur le serveur** avec `DEFAULT_AI_PROVIDER` (`openai`, `anthropic` ou `grok`). L'application ne peut pas le changer.

## Comparaison selon vos critères

Le critère prioritaire est **l'usage des connecteurs et l'exécution d'actions**.

1. **Appel d'outils et orchestration** : les trois API savent appeler des outils (« function calling »). Dans Tiboo, seul le chemin OpenAI est **branché** aux outils, grâce au SDK Agents qui gère la boucle, les confirmations (`needsApproval`) et la reprise après confirmation. Pour Claude, il faudrait réécrire cette boucle avec le SDK Anthropic (son « Tool Runner » le permet). Pour Grok, il faudrait une boucle maison.
2. **Connecteurs (Composio)** : Composio fonctionne avec n'importe quel modèle. Les outils de Tiboo appellent Composio eux-mêmes (`src/lib/server/composio.ts`), donc ce critère ne départage pas les fournisseurs.
3. **Fiabilité sur tâches complexes, raisonnement, respect des consignes** : à mesurer sur vos propres demandes (voir la recommandation). Je n'ai pas pu tester faute de clés API.
4. **Coût** : Claude Opus 5.5 coûte 4 $ / 20 $ par million de jetons (entrée / sortie), Claude Haiku 5.5 0,10 $ / 0,50 $ (tarifs Anthropic). Tarifs OpenAI et xAI : **à vérifier** dans leurs consoles. La limite `TIBOO_MAX_MESSAGES_PER_HOUR` plafonne la consommation par utilisateur.
5. **Latence** : un petit modèle (gpt-4o-mini, Claude Haiku) répond plus vite qu'un grand. À mesurer.
6. **Sécurité et confidentialité** : les clés restent sur le serveur, jamais dans l'application. Chaque utilisateur n'accède qu'à ses propres comptes connectés. Les conditions de conservation des données diffèrent selon le fournisseur et l'offre : à lire avant de traiter des données personnelles (RGPD).
7. **Intégration dans la stack** : OpenAI est déjà intégré de bout en bout. Claude est intégré en conversation via son SDK officiel. Grok passe par un simple appel HTTP.

## Recommandation

**Garder OpenAI comme moteur principal pour l'instant.** C'est le seul chemin où l'agent peut réellement utiliser les connecteurs, avec confirmation des actions sensibles, et le reste de l'application est déjà construit autour.

La couche d'abstraction (`src/lib/ai`) permet de changer de fournisseur sans toucher à l'application. Prochaine étape conseillée, une fois les clés disponibles :
1. Écrire 20 à 30 demandes typiques de vos utilisateurs (lire ses mails, planifier une routine, résumer une page…).
2. Les passer sur OpenAI, puis brancher les mêmes outils sur Claude et comparer la réussite des actions, le coût et la latence.
3. Décider sur ces chiffres, pas sur la réputation des modèles.

## Ce qu'il manque pour que l'IA fonctionne

- `OPENAI_API_KEY` (indispensable) et, en option, `ANTHROPIC_API_KEY` / `XAI_API_KEY`.
- `COMPOSIO_API_KEY` pour les connecteurs. Les noms d'actions Composio utilisés (`GMAIL_SEND_EMAIL`, `GOOGLECALENDAR_FIND_EVENT`, `NOTION_CREATE_NOTION_PAGE`…) sont à vérifier dans le catalogue Composio avec votre clé.
- Pour Grok : l'identifiant de modèle exact affiché dans votre console xAI (`GROK_MODEL`).
