export type SourceType =
  | "forum_post"
  | "company_blog"
  | "press_quote"
  | "marketing_page"
  | "podcast_transcript"
  | "conf_talk"
  | "support_thread"
  | "postmortem"
  | "investor_letter"
  | "qa_transcript"
  | "social_post"
  | "other";

export type InvestorTier = 1 | 2 | 3;
export type StartupTier = 1 | 2 | 3;

export type InvestorArchetype =
  | "scout"
  | "conviction"
  | "pack"
  | "thematic"
  | "status"
  | "operator_angel";

export type TriggerType =
  | "IGNITION"
  | "BREAKOUT"
  | "OVERHEAT"
  | "NARRATIVE_MISMATCH"
  | "PREDATOR_MODE";

export interface ContentItem {
  id: string;
  startup_id: string;
  source_type: SourceType;
  tier: StartupTier | 3;
  source_url?: string | null;
  created_at: string;
  date_published?: string | null;
  text: string;
  author?: string | null;
}

export interface InvestorEvent {
  id: string;
  startup_id: string;
  investor_id: string;
  investor_tier: InvestorTier;
  archetype?: InvestorArchetype;
  event_type: "view" | "save" | "intro_request" | "comment" | "click";
  occurred_at: string;
}

export interface StartupDailySignals {
  startup_id: string;
  day: string;

  tech_density: number;
  founder_voice: number;
  customer_pull: number;
  objection_pressure: number;
  narrative_coherence: number;

  fomo: number;
  god: number;

  fomo_intensity_7d: number;
  fomo_accel: number;
  quality_shift: number;

  triggers: TriggerType[];
}
