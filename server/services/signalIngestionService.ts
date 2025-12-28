/**
 * SIGNAL INGESTION SERVICE
 * =========================
 * Scrapes VC blogs, founder blogs, and communities to extract
 * emerging trends and sentiment signals.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );
  }
  return supabase;
}

const parser = new Parser();

interface SignalSource {
  name: string;
  url?: string;
  rss?: string;
  weight: number;
  focus: string[];
}

interface ExtractedSignal {
  source_type: string;
  source_name: string;
  source_url: string;
  title: string;
  content: string;
  published_at: Date;
  sectors: string[];
  themes: string[];
  sentiment: string;
  signal_strength: number;
}

function loadSourcesConfig(): any {
  const configPath = path.join(process.cwd(), 'config', 'signal-sources.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  return { vcBlogs: [], founderBlogs: [], communities: [], themesToTrack: [] };
}

function extractThemes(text: string, themesToTrack: string[]): string[] {
  const lowerText = text.toLowerCase();
  return themesToTrack.filter(theme => 
    lowerText.includes(theme.toLowerCase())
  );
}

function extractSectors(text: string): string[] {
  const sectorPatterns: Record<string, RegExp> = {
    'ai': /\b(artificial intelligence|machine learning|ai|ml|llm|gpt|deep learning|neural)/i,
    'defense': /\b(defense|military|drone|autonomous weapons|security)/i,
    'climate': /\b(climate|carbon|sustainability|clean energy|renewable|solar|wind)/i,
    'fintech': /\b(fintech|financial|banking|payments|crypto|defi|blockchain)/i,
    'healthtech': /\b(health|medical|biotech|therapeutics|genomics|drug discovery)/i,
    'robotics': /\b(robot|humanoid|automation|manufacturing)/i,
    'saas': /\b(saas|software|cloud|enterprise|b2b)/i,
    'consumer': /\b(consumer|b2c|retail|e-commerce|marketplace)/i,
    'devtools': /\b(developer|devtools|api|sdk|infrastructure|platform)/i,
    'edtech': /\b(education|edtech|learning|training|skills)/i,
    'space': /\b(space|satellite|rocket|aerospace|orbital)/i,
    'quantum': /\b(quantum|qubit|superposition)/i
  };
  
  const sectors: string[] = [];
  for (const [sector, pattern] of Object.entries(sectorPatterns)) {
    if (pattern.test(text)) {
      sectors.push(sector);
    }
  }
  return sectors;
}

function estimateSentiment(text: string): { sentiment: string; strength: number } {
  const lowerText = text.toLowerCase();
  
  const bullishWords = ['exciting', 'opportunity', 'growth', 'boom', 'surge', 'breakthrough', 'revolution', 'transform', 'massive', 'incredible'];
  const bearishWords = ['concern', 'risk', 'decline', 'challenge', 'difficult', 'struggle', 'downturn', 'cautious', 'uncertain', 'bubble'];
  
  const bullishCount = bullishWords.filter(w => lowerText.includes(w)).length;
  const bearishCount = bearishWords.filter(w => lowerText.includes(w)).length;
  
  if (bullishCount > bearishCount + 1) {
    return { sentiment: 'bullish', strength: Math.min(bullishCount / 5, 1) };
  } else if (bearishCount > bullishCount + 1) {
    return { sentiment: 'bearish', strength: Math.min(bearishCount / 5, 1) };
  }
  return { sentiment: 'neutral', strength: 0.5 };
}

async function scrapeRSSFeed(source: SignalSource, sourceType: string, themesToTrack: string[]): Promise<ExtractedSignal[]> {
  if (!source.rss) return [];
  
  try {
    const feed = await parser.parseURL(source.rss);
    const signals: ExtractedSignal[] = [];
    
    for (const item of feed.items.slice(0, 10)) {
      const text = (item.title || '') + ' ' + (item.contentSnippet || item.content || '');
      const themes = extractThemes(text, themesToTrack);
      const sectors = extractSectors(text);
      const { sentiment, strength } = estimateSentiment(text);
      
      if (themes.length > 0 || sectors.length > 0) {
        signals.push({
          source_type: sourceType,
          source_name: source.name,
          source_url: item.link || source.url || '',
          title: item.title || '',
          content: item.contentSnippet || item.content || '',
          published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
          sectors,
          themes,
          sentiment,
          signal_strength: strength * source.weight
        });
      }
    }
    
    return signals;
  } catch (error) {
    console.error('Error scraping ' + source.name + ':', error);
    return [];
  }
}

async function saveSignals(signals: ExtractedSignal[]): Promise<number> {
  if (signals.length === 0) return 0;
  
  const db = getSupabase();
  const { error } = await db
    .from('signals')
    .upsert(
      signals.map(s => ({
        ...s,
        sectors: JSON.stringify(s.sectors),
        themes: JSON.stringify(s.themes)
      })),
      { onConflict: 'source_url' }
    );
  
  if (error) {
    console.error('Error saving signals:', error);
    return 0;
  }
  
  return signals.length;
}

export async function ingestSignals(): Promise<{ total: number; bySource: Record<string, number> }> {
  const config = loadSourcesConfig();
  const bySource: Record<string, number> = {};
  let total = 0;
  
  console.log('Starting signal ingestion...');
  
  for (const source of config.vcBlogs || []) {
    const signals = await scrapeRSSFeed(source, 'vc_blog', config.themesToTrack);
    const saved = await saveSignals(signals);
    bySource[source.name] = saved;
    total += saved;
    console.log('  ' + source.name + ': ' + saved + ' signals');
  }
  
  for (const source of config.founderBlogs || []) {
    const signals = await scrapeRSSFeed(source, "founder_blog", config.themesToTrack);
    const saved = await saveSignals(signals);
    bySource[source.name] = saved;
    total += saved;
    console.log("  " + source.name + ": " + saved + " signals");
  }

  for (const source of config.newsFeeds || []) {
    const signals = await scrapeRSSFeed(source, 'founder_blog', config.themesToTrack);
    const saved = await saveSignals(signals);
    bySource[source.name] = saved;
    total += saved;
    console.log('  ' + source.name + ': ' + saved + ' signals');
  }
  
  console.log('Total signals ingested: ' + total);
  return { total, bySource };
}

export async function aggregateSignalTrends(days: number = 7): Promise<void> {
  const db = getSupabase();
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - days * 24 * 60 * 60 * 1000);
  
  const { data: signals } = await db
    .from('signals')
    .select('sectors, themes, sentiment, signal_strength')
    .gte('published_at', periodStart.toISOString())
    .lte('published_at', periodEnd.toISOString());
  
  if (!signals || signals.length === 0) {
    console.log('No signals found for aggregation');
    return;
  }
  
  const sectorCounts: Record<string, { count: number; sentiment: number[] }> = {};
  const themeCounts: Record<string, { count: number; sentiment: number[] }> = {};
  
  for (const signal of signals) {
    const sectors = typeof signal.sectors === 'string' ? JSON.parse(signal.sectors) : signal.sectors;
    const themes = typeof signal.themes === 'string' ? JSON.parse(signal.themes) : signal.themes;
    const sentimentValue = signal.sentiment === 'bullish' ? 1 : signal.sentiment === 'bearish' ? -1 : 0;
    
    for (const sector of sectors || []) {
      if (!sectorCounts[sector]) sectorCounts[sector] = { count: 0, sentiment: [] };
      sectorCounts[sector].count++;
      sectorCounts[sector].sentiment.push(sentimentValue);
    }
    
    for (const theme of themes || []) {
      if (!themeCounts[theme]) themeCounts[theme] = { count: 0, sentiment: [] };
      themeCounts[theme].count++;
      themeCounts[theme].sentiment.push(sentimentValue);
    }
  }
  
  const trends = [
    ...Object.entries(sectorCounts).map(([sector, data]) => ({
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      sector,
      theme: null,
      mention_count: data.count,
      avg_sentiment: data.sentiment.reduce((a, b) => a + b, 0) / data.sentiment.length
    })),
    ...Object.entries(themeCounts).map(([theme, data]) => ({
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      sector: null,
      theme,
      mention_count: data.count,
      avg_sentiment: data.sentiment.reduce((a, b) => a + b, 0) / data.sentiment.length
    }))
  ];
  
  if (trends.length > 0) {
    await db.from('signal_trends').upsert(trends);
    console.log('Aggregated ' + trends.length + ' trends');
  }
}

export default { ingestSignals, aggregateSignalTrends };

// Add newsFeeds to ingestion (append to ingestSignals)
