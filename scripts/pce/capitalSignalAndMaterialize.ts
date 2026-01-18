import { supabase } from './_supabase';

type SignalType =
  | 'round_announced'
  | 'round_closed'
  | 'lead_investor_added'
  | 'strategic_investor_added'
  | 'filing_detected';

type RoundType = 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'bridge' | 'safe' | 'unknown';

type Args = {
  startupId: string;
  signalType: SignalType;
  roundType?: RoundType;
  amountUsd?: number;
  valuationUsd?: number;
  leadInvestorName?: string;
  leadInvestorDomain?: string;
  investorTier?: number; // 1..5
  isConviction?: boolean;
  sourceUrl?: string;
  sinceDays?: number;
  fingerprint?: string;
};

function parseArgs(): Args {
  // Usage:
  // node scripts/pce/capitalSignalAndMaterialize.js <startup_id> <signalType> [roundType] [amountUsd] [leadInvestorName] [investorTier] [isConviction] [sourceUrl] [sinceDays]
  const [
    ,
    ,
    startupId,
    signalType,
    roundType,
    amountUsdStr,
    leadInvestorName,
    investorTierStr,
    isConvictionStr,
    sourceUrl,
    sinceDaysStr,
  ] = process.argv;

  if (!startupId || !signalType) {
    console.error(
      'Usage: node scripts/pce/capitalSignalAndMaterialize.js <startup_id> <signalType> [roundType] [amountUsd] [leadInvestorName] [investorTier] [isConviction] [sourceUrl] [sinceDays]'
    );
    process.exit(1);
  }

  const investorTier = investorTierStr ? Number(investorTierStr) : 2;
  if (investorTier < 1 || investorTier > 5) {
    console.error('investorTier must be between 1 and 5');
    process.exit(1);
  }

  const amountUsd = amountUsdStr ? Number(amountUsdStr) : undefined;
  const isConviction =
    isConvictionStr != null ? ['true', '1', 'yes', 'y'].includes(isConvictionStr.toLowerCase()) : false;

  const sinceDays = sinceDaysStr ? Number(sinceDaysStr) : 60;

  return {
    startupId,
    signalType: signalType as SignalType,
    roundType: (roundType as RoundType) || 'unknown',
    amountUsd,
    leadInvestorName,
    investorTier,
    isConviction,
    sourceUrl,
    sinceDays,
  };
}

async function insertCapitalSignal(a: Args) {
  const fp =
    a.fingerprint ??
    `cap:${a.signalType}:${a.startupId}:${(a.roundType || 'unknown')}:${(a.leadInvestorName || '')
      .toLowerCase()
      .replace(/\s+/g, '_')}:${a.amountUsd ?? ''}`;

  const { error } = await supabase.from('startup_capital_signals').insert({
    startup_id: a.startupId,
    signal_type: a.signalType,
    round_type: a.roundType ?? 'unknown',
    amount_usd: a.amountUsd ?? null,
    valuation_usd: a.valuationUsd ?? null,
    lead_investor_name: a.leadInvestorName ?? null,
    lead_investor_domain: a.leadInvestorDomain ?? null,
    investor_tier: a.investorTier ?? 2,
    is_conviction: a.isConviction ?? false,
    source_url: a.sourceUrl ?? null,
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
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc('materialize_phase_changes_from_capital_signals', {
    since,
  });
  if (error) throw error;
  return data as number;
}

async function main() {
  const args = parseArgs();
  const res = await insertCapitalSignal(args);
  const insertedPhaseChanges = await materialize(args.sinceDays ?? 60);

  console.log(
    JSON.stringify(
      {
        ok: true,
        capitalSignalInserted: res.inserted,
        fingerprint: res.fingerprint,
        phaseChangesInserted: insertedPhaseChanges,
        sinceDays: args.sinceDays ?? 60,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('PCE capital signal automation failed:', e);
  process.exit(1);
});
