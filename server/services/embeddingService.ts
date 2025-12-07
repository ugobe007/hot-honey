/**
 * EMBEDDING SERVICE
 * Generates vector embeddings using OpenAI for semantic similarity matching
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY
});

interface StartupData {
  name: string;
  tagline?: string;
  pitch?: string;
  industries?: string[];
  five_points?: string[];
  stage?: number;
}

interface InvestorData {
  firm: string;
  name: string;
  sector_focus?: string[];
  stage_focus?: string[];
  bio?: string;
}

/**
 * Generate embedding for a startup
 * Combines all relevant text into a rich semantic representation
 */
export async function generateStartupEmbedding(startup: StartupData): Promise<number[]> {
  const textParts = [
    startup.name,
    startup.tagline || '',
    startup.pitch || '',
    `Industries: ${(startup.industries || []).join(', ')}`,
    `Stage: ${getStageText(startup.stage)}`,
    ...(startup.five_points || [])
  ].filter(Boolean);
  
  const combinedText = textParts.join('\n');
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: combinedText,
    dimensions: 1536
  });
  
  return response.data[0].embedding;
}

/**
 * Generate embedding for an investor
 * Focuses on investment thesis and focus areas
 */
export async function generateInvestorEmbedding(investor: InvestorData): Promise<number[]> {
  const textParts = [
    `${investor.firm} - ${investor.name}`,
    `Focus: ${(investor.sector_focus || []).join(', ')}`,
    `Stages: ${(investor.stage_focus || []).join(', ')}`,
    investor.bio || ''
  ].filter(Boolean);
  
  const combinedText = textParts.join('\n');
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: combinedText,
    dimensions: 1536
  });
  
  return response.data[0].embedding;
}

/**
 * Batch embedding generation for efficiency
 * Use when processing multiple items at once
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
    dimensions: 1536
  });
  
  return response.data.map(item => item.embedding);
}

/**
 * Convert stage number to readable text
 */
function getStageText(stage?: number): string {
  const stages: Record<number, string> = {
    0: 'Pre-seed',
    1: 'Seed',
    2: 'Series A',
    3: 'Series B',
    4: 'Series C+',
    5: 'Growth'
  };
  return stage !== undefined ? stages[stage] || 'Unknown' : 'Unknown';
}
