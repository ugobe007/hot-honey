import { supabase } from './supabase';

export interface InvestorDB {
  id: string;
  name: string;
  type: 'vc_firm' | 'accelerator' | 'angel_network' | 'corporate_vc';
  tagline?: string;
  description?: string;
  website?: string;
  logo?: string;
  linkedin?: string;
  twitter?: string;
  contact_email?: string;
  aum?: string;
  fund_size?: string;
  check_size?: string;
  stage?: string[];
  sectors?: string[];
  geography?: string;
  portfolio_count?: number;
  exits?: number;
  unicorns?: number;
  notable_investments?: string[];
  hot_honey_investments?: number;
  hot_honey_startups?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface StartupUploadDB {
  id: string;
  name: string;
  pitch?: string;
  description?: string;
  tagline?: string;
  website?: string;
  linkedin?: string;
  raise_amount?: string;
  raise_type?: string;
  stage?: number;
  source_type: 'url' | 'deck' | 'manual';
  source_url?: string;
  deck_filename?: string;
  extracted_data?: any;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'published';
  admin_notes?: string;
  submitted_by?: string;
  submitted_email?: string;
  created_at?: string;
  updated_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

// Investor functions
export async function getAllInvestors() {
  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching investors:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function getInvestorById(id: string) {
  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching investor:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function searchInvestors(query: string, type?: string) {
  let queryBuilder = supabase
    .from('investors')
    .select('*');

  if (query) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,tagline.ilike.%${query}%`);
  }

  if (type && type !== 'all') {
    queryBuilder = queryBuilder.eq('type', type);
  }

  queryBuilder = queryBuilder.order('hot_honey_investments', { ascending: false });

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error searching investors:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function createInvestor(investor: Omit<InvestorDB, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('investors')
    .insert([investor])
    .select()
    .single();

  if (error) {
    console.error('Error creating investor:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// Startup upload functions
export async function submitStartup(startup: Omit<StartupUploadDB, 'id' | 'created_at' | 'updated_at' | 'status'>) {
  const { data, error } = await supabase
    .from('startup_uploads')
    .insert([{ ...startup, status: 'pending' }])
    .select()
    .single();

  if (error) {
    console.error('Error submitting startup:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function getStartupUploads(status?: string) {
  let query = supabase
    .from('startup_uploads')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching startup uploads:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function updateStartupStatus(
  id: string,
  status: StartupUploadDB['status'],
  adminNotes?: string
) {
  const { data, error } = await supabase
    .from('startup_uploads')
    .update({
      status,
      admin_notes: adminNotes,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating startup status:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// Find duplicate investors by name
export async function findDuplicateInvestors() {
  const { data, error } = await supabase
    .from('investors')
    .select('id, name, created_at')
    .order('name')
    .order('created_at');

  if (error) {
    console.error('Error fetching investors:', error);
    return { data: null, error };
  }

  // Group by name to find duplicates
  const nameMap = new Map<string, any[]>();
  data?.forEach((investor: any) => {
    const existing = nameMap.get(investor.name) || [];
    nameMap.set(investor.name, [...existing, investor]);
  });

  // Filter to only duplicates (count > 1)
  const duplicates = Array.from(nameMap.entries())
    .filter(([_, investors]) => investors.length > 1)
    .map(([name, investors]) => ({
      name,
      count: investors.length,
      investors: investors.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }));

  return { data: duplicates, error: null };
}

// Remove duplicate investors, keeping only the oldest entry for each name
export async function removeDuplicateInvestors() {
  const { data: duplicates, error: findError } = await findDuplicateInvestors();
  
  if (findError || !duplicates) {
    return { data: null, error: findError };
  }

  const idsToDelete: string[] = [];
  const keptInvestors: any[] = [];

  duplicates.forEach((duplicate: any) => {
    // Keep the first (oldest) entry, delete the rest
    const [keep, ...remove] = duplicate.investors;
    keptInvestors.push({ name: duplicate.name, id: keep.id, created_at: keep.created_at });
    idsToDelete.push(...remove.map((inv: any) => inv.id));
  });

  if (idsToDelete.length === 0) {
    return { 
      data: { 
        message: 'No duplicates found', 
        removed: 0, 
        kept: [] 
      }, 
      error: null 
    };
  }

  // Delete duplicates
  const { error: deleteError } = await supabase
    .from('investors')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('Error deleting duplicates:', deleteError);
    return { data: null, error: deleteError };
  }

  return { 
    data: { 
      message: `Removed ${idsToDelete.length} duplicate entries`,
      removed: idsToDelete.length,
      kept: keptInvestors
    }, 
    error: null 
  };
}

// Seed initial investor data
export async function seedInitialInvestors() {
  const investors = [
    {
      name: 'Y Combinator',
      type: 'accelerator' as const,
      tagline: "The world's most powerful startup accelerator",
      description: 'Y Combinator provides seed funding, advice, and connections to thousands of startups. Two batches per year of 3-month programs.',
      website: 'https://www.ycombinator.com',
      linkedin: 'https://www.linkedin.com/company/y-combinator/',
      check_size: '$500,000',
      stage: ['pre_seed', 'seed'],
      sectors: ['Software', 'AI/ML', 'Healthcare', 'Fintech', 'Consumer', 'B2B', 'Marketplace'],
      geography: 'Global',
      portfolio_count: 4000,
      exits: 400,
      unicorns: 20,
      notable_investments: ['Airbnb', 'Stripe', 'Coinbase', 'DoorDash', 'Instacart', 'Dropbox', 'Reddit', 'Twitch'],
      hot_honey_investments: 0,
      hot_honey_startups: [],
    },
    {
      name: 'Andreessen Horowitz',
      type: 'vc_firm' as const,
      tagline: 'Software is eating the world',
      description: 'a16z backs bold entrepreneurs building the future through technology. We are stage agnostic: We invest in seed to late-stage companies across bio + healthcare, consumer, crypto, enterprise, fintech, games, and companies building toward American dynamism.',
      website: 'https://a16z.com',
      linkedin: 'https://www.linkedin.com/company/andreessen-horowitz/',
      aum: '$35B',
      check_size: '$1M - $50M',
      stage: ['seed', 'series_a', 'series_b', 'series_c', 'growth'],
      sectors: ['Software', 'AI/ML', 'Crypto/Web3', 'Fintech', 'Bio/Healthcare', 'Consumer', 'Enterprise', 'Gaming'],
      geography: 'Global',
      portfolio_count: 800,
      exits: 150,
      unicorns: 40,
      notable_investments: ['Facebook', 'Airbnb', 'Slack', 'Coinbase', 'GitHub', 'Instagram', 'Oculus', 'Lyft'],
      hot_honey_investments: 0,
      hot_honey_startups: [],
    },
    {
      name: 'Sequoia Capital',
      type: 'vc_firm' as const,
      tagline: 'Helping the daring build legendary companies',
      description: 'Sequoia Capital helps the daring build legendary companies from idea to IPO and beyond. We invest across stages and geographies in technology, healthcare, and other innovation-driven sectors.',
      website: 'https://www.sequoiacap.com',
      linkedin: 'https://www.linkedin.com/company/sequoia-capital/',
      aum: '$85B',
      check_size: '$500K - $100M',
      stage: ['seed', 'series_a', 'series_b', 'series_c', 'growth', 'late_stage'],
      sectors: ['Software', 'AI/ML', 'Enterprise', 'Consumer', 'Fintech', 'Healthcare', 'Crypto', 'Marketplace'],
      geography: 'Global',
      portfolio_count: 1000,
      exits: 300,
      unicorns: 100,
      notable_investments: ['Apple', 'Google', 'YouTube', 'Instagram', 'WhatsApp', 'Airbnb', 'DoorDash', 'Stripe', 'Zoom'],
      hot_honey_investments: 0,
      hot_honey_startups: [],
    },
    {
      name: 'Techstars',
      type: 'accelerator' as const,
      tagline: 'Do more faster',
      description: 'Techstars is the worldwide network that helps entrepreneurs succeed. We connect entrepreneurs, investors, corporates, and cities to help build thriving startup communities.',
      website: 'https://www.techstars.com',
      linkedin: 'https://www.linkedin.com/company/techstars/',
      check_size: '$120,000',
      stage: ['pre_seed', 'seed'],
      sectors: ['Software', 'AI/ML', 'Fintech', 'Healthcare', 'IoT', 'B2B', 'Consumer', 'Impact'],
      geography: 'Global',
      portfolio_count: 3000,
      exits: 250,
      unicorns: 10,
      notable_investments: ['SendGrid', 'ClassPass', 'PillPack', 'DigitalOcean', 'Sphero', 'DataRobot'],
      hot_honey_investments: 0,
      hot_honey_startups: [],
    },
    {
      name: 'Founders Fund',
      type: 'vc_firm' as const,
      tagline: 'We wanted flying cars, instead we got 140 characters',
      description: 'Founders Fund is a San Francisco based venture capital firm investing in companies building revolutionary technologies. We back founders with the courage to imagine - and the conviction to build - a dramatically better future.',
      website: 'https://foundersfund.com',
      linkedin: 'https://www.linkedin.com/company/founders-fund/',
      aum: '$12B',
      check_size: '$1M - $100M',
      stage: ['seed', 'series_a', 'series_b', 'series_c', 'growth'],
      sectors: ['Software', 'AI/ML', 'Aerospace', 'Bio/Healthcare', 'Crypto/Web3', 'Defense', 'Energy', 'Frontier Tech'],
      geography: 'Global',
      portfolio_count: 200,
      exits: 50,
      unicorns: 20,
      notable_investments: ['SpaceX', 'Palantir', 'Airbnb', 'Stripe', 'Facebook', 'Anduril', 'Oscar Health', 'Neuralink'],
      hot_honey_investments: 0,
      hot_honey_startups: [],
    },
  ];

  const results = [];
  for (const investor of investors) {
    const result = await createInvestor(investor);
    results.push(result);
  }

  return results;
}
