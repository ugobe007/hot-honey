/**
 * Frontend Analytics Helper (Prompt 18)
 * Lightweight client-side event tracking
 */

import { supabase } from './lib/supabase';

// Generate or retrieve persistent session ID
function getSessionId(): string {
  const key = 'pythh_session_id';
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
}

// Debounce map: prevents same event firing twice within 10 seconds
const lastEventTime = new Map<string, number>();
const DEBOUNCE_MS = 10_000;

interface EventProps {
  page?: string;
  referrer?: string;
  entity_type?: string;
  entity_id?: string;
  [key: string]: unknown;
}

/**
 * Log an analytics event
 * @param name - Event name (must be in server allowlist)
 * @param props - Additional properties
 */
export async function logEvent(name: string, props: EventProps = {}): Promise<void> {
  try {
    // Debounce: skip if same event fired recently
    const debounceKey = `${name}:${props.entity_id || ''}`;
    const lastTime = lastEventTime.get(debounceKey);
    if (lastTime && Date.now() - lastTime < DEBOUNCE_MS) {
      return;
    }
    lastEventTime.set(debounceKey, Date.now());
    
    // Get auth token if available
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const { page, referrer, entity_type, entity_id, ...properties } = props;
    
    const body = {
      event_name: name,
      session_id: getSessionId(),
      page: page || window.location.pathname,
      referrer: referrer || document.referrer || null,
      entity_type,
      entity_id,
      properties,
    };
    
    // Fire and forget (don't await)
    fetch('/api/events', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }).catch(() => {
      // Silently ignore failures
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Log a page view event
 */
export function logPageView(pageName?: string): void {
  logEvent('page_viewed', { 
    page: pageName || window.location.pathname,
  });
}

/**
 * Pre-defined event helpers for common actions
 */
export const analytics = {
  // Pricing & upgrades
  pricingViewed: () => logEvent('pricing_viewed'),
  upgradeCTAClicked: (targetPlan: string) => 
    logEvent('upgrade_cta_clicked', { target_plan: targetPlan }),
  
  // Matches
  matchesPageViewed: (startupId?: string) => 
    logEvent('matches_page_viewed', { entity_type: 'startup', entity_id: startupId }),
  
  // Features
  exportCSVClicked: (startupId?: string) => 
    logEvent('export_csv_clicked', { entity_type: 'startup', entity_id: startupId }),
  dealMemoCopied: (startupId?: string) => 
    logEvent('deal_memo_copied', { entity_type: 'startup', entity_id: startupId }),
  
  // Sharing
  shareCreated: (shareId: string) => 
    logEvent('share_created', { entity_type: 'share', entity_id: shareId }),
  shareOpened: (shareId: string) => 
    logEvent('share_opened', { entity_type: 'share', entity_id: shareId }),
  
  // Watchlist
  watchlistToggled: (startupId: string, isOn: boolean) =>
    logEvent('watchlist_toggled', { 
      entity_type: 'startup', 
      entity_id: startupId, 
      action: isOn ? 'add' : 'remove' 
    }),
  
  // Settings
  emailAlertsToggled: (enabled: boolean) =>
    logEvent('email_alerts_toggled', { enabled }),
};

export default analytics;
