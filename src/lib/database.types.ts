export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      startup_uploads: {
        Row: {
          created_at: string | null
          embedding: string | null
          growth_rate_monthly: number | null
          has_demo: boolean | null
          has_technical_cofounder: boolean | null
          id: string
          industries: string[] | null
          is_launched: boolean | null
          linkedin: string | null
          location: string | null
          market_score: number | null
          market_size: string | null
          mrr: number | null
          name: string
          pitch: string | null
          problem: string | null
          product_score: number | null
          raise_amount: string | null
          raise_type: string | null
          revenue_annual: number | null
          sectors: string[] | null
          solution: string | null
          source_type: string
          stage: string | null
          status: string | null
          submitted_email: string | null
          tagline: string | null
          team_companies: string[] | null
          team_score: number | null
          team_size: number | null
          total_god_score: number | null
          traction_score: number | null
          updated_at: string | null
          value_proposition: string | null
          vision_score: number | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          growth_rate_monthly?: number | null
          has_demo?: boolean | null
          has_technical_cofounder?: boolean | null
          id?: string
          industries?: string[] | null
          is_launched?: boolean | null
          linkedin?: string | null
          location?: string | null
          market_score?: number | null
          market_size?: string | null
          mrr?: number | null
          name: string
          pitch?: string | null
          problem?: string | null
          product_score?: number | null
          raise_amount?: string | null
          raise_type?: string | null
          revenue_annual?: number | null
          sectors?: string[] | null
          solution?: string | null
          source_type?: string
          stage?: string | null
          status?: string | null
          submitted_email?: string | null
          tagline?: string | null
          team_companies?: string[] | null
          team_score?: number | null
          team_size?: number | null
          total_god_score?: number | null
          traction_score?: number | null
          updated_at?: string | null
          value_proposition?: string | null
          vision_score?: number | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          growth_rate_monthly?: number | null
          has_demo?: boolean | null
          has_technical_cofounder?: boolean | null
          id?: string
          industries?: string[] | null
          is_launched?: boolean | null
          linkedin?: string | null
          location?: string | null
          market_score?: number | null
          market_size?: string | null
          mrr?: number | null
          name?: string
          pitch?: string | null
          problem?: string | null
          product_score?: number | null
          raise_amount?: string | null
          raise_type?: string | null
          revenue_annual?: number | null
          sectors?: string[] | null
          solution?: string | null
          source_type?: string
          stage?: string | null
          status?: string | null
          submitted_email?: string | null
          tagline?: string | null
          team_companies?: string[] | null
          team_score?: number | null
          team_size?: number | null
          total_god_score?: number | null
          traction_score?: number | null
          updated_at?: string | null
          value_proposition?: string | null
          vision_score?: number | null
          website?: string | null
        }
        Relationships: []
      }
      discovered_startups: {
        Row: {
          article_url: string | null
          created_at: string | null
          description: string | null
          discovered_at: string | null
          funding_amount: string | null
          funding_stage: string | null
          god_score: number | null
          god_score_breakdown: Json | null
          god_score_reasoning: string[] | null
          id: string
          imported_at: string | null
          imported_to_startups: boolean | null
          investors_mentioned: string[] | null
          market_size: string | null
          name: string
          problem: string | null
          sectors: string[] | null
          solution: string | null
          startup_id: string | null
          team_companies: string[] | null
          value_proposition: string | null
          website: string | null
        }
        Insert: {
          article_url?: string | null
          created_at?: string | null
          description?: string | null
          discovered_at?: string | null
          funding_amount?: string | null
          funding_stage?: string | null
          god_score?: number | null
          god_score_breakdown?: Json | null
          god_score_reasoning?: string[] | null
          id?: string
          imported_at?: string | null
          imported_to_startups?: boolean | null
          investors_mentioned?: string[] | null
          market_size?: string | null
          name: string
          problem?: string | null
          sectors?: string[] | null
          solution?: string | null
          startup_id?: string | null
          team_companies?: string[] | null
          value_proposition?: string | null
          website?: string | null
        }
        Update: {
          article_url?: string | null
          created_at?: string | null
          description?: string | null
          discovered_at?: string | null
          funding_amount?: string | null
          funding_stage?: string | null
          god_score?: number | null
          god_score_breakdown?: Json | null
          god_score_reasoning?: string[] | null
          id?: string
          imported_at?: string | null
          imported_to_startups?: boolean | null
          investors_mentioned?: string[] | null
          market_size?: string | null
          name?: string
          problem?: string | null
          sectors?: string[] | null
          solution?: string | null
          startup_id?: string | null
          team_companies?: string[] | null
          value_proposition?: string | null
          website?: string | null
        }
        Relationships: []
      }
      investors: {
        Row: {
          aum: string | null
          bio: string | null
          board_seats: number | null
          check_size_max: number | null
          check_size_min: number | null
          created_at: string | null
          email: string | null
          embedding: string | null
          exits: number | null
          firm: string | null
          fund_size: string | null
          geography: string | null
          id: string
          investment_pace: number | null
          last_enrichment_date: string | null
          last_investment_date: string | null
          leads_rounds: boolean | null
          linkedin: string | null
          location: string | null
          name: string
          notable_investments: string[] | null
          partners: Json | null
          portfolio_size: number | null
          sector_focus: string[] | null
          stage_focus: string[] | null
          status: string | null
          tagline: string | null
          twitter: string | null
          type: string | null
          unicorns: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          aum?: string | null
          bio?: string | null
          board_seats?: number | null
          check_size_max?: number | null
          check_size_min?: number | null
          created_at?: string | null
          email?: string | null
          embedding?: string | null
          exits?: number | null
          firm?: string | null
          fund_size?: string | null
          geography?: string | null
          id?: string
          investment_pace?: number | null
          last_enrichment_date?: string | null
          last_investment_date?: string | null
          leads_rounds?: boolean | null
          linkedin?: string | null
          location?: string | null
          name: string
          notable_investments?: string[] | null
          partners?: Json | null
          portfolio_size?: number | null
          sector_focus?: string[] | null
          stage_focus?: string[] | null
          status?: string | null
          tagline?: string | null
          twitter?: string | null
          type?: string | null
          unicorns?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          aum?: string | null
          bio?: string | null
          board_seats?: number | null
          check_size_max?: number | null
          check_size_min?: number | null
          created_at?: string | null
          email?: string | null
          embedding?: string | null
          exits?: number | null
          firm?: string | null
          fund_size?: string | null
          geography?: string | null
          id?: string
          investment_pace?: number | null
          last_enrichment_date?: string | null
          last_investment_date?: string | null
          leads_rounds?: boolean | null
          linkedin?: string | null
          location?: string | null
          name?: string
          notable_investments?: string[] | null
          partners?: Json | null
          portfolio_size?: number | null
          sector_focus?: string[] | null
          stage_focus?: string[] | null
          status?: string | null
          tagline?: string | null
          twitter?: string | null
          type?: string | null
          unicorns?: number | null
          updated_at?: string | null
          website?: string | null
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
