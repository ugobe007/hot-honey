import crypto from 'crypto';
import { supabase } from './_supabase';

type EventType =
  | 'regulatory_change'
  | 'platform_unlock'
  | 'cost_curve_shift'
  | 'standards_adoption'
  | 'infrastructure_unlock'
  | 'cultural_threshold';

type Args = {
  eventType: EventType;
  title: string;
  geoScope?: string;
  sectorTags?: string[];
  keywordTags?: string[];
  unlockStrength?: number; // 0..1
  inevitability?: number;  // 0..1
  confidence?: number;     // 0..1
  sourceUrl?: string;
};

function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

function parseArgs(): Args {
  // Usage:
  // node scripts/pce/marketEventUpsert.js <eventType> "<title>" [geoScope] [sourceUrl]
  const [, , eventType, title, geoScope, sourceUrl] = process.argv;

  if (!eventType || !title) {
    console.error('Usage: node scripts/pce/marketEventUpsert.js <eventType> "<title>" [geoScope] [sourceUrl]');
    process.exit(1);
  }

  return {
    eventType: eventType as EventType,
    title,
    geoScope: geoScope || 'global',
    sectorTags: [],
    keywordTags: [],
    unlockStrength: 0.65,
    inevitability: 0.55,
    confidence: 0.75,
    sourceUrl,
  };
}

async function main() {
  const a = parseArgs();
  const fp = `market_event:${a.eventType}:${sha1((a.title || '').toLowerCase() + '|' + (a.sourceUrl || ''))}`;

  const { data, error } = await supabase
    .from('market_events')
    .insert({
      event_type: a.eventType,
      title: a.title,
      geo_scope: a.geoScope ?? 'global',
      sector_tags: a.sectorTags ?? [],
      keyword_tags: a.keywordTags ?? [],
      unlock_strength: a.unlockStrength ?? 0.65,
      inevitability: a.inevitability ?? 0.55,
      confidence: a.confidence ?? 0.75,
      source_url: a.sourceUrl ?? null,
      evidence: { sources: ['node_automation'] },
      fingerprint: fp,
    })
    .select('id')
    .single();

  if (error) {
    const msg = (error as any).message || '';
    const code = (error as any).code || '';
    if (code === '23505' || msg.toLowerCase().includes('duplicate key')) {
      // Fetch existing id
      const { data: existing, error: e2 } = await supabase
        .from('market_events')
        .select('id')
        .eq('fingerprint', fp)
        .limit(1)
        .maybeSingle();
      if (e2) throw e2;

      console.log(JSON.stringify({ ok: true, existed: true, marketEventId: existing?.id, fingerprint: fp }, null, 2));
      return;
    }
    throw error;
  }

  console.log(JSON.stringify({ ok: true, existed: false, marketEventId: data.id, fingerprint: fp }, null, 2));
}

main().catch((e) => {
  console.error('marketEventUpsert failed:', e);
  process.exit(1);
});
