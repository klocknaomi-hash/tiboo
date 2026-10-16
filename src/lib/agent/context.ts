/**
 * Per-request context handed to every agent tool.
 *
 * Tools never read a global user: they act for `userId` only, through `db`
 * (a Supabase client that respects Row Level Security for that user, or the
 * service client when the scheduled-task cron runs on the user's behalf).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface TibooRunContext {
  userId: string;
  db: SupabaseClient;
  /** IANA time zone of the user, used when scheduling tasks. */
  timezone?: string;
}
