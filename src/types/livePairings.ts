/**
 * Live Signal Pairings - Type Definitions
 * Powers the real-time startup-investor pairing display on the landing page
 */

// Single pairing returned from API/database
export interface LivePairing {
  startup_id: string;
  startup_name: string;
  investor_id: string;
  investor_name: string;
  reason: string;           // "Capital velocity" | "Stage readiness" | "Thesis convergence"
  confidence: number;       // 0–1 float (derived from investor_signal_sector_0_10 / 10)
  sector_key: string;       // e.g. "AI/ML", "FinTech", "Climate"
  created_at: string;       // ISO timestamp
}

// API response shape
export type LivePairingsResponse = LivePairing[];

// Hook state for consuming in components
export interface LivePairingsState {
  data: LivePairing[];
  loading: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
}

// Error response from API
export interface LivePairingsError {
  error: string;
}

/*
 * Sample JSON array (what the API returns):
 * 
 * [
 *   {
 *     "startup_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *     "startup_name": "Climate Analytics",
 *     "investor_id": "f0e1d2c3-b4a5-6789-0123-456789abcdef",
 *     "investor_name": "Khosla Ventures",
 *     "reason": "Capital velocity",
 *     "confidence": 0.87,
 *     "sector_key": "Climate",
 *     "created_at": "2026-01-17T14:30:00.000Z"
 *   },
 *   {
 *     "startup_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
 *     "startup_name": "AI Infrastructure",
 *     "investor_id": "e1d2c3b4-a5f6-7890-1234-567890abcdef",
 *     "investor_name": "Sequoia Capital",
 *     "reason": "Stage readiness",
 *     "confidence": 0.92,
 *     "sector_key": "AI/ML",
 *     "created_at": "2026-01-17T14:28:00.000Z"
 *   },
 *   {
 *     "startup_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
 *     "startup_name": "FinTech API",
 *     "investor_id": "d2c3b4a5-f6e7-8901-2345-678901abcdef",
 *     "investor_name": "Ribbit Capital",
 *     "reason": "Thesis convergence",
 *     "confidence": 0.78,
 *     "sector_key": "FinTech",
 *     "created_at": "2026-01-17T14:25:00.000Z"
 *   }
 * ]
 */
