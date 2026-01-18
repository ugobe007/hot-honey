import { supabase } from './_supabase';

type SignalType =
  | 'logo_added'
  | 'case_study_published'
  | 'integration_partner_added'
  | 'testimonial_added'
  | 'customer_quote_added';

type Args = {
  startupId: string;
  signalType: SignalType;
  customerName?: string;
  customerDomain?: string;
  customerTier?: number; // 1..5
  pageUrl?: string;
  sinceDays?: number; // materialize window
  fingerprint?: string;
};

function parseArgs(): Args {
  // Usage:
  // node scripts/pce/customerProofAndMaterialize.js <startup_id> <signalType> "<customerName>" [customerDomain] [tier] [pageUrl] [sinceDays]
  const [, , startupId, signalType, customerName, customerDomain, tierStr, pageUrl, sinceDaysStr] =
    process.argv;

  if (!startupId || !signalType) {
    console.error(
      'Usage: node scripts/pce/customerProofAndMaterialize.js <startup_id> <signalType> "<customerName>" [customerDomain] [tier] [pageUrl] [sinceDays]'
    );
    process.exit(1);
  }

  const tier = tierStr ? Number(tierStr) : 2;
  const sinceDays = sinceDaysStr ? Number(sinceDaysStr) : 30;

  if (tier < 1 || tier > 5) {
    console.error('tier must be between 1 and 5');
    process.exit(1);
  }

  return {
    startupId,
    signalType: signalType as SignalType,
    customerName,
    customerDomain,
    customerTier: tier,
    pageUrl,
    sinceDays,
  };
}

async function insertCustomerProof(a: Args) {
  const fp =
    a.fingerprint ??
    `cust:${a.signalType}:${a.startupId}:${(a.customerName || '')
      .toLowerCase()
      .replace(/\s+/g, '_')}:${(a.customerDomain || '').toLowerCase()}`;

  const { error } = await supabase.from('startup_customer_proof_signals').insert({
    startup_id: a.startupId,
    signal_type: a.signalType,
    customer_name: a.customerName ?? null,
    customer_domain: a.customerDomain ?? null,
    customer_tier: a.customerTier ?? 2,
    page_url: a.pageUrl ?? null,
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
  const { data, error } = await supabase.rpc('materialize_phase_changes_from_customer_proof', {
    since,
  });
  if (error) throw error;
  return data as number;
}

async function main() {
  const args = parseArgs();
  const res = await insertCustomerProof(args);
  const insertedPhaseChanges = await materialize(args.sinceDays ?? 30);

  console.log(
    JSON.stringify(
      {
        ok: true,
        customerProofInserted: res.inserted,
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
  console.error('PCE customer proof automation failed:', e);
  process.exit(1);
});
