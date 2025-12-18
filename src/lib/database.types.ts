// THIS FILE IS AUTO-GENERATED FROM SUPABASE SCHEMA
// Last updated: 2025-12-18

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      investors: {
        Row: {
          id: string
          name: string
          firm: string | null
          title: string | null
          email: string | null
          linkedin_url: string | null
          twitter_url: string | null
          photo_url: string | null
          stage: string[] | null           // CORRECT: stage not stage_focus
          sectors: string[] | null          // CORRECT: sectors not sector_focus
          geography_focus: string[] | null
          check_size_min: number | null
          check_size_max: number | null
          investment_thesis: string | null
          bio: string | null
          notable_investments: Json | null
          portfolio_companies: string[] | null
          total_investments: number | null  // CORRECT: total_investments not portfolio_size
          successful_exits: number | null
          status: string | null
          is_verified: boolean | null
          created_at: string | null
          updated_at: string | null
          embedding: string | null
          // Additional fields from schema
          active_fund_size: number | null
          avg_response_time_days: number | null
          blog_url: string | null
          board_seats: number | null
          crunchbase_url: string | null
          decision_maker: boolean | null
          dry_powder_estimate: number | null
          focus_areas: Json | null
          follows_rounds: boolean | null
          investment_pace_per_year: number | null
          investor_score: number | null
          investor_tier: string | null
          last_enrichment_date: string | null
          last_investment_date: string | null
          last_news_update: string | null
          last_scored_at: string | null
          leads_rounds: boolean | null
          news_feed_url: string | null
          partners: Json | null
          preferred_intro_method: string | null
          score_breakdown: Json | null
          score_signals: string[] | null
          signals: Json | null
          startup_advice: Json | null
          twitter_handle: string | null
          typical_ownership_pct: number | null
        }
        Insert: {
          id?: string
          name: string
          firm?: string | null
          title?: string | null
          email?: string | null
          linkedin_url?: string | null
          twitter_url?: string | null
          photo_url?: string | null
          stage?: string[] | null
          sectors?: string[] | null
          geography_focus?: string[] | null
          check_size_min?: number | null
          check_size_max?: number | null
          investment_thesis?: string | null
          bio?: string | null
          notable_investments?: Json | null
          portfolio_companies?: string[] | null
          total_investments?: number | null
          successful_exits?: number | null
          status?: string | null
          is_verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          embedding?: string | null
        }
        Update: {
          id?: string
          name?: string
          firm?: string | null
          title?: string | null
          email?: string | null
          linkedin_url?: string | null
          twitter_url?: string | null
          photo_url?: string | null
          stage?: string[] | null
          sectors?: string[] | null
          geography_focus?: string[] | null
          check_size_min?: number | null
          check_size_max?: number | null
          investment_thesis?: string | null
          bio?: string | null
          notable_investments?: Json | null
          portfolio_companies?: string[] | null
          total_investments?: number | null
          successful_exits?: number | null
          status?: string | null
          is_verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          embedding?: string | null
        }
        Relationships: []
      }
      discovered_startups: {
        Row: {
          id: string
          name: string
          website: string | null
          description: string | null
          funding_amount: string | null
          funding_stage: string | null
          investors_mentioned: string[] | null
          article_url: string | null
          article_title: string | null
          article_date: string | null
          rss_source: string | null
          imported_to_startups: boolean | null
          imported_at: string | null
          startup_id: string | null
          website_verified: boolean | null
          website_status: string | null
          discovered_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          website?: string | null
          description?: string | null
          funding_amount?: string | null
          funding_stage?: string | null
          investors_mentioned?: string[] | null
          article_url?: string | null
          article_title?: string | null
          article_date?: string | null
          rss_source?: string | null
          imported_to_startups?: boolean | null
          imported_at?: string | null
          startup_id?: string | null
          website_verified?: boolean | null
          website_status?: string | null
          discovered_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          website?: string | null
          description?: string | null
          funding_amount?: string | null
          funding_stage?: string | null
          investors_mentioned?: string[] | null
          article_url?: string | null
          article_title?: string | null
          article_date?: string | null
          rss_source?: string | null
          imported_to_startups?: boolean | null
          imported_at?: string | null
          startup_id?: string | null
          website_verified?: boolean | null
          website_status?: string | null
          discovered_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      startup_uploads: {
        Row: {
          id: string
          name: string
          pitch: string | null
          description: string | null
          tagline: string | null
          website: string | null
          linkedin: string | null
          raise_amount: string | null
          raise_type: string | null
          stage: number | null
          source_type: string
          source_url: string | null
          deck_filename: string | null
          extracted_data: Json | null
          status: string | null
          admin_notes: string | null
          submitted_by: string | null
          submitted_email: string | null
          created_at: string | null
          updated_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          embedding: string | null
          // GOD Score fields
          total_god_score: number | null
          team_score: number | null
          traction_score: number | null
          market_score: number | null
          product_score: number | null
          vision_score: number | null
          // Additional metrics
          sectors: string[] | null
          location: string | null
          mrr: number | null
          arr: number | null
          team_size: number | null
          customer_count: number | null
          growth_rate_monthly: number | null
        }
        Insert: {
          id?: string
          name: string
          pitch?: string | null
          description?: string | null
          tagline?: string | null
          website?: string | null
          linkedin?: string | null
          raise_amount?: string | null
          raise_type?: string | null
          stage?: number | null
          source_type: string
          source_url?: string | null
          deck_filename?: string | null
          extracted_data?: Json | null
          status?: string | null
          admin_notes?: string | null
          submitted_by?: string | null
          submitted_email?: string | null
          created_at?: string | null
          updated_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          embedding?: string | null
          total_god_score?: number | null
          team_score?: number | null
          traction_score?: number | null
          market_score?: number | null
          product_score?: number | null
          vision_score?: number | null
          sectors?: string[] | null
          location?: string | null
          mrr?: number | null
          arr?: number | null
          team_size?: number | null
          customer_count?: number | null
          growth_rate_monthly?: number | null
        }
        Update: {
          id?: string
          name?: string
          pitch?: string | null
          description?: string | null
          tagline?: string | null
          website?: string | null
          linkedin?: string | null
          raise_amount?: string | null
          raise_type?: string | null
          stage?: number | null
          source_type?: string
          source_url?: string | null
          deck_filename?: string | null
          extracted_data?: Json | null
          status?: string | null
          admin_notes?: string | null
          submitted_by?: string | null
          submitted_email?: string | null
          created_at?: string | null
          updated_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          embedding?: string | null
          total_god_score?: number | null
          team_score?: number | null
          traction_score?: number | null
          market_score?: number | null
          product_score?: number | null
          vision_score?: number | null
          sectors?: string[] | null
          location?: string | null
          mrr?: number | null
          arr?: number | null
          team_size?: number | null
          customer_count?: number | null
          growth_rate_monthly?: number | null
        }
        Relationships: []
      }
      startup_investor_matches: {
        Row: {
          id: string
          startup_id: string | null
          investor_id: string | null
          match_score: number | null
          status: string | null
          reasoning: string | null
          confidence_level: string | null
          fit_analysis: Json | null
          viewed_at: string | null
          contacted_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          startup_id?: string | null
          investor_id?: string | null
          match_score?: number | null
          status?: string | null
          reasoning?: string | null
          confidence_level?: string | null
          fit_analysis?: Json | null
          viewed_at?: string | null
          contacted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          startup_id?: string | null
          investor_id?: string | null
          match_score?: number | null
          status?: string | null
          reasoning?: string | null
          confidence_level?: string | null
          fit_analysis?: Json | null
          viewed_at?: string | null
          contacted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rss_sources: {
        Row: {
          id: string
          name: string
          url: string
          category: string
          active: boolean | null
          last_scraped: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          url: string
          category?: string
          active?: boolean | null
          last_scraped?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          url?: string
          category?: string
          active?: boolean | null
          last_scraped?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

// Helper types
export type Investor = Database['public']['Tables']['investors']['Row']
export type InvestorInsert = Database['public']['Tables']['investors']['Insert']
export type InvestorUpdate = Database['public']['Tables']['investors']['Update']

export type Startup = Database['public']['Tables']['startup_uploads']['Row']
export type StartupInsert = Database['public']['Tables']['startup_uploads']['Insert']
export type StartupUpdate = Database['public']['Tables']['startup_uploads']['Update']

export type DiscoveredStartup = Database['public']['Tables']['discovered_startups']['Row']
export type Match = Database['public']['Tables']['startup_investor_matches']['Row']
