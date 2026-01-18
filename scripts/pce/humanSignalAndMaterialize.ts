import { supabase } from './_supabase';

type Args = {
  startupId: string;
  signalType: 'advisor_joined' | 'board_member_joined' | 'cofounder_joined' | 'key_hire_joined';
  personName: string;
  profileUrl?: string;
  role?: string;
  credibilityTier?: number; // 1..5
  engagementHint?: 'active' | 'passive' | 'unknown';
  sinceDays?: number; // materialize window
  fingerprint?: string;
};

function parseArgs(): Args {
  // Usage:
  // node scripts/pce/humanSignalAndMaterialize.js <startup_id> <signalType> "<personName>" [profileUrl] [credTier] [engagementHint] [sinceDays]
  const [
    ,
    ,
    startupId,
    signalType,
    personName,
    profileUrl,
    credTierStr,
    engagementHint,
    sinceDaysStr,
  ] = process.argv;

  if (!startupId || !signalType || !personName) {
    console.error(
      'Usage: node scripts/pce/humanSignalAndMaterialize.js <startup_id> <signalType> "<personName>" [profileUrl] [credTier] [engagementHint] [sinceDays]'
    );
    process.exit(1);
  }

  const credTier = credTierStr ? Number(credTierStr) : 3;
  const sinceDays = sinceDaysStr ? Number(sinceDaysStr) : 30;

  if (credTier < 1 || credTier > 5) {
    console.error('credTier must be between 1 and 5');
    process.exit(1);
  }

  return {
    startupId,
    signalType: signalType as any,
    personName,
    profileUrl,
    role: undefined,
    credibilityTier: credTier,
    engagementHint: (engagementHint as any) || 'unknown',
    sinceDays,
  };
}

async function insertHumanSignal(a: Args) {
  const fp =
    a.fingerprint ??
    `human:${a.signalType}:${a.startupId}:${(a.personName || '').toLowerCase().replace(/\s+/g, '_')}`;

  const { error } = await supabase.from('startup_human_signals').insert({
    startup_id: a.startupId,
    signal_type: a.signalType,
    person_name: a.personName,
    person_profile_url: a.profileUrl ?? null,
    role: a.role ?? null,
    credibility_tier: a.credibilityTier ?? 3,
    engagement_hint: a.engagementHint ?? 'unknown',
    evidence: { sources: ['node_automation'] },
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
  // Pass "since" as timestamptz argument (Supabase JS will serialize ISO)
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc('materialize_phase_changes_from_human_signals', {
    since,
  });

  if (error) throw error;
  return data as number;
}

async function main() {
  const args = parseArgs();
  const res = await insertHumanSignal(args);
  const insertedPhaseChanges = await materialize(args.sinceDays ?? 30);

  console.log(
    JSON.stringify(
      {
        ok: true,
        humanSignalInserted: res.inserted,
        fingerprint: res.fingerprint,
        phaseChangesInserted: insertedPhaseChanges,
        sinceDays: args.sinceDays ?? 30,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('PCE human signal automation failed:', e);
  process.exit(1);
});
