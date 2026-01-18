import crypto from 'crypto';
import { supabase } from './_supabase';

type Args = {
  startupId: string;
  marketEventId: string;
  relevance?: number; // 0..1
  sinceDays?: number;
};

function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

function parseArgs(): Args {
  // Usage:
  // node scripts/pce/marketLinkAndMaterialize.js <startup_id> <market_event_id> [relevance] [sinceDays]
  const [, , startupId, marketEventId, relevanceStr, sinceDaysStr] = process.argv;

  if (!startupId || !marketEventId) {
    console.error('Usage: node scripts/pce/marketLinkAndMaterialize.js <startup_id> <market_event_id> [relevance] [sinceDays]');
    process.exit(1);
  }

  const relevance = relevanceStr ? Number(relevanceStr) : 0.70;
  if (relevance < 0 || relevance > 1) {
    console.error('relevance must be 0..1');
    process.exit(1);
  }

  const sinceDays = sinceDaysStr ? Number(sinceDaysStr) : 180;

  return { startupId, marketEventId, relevance, sinceDays };
}

async function insertLink(a: Args) {
  const fp = `market_link:${a.startupId}:${a.marketEventId}:${sha1(String(a.relevance))}`;

  const { error } = await supabase.from('startup_market_event_links').insert({
    startup_id: a.startupId,
    market_event_id: a.marketEventId,
    relevance: a.relevance ?? 0.7,
    link_evidence: { sources: ['node_automation'] },
    fingerprint: fp,
  });

  if (error) {
    const msg = (error as any).message || '';
    const code = (error as any).code || '';
    if (code === '23505' || msg.toLowerCase().includes('duplicate key')) {
      return { inserted: false, fingerprint: fp };
    }
    throw error;
  }
  return { inserted: true, fingerprint: fp };
}

async function materialize(sinceDays: number) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc('materialize_phase_changes_from_market_links', { since });
  if (error) throw error;
  return data as number;
}

async function main() {
  const args = parseArgs();
  const link = await insertLink(args);
  const insertedPhaseChanges = await materialize(args.sinceDays ?? 180);

  console.log(
    JSON.stringify(
      {
        ok: true,
        linkInserted: link.inserted,
        fingerprint: link.fingerprint,
        phaseChangesInserted: insertedPhaseChanges,
        sinceDays: args.sinceDays ?? 180,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('marketLinkAndMaterialize failed:', e);
  process.exit(1);
});
