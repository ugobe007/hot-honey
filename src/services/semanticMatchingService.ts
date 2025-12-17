/**
 * SEMANTIC MATCHING SERVICE
 * =========================
 * Uses vector embeddings for intelligent startup-investor matching
 * 
 * Features:
 * - Semantic similarity using OpenAI embeddings
 * - Combined scoring: GOD Algorithm + Embedding Similarity
 * - Find similar startups/investors
 */

import { supabase } from '../lib/supabase';

// ============================================
// TYPES
// ============================================

export interface SemanticMatch {
  investorId: string;
  investorName: string;
  investorType: string;
  sectorFocus: string[];
  stageFocus: string[];
  similarityScore: number;  // 0-1 from embedding cosine similarity
  combinedScore: number;    // Weighted: 60% GOD + 40% embedding
}

export interface SimilarStartup {
  id: string;
  name: string;
  tagline: string;
  sectors: string[];
  stage: string;
  godScore: number;
  similarity: number;
}

export interface SimilarInvestor {
  id: string;
  name: string;
  firm: string;
  type: string;
  sectorFocus: string[];
  stageFocus: string[];
  similarity: number;
}

// ============================================
// SEMANTIC MATCHING FUNCTIONS
// ============================================

/**
 * Find best investor matches for a startup using embedding similarity
 * Combines GOD score (60%) with embedding similarity (40%)
 */
export async function findSemanticInvestorMatches(
  startupId: string,
  limit: number = 10
): Promise<SemanticMatch[]> {
  try {
    const { data, error } = await supabase.rpc('find_investor_matches_by_embedding', {
      startup_uuid: startupId,
      match_count: limit
    });

    if (error) {
      console.error('Semantic matching error:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      investorId: row.investor_id,
      investorName: row.investor_name,
      investorType: row.investor_type,
      sectorFocus: row.sector_focus || [],
      stageFocus: row.stage_focus || [],
      similarityScore: row.similarity_score,
      combinedScore: row.combined_score
    }));
  } catch (error) {
    console.error('findSemanticInvestorMatches error:', error);
    return [];
  }
}

/**
 * Find startups similar to a given startup
 */
export async function findSimilarStartups(
  startupId: string,
  limit: number = 10
): Promise<SimilarStartup[]> {
  try {
    // First get the startup's embedding
    const { data: startup, error: startupError } = await supabase
      .from('startup_uploads')
      .select('embedding')
      .eq('id', startupId)
      .single();

    if (startupError || !startup?.embedding) {
      console.error('Startup not found or has no embedding');
      return [];
    }

    const { data, error } = await supabase.rpc('find_similar_startups', {
      query_embedding: startup.embedding,
      match_threshold: 0.5,
      match_count: limit + 1 // +1 to exclude self
    });

    if (error) {
      console.error('Similar startups error:', error);
      return [];
    }

    return (data || [])
      .filter((row: any) => row.id !== startupId) // Exclude self
      .slice(0, limit)
      .map((row: any) => ({
        id: row.id,
        name: row.name,
        tagline: row.tagline || '',
        sectors: row.sectors || [],
        stage: row.stage || 'Seed',
        godScore: row.total_god_score || 50,
        similarity: row.similarity
      }));
  } catch (error) {
    console.error('findSimilarStartups error:', error);
    return [];
  }
}

/**
 * Find investors similar to a given investor
 */
export async function findSimilarInvestors(
  investorId: string,
  limit: number = 10
): Promise<SimilarInvestor[]> {
  try {
    // First get the investor's embedding
    const { data: investor, error: investorError } = await supabase
      .from('investors')
      .select('embedding')
      .eq('id', investorId)
      .single();

    if (investorError || !investor?.embedding) {
      console.error('Investor not found or has no embedding');
      return [];
    }

    const { data, error } = await supabase.rpc('find_similar_investors', {
      query_embedding: investor.embedding,
      match_threshold: 0.5,
      match_count: limit + 1
    });

    if (error) {
      console.error('Similar investors error:', error);
      return [];
    }

    return (data || [])
      .filter((row: any) => row.id !== investorId)
      .slice(0, limit)
      .map((row: any) => ({
        id: row.id,
        name: row.name,
        firm: row.firm || '',
        type: row.type || 'VC',
        sectorFocus: row.sector_focus || [],
        stageFocus: row.stage_focus || [],
        similarity: row.similarity
      }));
  } catch (error) {
    console.error('findSimilarInvestors error:', error);
    return [];
  }
}

/**
 * Check if a startup has an embedding
 */
export async function hasEmbedding(startupId: string): Promise<boolean> {
  const { data } = await supabase
    .from('startup_uploads')
    .select('embedding')
    .eq('id', startupId)
    .single();
  
  return data?.embedding !== null;
}

/**
 * Get embedding stats for monitoring
 */
export async function getEmbeddingStats(): Promise<{
  startupsWithEmbeddings: number;
  investorsWithEmbeddings: number;
  totalStartups: number;
  totalInvestors: number;
}> {
  const [startupStats, investorStats] = await Promise.all([
    supabase
      .from('startup_uploads')
      .select('id, embedding', { count: 'exact' })
      .eq('status', 'approved'),
    supabase
      .from('investors')
      .select('id, embedding', { count: 'exact' })
      .eq('status', 'active')
  ]);

  const startupsWithEmbeddings = (startupStats.data || []).filter(s => s.embedding).length;
  const investorsWithEmbeddings = (investorStats.data || []).filter(i => i.embedding).length;

  return {
    startupsWithEmbeddings,
    investorsWithEmbeddings,
    totalStartups: startupStats.count || 0,
    totalInvestors: investorStats.count || 0
  };
}
