/**
 * Analytics - Signal Science State Machine
 *
 * Batches events and writes to Supabase ai_logs.
 * Design goals:
 * - No event loss on transient failures
 * - Bulk insert (1 request per flush)
 * - Stable anon_id + session_id for funnel stitching
 */

type EventName =
  | 'page_viewed'
  | 'oracle_viewed'
  | 'url_submitted'
  | 'scan_completed'
  | 'instant_matches_viewed'
  | 'match_saved'
  | 'detail_viewed'
  | 'role_toggled'
  | 'login_completed'
  | 'logout_completed'
  | 'paywall_shown'
  | 'checkout_started'
  | 'checkout_completed'
  | 'guard_blocked'
  | 'phase_advanced'
  | 'drawer_opened'
  | 'drawer_closed';

interface EventData {
  [key: string]: string | number | boolean | null | undefined;
}

type QueuedEvent = {
  name: EventName;
  data: EventData;
  timestamp: number;
};

const eventQueue: QueuedEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;

// IDs for funnel stitching
const ANON_ID_KEY = 'pyth_anon_id';
const SESSION_ID_KEY = 'pyth_session_id';

/** Generate a lightweight id (good enough for analytics) */
function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function getAnonId(): string {
  if (typeof window === 'undefined') return 'server';
  const existing = localStorage.getItem(ANON_ID_KEY);
  if (existing) return existing;
  const created = genId('anon');
  localStorage.setItem(ANON_ID_KEY, created);
  return created;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  const existing = sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;
  const created = genId('sess');
  sessionStorage.setItem(SESSION_ID_KEY, created);
  return created;
}

/**
 * Track an analytics event
 */
export function trackEvent(name: EventName, data: EventData = {}): void {
  const anon_id = getAnonId();
  const session_id = getSessionId();

  const event: QueuedEvent = {
    name,
    data: {
      ...data,
      anon_id,
      session_id,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    },
    timestamp: Date.now(),
  };

  eventQueue.push(event);

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[pyth.analytics] ${name}`, event.data);
  }

  // Flush after 2s (batch)
  if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      void flushEvents();
    }, 2000);
  }
}

/**
 * Flush events to Supabase (bulk insert)
 */
async function flushEvents(): Promise<void> {
  if (isFlushing) return;
  isFlushing = true;

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (eventQueue.length === 0) {
    isFlushing = false;
    return;
  }

  // Copy but DO NOT clear yet (avoid event loss)
  const events = eventQueue.slice();

  try {
    const { supabase } = await import('./supabase');

    const rows = events.map((event) => ({
      type: 'analytics',
      action: event.name,
      input: JSON.stringify(event.data),
      output: null,
      status: 'tracked',
      created_at: new Date(event.timestamp).toISOString(),
    }));

    const { error } = await (supabase as any).from('ai_logs').insert(rows);

    if (error) throw error;

    // Success: remove flushed events
    eventQueue.splice(0, events.length);
  } catch (error) {
    // Keep queue (don't drop events). Try again soon.
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[pyth.analytics] Failed to flush events:', error);
    }
    // Backoff retry (5s)
    if (!flushTimeout) {
      flushTimeout = setTimeout(() => {
        void flushEvents();
      }, 5000);
    }
  } finally {
    isFlushing = false;
  }
}

/**
 * Flush when tab is backgrounded (more reliable than beforeunload)
 */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flushEvents();
    }
  });
}

/**
 * Debug helper
 */
export function getAnalyticsSummary(): { pending: number; lastEvent: EventName | null } {
  return {
    pending: eventQueue.length,
    lastEvent: eventQueue.length > 0 ? eventQueue[eventQueue.length - 1].name : null,
  };
}
