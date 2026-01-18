import crypto from 'crypto';
import { supabase } from './_supabase';

type Args = {
  startupId: string;
  url: string;
  text: string;
  minChange?: number;
};

function normalizeText(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .trim()
    .toLowerCase();
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function parseArgs(): Args {
  // Usage:
  // node scripts/pce/websiteSnapshotAndDetect.js <startup_id> <url> "<text>" [minChange]
  const [, , startupId, url, text, minChangeStr] = process.argv;

  if (!startupId || !url || !text) {
    console.error(
      'Usage: node scripts/pce/websiteSnapshotAndDetect.js <startup_id> <url> "<text>" [minChange]'
    );
    process.exit(1);
  }

  return {
    startupId,
    url,
    text,
    minChange: minChangeStr ? Number(minChangeStr) : 0.35,
  };
}

async function upsertWebsiteSnapshot(startupId: string, url: string, rawText: string) {
  const normalized = normalizeText(rawText);
  const contentHash = sha256(normalized);

  // Insert; rely on unique index (startup_id, content_hash) to dedupe
  const { error } = await supabase.from('startup_website_snapshots').insert({
    startup_id: startupId,
    url,
    text_content: normalized,
    content_hash: contentHash,
    extracted: {}, // optional structured extraction later
  });

  // If it failed due to unique violation, that's fine; Supabase returns error details.
  // We'll treat duplicates as "no-op".
  if (error) {
    const msg = (error as any).message || '';
    const code = (error as any).code || '';

    // Postgres unique violation is 23505; Supabase sometimes gives message-only.
    if (code === '23505' || msg.toLowerCase().includes('duplicate key')) {
      return { inserted: false, contentHash };
    }
    throw error;
  }

  return { inserted: true, contentHash };
}

async function runDiffDetector(minChange: number) {
  const { data, error } = await supabase.rpc('detect_phase_changes_from_website_diffs', {
    min_change: minChange,
  });

  if (error) throw error;
  // function returns int
  return data as number;
}

async function main() {
  const args = parseArgs();
  const { inserted, contentHash } = await upsertWebsiteSnapshot(args.startupId, args.url, args.text);
  const insertedPhaseChanges = await runDiffDetector(args.minChange ?? 0.35);

  console.log(
    JSON.stringify(
      {
        ok: true,
        snapshotInserted: inserted,
        contentHash,
        phaseChangesInserted: insertedPhaseChanges,
        minChange: args.minChange ?? 0.35,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('PCE website snapshot automation failed:', e);
  process.exit(1);
});
