/**
 * Cron Expression & Scheduling Parser Utility
 *
 * Provides:
 * 1. Cron validation & parsing (standard 5-part cron: minute hour day-of-month month day-of-week)
 * 2. Next execution time calculation (getNextCronRunDate)
 * 3. Human-friendly schedule formatting in French (formatCronToHuman)
 * 4. Natural language intent parser (extractSchedulingFromText) capable of detecting
 *    recurring requests in chat (e.g. "Vérifie mon Gmail tous les jours à 9h...")
 */

export interface ParsedScheduleIntent {
  /** True when a recurring schedule pattern was found */
  isRecurring: boolean;
  /** 5-part cron expression (e.g. "0 9 * * *") */
  schedule: string;
  /** Human readable description (e.g. "Tous les jours à 09:00") */
  scheduleLabel: string;
  /** Cleaned agent instruction without the scheduling trigger words */
  instruction: string;
  /** Suggested title for the scheduled task */
  title: string;
  /** User local timezone */
  timezone: string;
}

/**
 * Gets user's local timezone or falls back to 'Europe/Paris'
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  } catch {
    return 'Europe/Paris';
  }
}

/**
 * Validates whether a string has 5 parts conforming to standard cron syntax
 */
export function isValidCron(cron: string): boolean {
  if (!cron || typeof cron !== 'string') return false;
  const parts = cron.trim().split(/\s+/);
  return parts.length === 5;
}

/**
 * Human-friendly French description of common cron patterns
 */
export function formatCronToHuman(cron: string): string {
  if (!cron) return 'Non planifié';
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;

  const [min, hour, dom, mon, dow] = parts;

  // Pattern: */N * * * * (Every N minutes)
  if (min.startsWith('*/') && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    const step = min.replace('*/', '');
    return `Toutes les ${step} minutes`;
  }

  // Pattern: 0 * * * * (Every hour)
  if (min === '0' && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return 'Toutes les heures';
  }

  // Format hour & min
  const pad = (n: string | number) => String(n).padStart(2, '0');
  const formattedTime = !isNaN(Number(hour)) && !isNaN(Number(min))
    ? `${pad(hour)}:${pad(min)}`
    : `${hour}:${min}`;

  // Pattern: min hour * * * (Every day at HH:MM)
  if (dom === '*' && mon === '*' && dow === '*') {
    return `Tous les jours à ${formattedTime}`;
  }

  // Pattern: min hour * * 1-5 (Weekdays)
  if (dom === '*' && mon === '*' && dow === '1-5') {
    return `Du lundi au vendredi à ${formattedTime}`;
  }

  // Pattern: min hour * * D (Specific day of week: 0=Sun, 1=Mon, ..., 6=Sat)
  const dayNames: Record<string, string> = {
    '0': 'dimanche',
    '7': 'dimanche',
    '1': 'lundi',
    '2': 'mardi',
    '3': 'mercredi',
    '4': 'jeudi',
    '5': 'vendredi',
    '6': 'samedi',
  };

  if (dom === '*' && mon === '*' && dayNames[dow]) {
    return `Chaque ${dayNames[dow]} à ${formattedTime}`;
  }

  return `Cron: ${cron}`;
}

/**
 * Helper to match an integer against a cron field (e.g. '*', '5', 'step', '1-5', '1,2,3')
 */
function matchCronField(val: number, field: string): boolean {
  if (field === '*') return true;

  // Step notation: */N
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    return !isNaN(step) && step > 0 && val % step === 0;
  }

  // Range notation: A-B
  if (field.includes('-')) {
    const [start, end] = field.split('-').map((n) => parseInt(n, 10));
    if (!isNaN(start) && !isNaN(end)) {
      return val >= start && val <= end;
    }
  }

  // List notation: A,B,C
  if (field.includes(',')) {
    const items = field.split(',').map((n) => parseInt(n, 10));
    return items.includes(val);
  }

  const num = parseInt(field, 10);
  return !isNaN(num) && num === val;
}

/**
 * Calculates the next occurrence of a cron expression starting from fromDate
 */
export function getNextCronRunDate(
  cron: string,
  fromDate: Date = new Date(),
  _timezone?: string
): Date {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    // Fallback: 24h later
    return new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
  }

  const [cronMin, cronHour, cronDom, cronMon, cronDow] = parts;

  // Start checking from the next whole minute
  const next = new Date(fromDate.getTime());
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  // Maximum search horizon: 366 days
  const maxIterations = 366 * 24 * 60;
  let iterations = 0;

  while (iterations < maxIterations) {
    const min = next.getMinutes();
    const hour = next.getHours();
    const dom = next.getDate();
    const mon = next.getMonth() + 1; // 1-12
    const dow = next.getDay(); // 0-6 (0=Sunday)

    const matchMin = matchCronField(min, cronMin);
    const matchHour = matchCronField(hour, cronHour);
    const matchDom = matchCronField(dom, cronDom);
    const matchMon = matchCronField(mon, cronMon);
    const matchDow = matchCronField(dow, cronDow);

    if (matchMin && matchHour && matchDom && matchMon && matchDow) {
      return next;
    }

    // Fast-forward hour if hour doesn't match
    if (!matchHour && cronMin !== '*') {
      next.setMinutes(0);
      next.setHours(next.getHours() + 1);
      iterations += 60;
      continue;
    }

    next.setMinutes(next.getMinutes() + 1);
    iterations++;
  }

  // Safety fallback
  return new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Extracts title from instruction
 */
function deriveTitleFromInstruction(instruction: string): string {
  const lower = instruction.toLowerCase();
  if (lower.includes('gmail') || lower.includes('mail') || lower.includes('inbox')) {
    return 'Vérification quotidienne Gmail';
  }
  if (lower.includes('calendar') || lower.includes('agenda') || lower.includes('calendrier')) {
    return 'Synchronisation Agenda & Événements';
  }
  if (lower.includes('notion') || lower.includes('doc')) {
    return 'Revue documentaire Notion';
  }
  if (lower.includes('slack')) {
    return 'Synthèse des messages Slack';
  }
  if (lower.includes('briefing') || lower.includes('matin')) {
    return 'Briefing matinal autonome';
  }
  if (lower.includes('veille') || lower.includes('news') || lower.includes('hacker news')) {
    return 'Veille technologique automatisée';
  }
  // Trim to first 40 chars
  return instruction.length > 40 ? `${instruction.slice(0, 37)}...` : instruction;
}

/**
 * Natural language intent parser
 *
 * Examines chat user input to determine if the user is asking to schedule
 * a recurring routine (e.g. "Vérifie mon Gmail tous les jours à 9h et résume les 5 derniers mails").
 */
export function extractSchedulingFromText(prompt: string): ParsedScheduleIntent | null {
  if (!prompt || typeof prompt !== 'string') return null;

  const text = prompt.trim();
  const lower = text.toLowerCase();

  const userTimezone = getUserTimezone();

  // 1. Check for standard French recurring markers
  // "tous les jours à 9h", "chaque jour à 9h30", "tous les matins à 8h", "tous les soirs à 20h"
  const dailyHourRegex = /(?:tous les jours|chaque jour|tous les matins|chaque matin|tous les soirs|chaque soir|quotidiennement)\s*(?:à|vers|a)?\s*(\d{1,2})(?:h|:)?(\d{2})?/i;
  const dailyMatch = text.match(dailyHourRegex);

  if (dailyMatch) {
    const hour = parseInt(dailyMatch[1], 10);
    const min = dailyMatch[2] ? parseInt(dailyMatch[2], 10) : 0;
    const pad = (n: number) => String(n).padStart(2, '0');

    if (hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
      const schedule = `${min} ${hour} * * *`;
      const scheduleLabel = `Tous les jours à ${pad(hour)}:${pad(min)}`;

      // Remove the schedule fragment from instruction
      const cleaned = text
        .replace(dailyMatch[0], '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      const instruction = cleaned.length > 0 ? cleaned : text;

      return {
        isRecurring: true,
        schedule,
        scheduleLabel,
        instruction,
        title: deriveTitleFromInstruction(instruction),
        timezone: userTimezone,
      };
    }
  }

  // 2. "tous les lundis à 10h", "chaque dimanche à 18h"
  const weekdayRegex = /(?:tous les|chaque)\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)s?\s*(?:à|vers|a)?\s*(\d{1,2})(?:h|:)?(\d{2})?/i;
  const weekdayMatch = text.match(weekdayRegex);

  if (weekdayMatch) {
    const dayStr = weekdayMatch[1].toLowerCase();
    const hour = parseInt(weekdayMatch[2], 10);
    const min = weekdayMatch[3] ? parseInt(weekdayMatch[3], 10) : 0;
    const pad = (n: number) => String(n).padStart(2, '0');

    const dayMap: Record<string, number> = {
      dimanche: 0,
      lundi: 1,
      mardi: 2,
      mercredi: 3,
      jeudi: 4,
      vendredi: 5,
      samedi: 6,
    };

    const dow = dayMap[dayStr] ?? 1;

    if (hour >= 0 && hour <= 23) {
      const schedule = `${min} ${hour} * * ${dow}`;
      const scheduleLabel = `Chaque ${dayStr} à ${pad(hour)}:${pad(min)}`;
      const cleaned = text.replace(weekdayMatch[0], '').replace(/\s{2,}/g, ' ').trim();
      const instruction = cleaned.length > 0 ? cleaned : text;

      return {
        isRecurring: true,
        schedule,
        scheduleLabel,
        instruction,
        title: deriveTitleFromInstruction(instruction),
        timezone: userTimezone,
      };
    }
  }

  // 3. "toutes les 15 minutes", "toutes les 30 minutes", "toutes les heures"
  const minutesIntervalRegex = /toutes les\s+(\d+)\s+minutes?/i;
  const minIntervalMatch = text.match(minutesIntervalRegex);
  if (minIntervalMatch) {
    const step = parseInt(minIntervalMatch[1], 10);
    if (step > 0 && step <= 59) {
      const schedule = `*/${step} * * * *`;
      const scheduleLabel = `Toutes les ${step} minutes`;
      const cleaned = text.replace(minIntervalMatch[0], '').replace(/\s{2,}/g, ' ').trim();
      const instruction = cleaned.length > 0 ? cleaned : text;

      return {
        isRecurring: true,
        schedule,
        scheduleLabel,
        instruction,
        title: deriveTitleFromInstruction(instruction),
        timezone: userTimezone,
      };
    }
  }

  if (lower.includes('toutes les heures') || lower.includes('chaque heure')) {
    const schedule = '0 * * * *';
    const scheduleLabel = 'Toutes les heures';
    const cleaned = text
      .replace(/toutes les heures/gi, '')
      .replace(/chaque heure/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const instruction = cleaned.length > 0 ? cleaned : text;

    return {
      isRecurring: true,
      schedule,
      scheduleLabel,
      instruction,
      title: deriveTitleFromInstruction(instruction),
      timezone: userTimezone,
    };
  }

  // 4. English recurring patterns
  // "every day at 9am", "every day at 9:00", "every morning at 8:30"
  const englishDailyRegex = /every day at\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const enDailyMatch = text.match(englishDailyRegex);
  if (enDailyMatch) {
    let hour = parseInt(enDailyMatch[1], 10);
    const min = enDailyMatch[2] ? parseInt(enDailyMatch[2], 10) : 0;
    const ampm = enDailyMatch[3]?.toLowerCase();

    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    const pad = (n: number) => String(n).padStart(2, '0');
    const schedule = `${min} ${hour} * * *`;
    const scheduleLabel = `Every day at ${pad(hour)}:${pad(min)}`;
    const cleaned = text.replace(enDailyMatch[0], '').replace(/\s{2,}/g, ' ').trim();
    const instruction = cleaned.length > 0 ? cleaned : text;

    return {
      isRecurring: true,
      schedule,
      scheduleLabel,
      instruction,
      title: deriveTitleFromInstruction(instruction),
      timezone: userTimezone,
    };
  }

  // 5. Explicit scheduling triggers like "planifie la tâche récurrente : ... (0 9 * * *)"
  const explicitCronRegex = /(?:cron\s*:?\s*)?([0-9*,/-]+\s+[0-9*,/-]+\s+[0-9*,/-]+\s+[0-9*,/-]+\s+[0-9*,/-]+)/i;
  const cronMatch = text.match(explicitCronRegex);
  if (cronMatch && isValidCron(cronMatch[1])) {
    const schedule = cronMatch[1];
    const scheduleLabel = formatCronToHuman(schedule);
    const cleaned = text.replace(cronMatch[0], '').replace(/\s{2,}/g, ' ').trim();
    const instruction = cleaned.length > 0 ? cleaned : text;

    return {
      isRecurring: true,
      schedule,
      scheduleLabel,
      instruction,
      title: deriveTitleFromInstruction(instruction),
      timezone: userTimezone,
    };
  }

  return null;
}
