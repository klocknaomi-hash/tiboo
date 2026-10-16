# Mise en production de Tiboo

L'application mobile parle à un **serveur Tiboo** (les routes `src/app/api`). C'est lui qui détient les clés et appelle l'IA et les connecteurs.

## 1. Base de données (Supabase)
1. Exécuter `supabase/schema.sql`, puis les fichiers de `supabase/migrations/` dans l'ordre, dont `20261016_security_hardening.sql` (règles d'accès strictes).
2. Pour les tâches planifiées, définir les réglages lus par `trigger_due_scheduled_tasks()` :
   `app.settings.supabase_url` et `app.settings.service_role_key`.
3. Déployer la fonction : `supabase functions deploy execute-scheduled-task`, puis :
   `supabase secrets set TIBOO_API_URL=https://… TIBOO_CRON_SECRET=…`

## 2. Serveur Tiboo (EAS Hosting)
1. `app.json` est déjà en `web.output: "server"`.
2. `npx expo export --platform web`, puis `npx eas-cli deploy`.
3. Dans les variables d'environnement d'EAS, renseigner toutes les variables « Server » de `.env.example` (`TIBOO_SERVER_SECRET`, `TIBOO_CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `COMPOSIO_API_KEY`…).

## 3. Application mobile
1. Mettre l'adresse du serveur dans `EXPO_PUBLIC_API_URL` (ex. `https://tiboo.expo.app`).
2. Construire avec EAS Build. Sans cette adresse, l'application affiche « L'adresse du serveur Tiboo n'est pas configurée ». Elle n'invente jamais de réponse.

## Ce qui est volontairement bloqué
- Toutes les routes `/api` exigent une connexion Supabase valide.
- Envoyer un email, créer un événement ou une page, ou toute autre écriture dans une application connectée : confirmation obligatoire dans le chat.
- Pendant une tâche planifiée, personne ne peut confirmer : l'action n'est pas faite, et l'exécution est enregistrée comme « échouée » avec la raison.
- La limite de messages par heure et par utilisateur est gardée en mémoire du serveur. Avec plusieurs serveurs, il faudra la déplacer dans Supabase.
