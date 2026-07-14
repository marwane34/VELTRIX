import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client with startup validation.
 *
 * Validates environment variables BEFORE creating the client so that
 * misconfiguration produces a readable diagnostic instead of a silent
 * "Failed to fetch" / ERR_NAME_NOT_RESOLVED at runtime.
 */

export type SupabaseConfigStatus = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  url?: string;
  keyPrefix?: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Validate the Supabase environment variables.
 * Returns a structured result so the UI can display meaningful diagnostics.
 */
export function validateSupabaseConfig(): SupabaseConfigStatus {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── URL presence ──────────────────────────────────────────────────────────
  if (!SUPABASE_URL) {
    errors.push('Missing environment variable: VITE_SUPABASE_URL. Add it to frontend/.env');
    return { valid: false, errors, warnings };
  }

  // ── URL format ─────────────────────────────────────────────────────────────
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(SUPABASE_URL);
  } catch {
    errors.push(`Supabase URL is invalid: "${SUPABASE_URL}" — must be a fully-qualified HTTPS URL (e.g. https://xyz.supabase.co)`);
    return { valid: false, errors, warnings };
  }

  // ── HTTPS check ────────────────────────────────────────────────────────────
  if (parsedUrl.protocol !== 'https:') {
    errors.push(`Supabase URL must use HTTPS. Found: ${parsedUrl.protocol}//`);
  }

  // ── Domain check ───────────────────────────────────────────────────────────
  if (!parsedUrl.hostname.endsWith('.supabase.co')) {
    warnings.push(`Supabase URL hostname "${parsedUrl.hostname}" does not end with .supabase.co — verify this is correct.`);
  }

  // ── Key presence ───────────────────────────────────────────────────────────
  if (!SUPABASE_ANON_KEY) {
    errors.push('Missing environment variable: VITE_SUPABASE_ANON_KEY. Add it to frontend/.env');
    return { valid: false, errors, warnings };
  }

  // ── Key format (JWT) ───────────────────────────────────────────────────────
  if (SUPABASE_ANON_KEY.length < 100) {
    errors.push('Supabase anon key appears truncated (expected a JWT of 100+ characters). Check frontend/.env');
  }
  const keyParts = SUPABASE_ANON_KEY.split('.');
  if (keyParts.length !== 3) {
    warnings.push('Supabase anon key does not look like a valid JWT (expected 3 dot-separated segments).');
  } else {
    try {
      const payload = JSON.parse(atob(keyParts[1]));
      if (payload.ref) {
        const refFromUrl = parsedUrl.hostname.split('.')[0];
        if (payload.ref !== refFromUrl) {
          warnings.push(`Anon key project ref "${payload.ref}" does not match URL project ref "${refFromUrl}".`);
        }
      }
    } catch {
      warnings.push('Supabase anon key payload could not be decoded.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    url: SUPABASE_URL,
    keyPrefix: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(0, 20) + '...' : undefined,
  };
}

/**
 * Classify a network/auth error into a human-readable message.
 */
export function classifySupabaseError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    if (!navigator.onLine) return 'Internet connection unavailable. Check your network and try again.';
    if (!SUPABASE_URL) return 'Missing environment variables. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env';
    try {
      new URL(SUPABASE_URL);
    } catch {
      return `Supabase URL is invalid: "${SUPABASE_URL}"`;
    }
    return `Supabase project cannot be reached at ${SUPABASE_URL}. The project may be paused, deleted, or the URL is incorrect.`;
  }

  if (lower.includes('err_name_not_resolved') || lower.includes('enotfound') || lower.includes('dns')) {
    return `DNS resolution failed for ${SUPABASE_URL ?? '(missing URL)'}. The Supabase project URL does not resolve — verify the project ref is correct.`;
  }

  if (lower.includes('invalid api key') || lower.includes('invalid_api_key') || lower.includes('jwt')) {
    return 'Invalid anon key. The VITE_SUPABASE_ANON_KEY in frontend/.env is incorrect or expired.';
  }

  if (lower.includes('signup_disabled') || lower.includes('email_rate_limit')) {
    return 'Authentication service unavailable. ' + msg;
  }

  if (lower.includes('timeout') || lower.includes('aborted')) {
    return `Supabase project cannot be reached at ${SUPABASE_URL ?? '(missing URL)'}. The request timed out.`;
  }

  return msg;
}

// ── Client creation with validation ──────────────────────────────────────────

const configStatus = validateSupabaseConfig();

if (!configStatus.valid) {
  console.error('═══════════════════════════════════════════════════════════');
  console.error('  VELTRIX SCADA — Supabase Configuration Error');
  console.error('═══════════════════════════════════════════════════════════');
  configStatus.errors.forEach(e => console.error('  ✗ ' + e));
  configStatus.warnings.forEach(w => console.warn('  ⚠ ' + w));
  console.error('');
  console.error('  Fix frontend/.env with valid Supabase credentials.');
  console.error('═══════════════════════════════════════════════════════════');
} else {
  console.info('  ✓ Supabase configured: ' + configStatus.url);
  configStatus.warnings.forEach(w => console.warn('  ⚠ ' + w));
}

/**
 * Supabase client singleton.
 * If env vars are invalid, this is `null` — callers must check.
 */
export const supabase: SupabaseClient | null = configStatus.valid
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Get the Supabase client or throw a readable error if misconfigured.
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. ' +
      configStatus.errors.join(' ')
    );
  }
  return supabase;
}

export { configStatus };
