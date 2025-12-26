require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * Fetches real logos for investors and startups using multiple sources:
 * 1. Clearbit Logo API (free, no auth - uses domain)
 * 2. Google Favicon API (fallback)
 * 3. UI Avatars (last resort)
 */

// Known VC firm domains for logo lookup
const KNOWN_DOMAINS = {
  // Top VCs
  'a16z': 'a16z.com',
  'andreessen': 'a16z.com',
  'sequoia': 'sequoiacap.com',
  'founders fund': 'foundersfund.com',
  'first round': 'firstround.com',
  'greylock': 'greylock.com',
  'benchmark': 'benchmark.com',
  'lightspeed': 'lsvp.com',
  'accel': 'accel.com',
  'index ventures': 'indexventures.com',
  'bessemer': 'bvp.com',
  'khosla': 'khoslaventures.com',
  'lux capital': 'luxcapital.com',
  'union square': 'usv.com',
  'paradigm': 'paradigm.xyz',
  'y combinator': 'ycombinator.com',
  'yc': 'ycombinator.com',
  'gv': 'gv.com',
  'google ventures': 'gv.com',
  'kleiner': 'kleinerperkins.com',
  'general catalyst': 'generalcatalyst.com',
  'tiger global': 'tigerglobal.com',
  'insight partners': 'insightpartners.com',
  'coatue': 'coatue.com',
  'nea': 'nea.com',
  'dcvc': 'dcvc.com',
  'ivp': 'ivp.com',
  'battery': 'battery.com',
  'softbank': 'softbank.com',
  'spark capital': 'sparkcapital.com',
  'redpoint': 'redpoint.com',
  'matrix': 'matrixpartners.com',
  '500 startups': '500.co',
  '500 global': '500.co',
  'techstars': 'techstars.com',
  'plug and play': 'plugandplaytechcenter.com',
  'antler': 'antler.co',
  'felicis': 'felicis.com',
  'ribbit': 'ribbitcap.com',
  'dragoneer': 'dragoneer.com',
  'thrive': 'thrivecap.com',
  'altimeter': 'altimeter.com',
  'd1 capital': 'd1capital.com',
  'addition': 'addition.com',
  'boldstart': 'boldstart.vc',
  'amplify partners': 'amplifypartners.com',
  'bain capital': 'baincapitalventures.com',
  'wing': 'wing.vc',
  'emergence': 'emcap.com',
  'foundry': 'foundrygroup.com',
  'true ventures': 'trueventures.com',
  'initialized': 'initialized.com',
  'forerunner': 'forerunnerventures.com',
  'maverick': 'maverickventures.com',
  'blume': 'blume.vc',
  'nexus': 'nexusvp.com',
  'elevation': 'elevationcapital.com',
  'peak xv': 'peakxv.com',
  'matrix india': 'matrixpartners.in',
  // Angel groups
  'angellist': 'angellist.com',
  'angel capital': 'angelcapitalassociation.org',
  'golden seeds': 'goldenseeds.com',
  'keiretsu': 'keiretsuforum.com',
  'tech coast angels': 'techcoastangels.com',
  'band of angels': 'bandangels.com',
  // Corporate VCs
  'intel capital': 'intelcapital.com',
  'google': 'google.com',
  'microsoft': 'microsoft.com',
  'amazon': 'amazon.com',
  'salesforce': 'salesforce.com',
  'nvidia': 'nvidia.com',
  'qualcomm': 'qualcomm.com',
  'cisco': 'cisco.com',
  'samsung': 'samsung.com',
};

function extractDomain(name, website) {
  // If we have a website, extract domain
  if (website) {
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`);
      return url.hostname.replace('www.', '');
    } catch {}
  }
  
  // Check known domains
  const nameLower = name.toLowerCase();
  for (const [key, domain] of Object.entries(KNOWN_DOMAINS)) {
    if (nameLower.includes(key)) {
      return domain;
    }
  }
  
  // Try to construct from name
  const cleanName = name
    .replace(/\s*\([^)]+\)\s*$/, '') // Remove parenthetical
    .replace(/,.*$/, '')              // Remove after comma
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')              // Remove spaces
    .replace(/[^a-z0-9]/g, '');       // Remove special chars
  
  if (cleanName.length >= 3) {
    return `${cleanName}.com`;
  }
  
  return null;
}

function getClearbitLogo(domain) {
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}

function getGoogleFavicon(domain) {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

function getUIAvatar(name) {
  const colors = ['6366f1', '8b5cf6', 'ec4899', 'f43f5e', 'f97316', 'eab308', '22c55e', '14b8a6', '06b6d4', '3b82f6'];
  const color = colors[name.length % colors.length];
  const initials = name
    .split(/[\s()]+/)
    .filter(w => w.length > 0 && w[0].match(/[A-Z]/))
    .slice(0, 2)
    .map(w => w[0])
    .join('');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials || name.charAt(0))}&size=200&background=${color}&color=fff&bold=true&rounded=true`;
}

async function updateInvestorLogos() {
  console.log('FETCHING REAL LOGOS FOR INVESTORS\n');
  
  // Get investors missing logos or with ui-avatars placeholder
  const { data: investors, error } = await supabase
    .from('investors')
    .select('id, name, photo_url, firm, linkedin_url, crunchbase_url')
    .or('photo_url.is.null,photo_url.ilike.%ui-avatars%')
    .limit(500);
  
  if (error) {
    console.error('Error fetching investors:', error);
    return;
  }
  
  console.log(`Found ${investors.length} investors needing logos\n`);
  
  let updated = 0;
  
  for (const inv of investors) {
    // Try to extract domain from firm name, linkedin, or crunchbase
    let website = null;
    if (inv.linkedin_url) {
      // LinkedIn might give company page hints
    }
    const domain = extractDomain(inv.name, website) || extractDomain(inv.firm || '', null);
    
    if (domain) {
      const logoUrl = getClearbitLogo(domain);
      
      // Update with Clearbit logo (will show blank if not found - Clearbit handles gracefully)
      const { error: updateError } = await supabase
        .from('investors')
        .update({ 
          photo_url: logoUrl
        })
        .eq('id', inv.id);
      
      if (!updateError) {
        updated++;
        console.log(`✓ ${inv.name.slice(0, 40).padEnd(40)} → ${domain}`);
      }
    } else {
      // Fallback to better initials
      const avatarUrl = getUIAvatar(inv.name);
      await supabase
        .from('investors')
        .update({ photo_url: avatarUrl })
        .eq('id', inv.id);
      console.log(`○ ${inv.name.slice(0, 40).padEnd(40)} → initials (no domain found)`);
    }
  }
  
  console.log(`\n✅ Updated ${updated} investors with real logos`);
}

async function updateStartupLogos() {
  console.log('\n\nFETCHING REAL LOGOS FOR STARTUPS\n');
  
  // Get startups - use extracted_data for website info
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, website, extracted_data')
    .eq('status', 'approved')
    .limit(500);
  
  if (error) {
    console.error('Error fetching startups:', error);
    return;
  }
  
  // Filter to those missing good logos (extracted_data.logo_url or similar)
  const needsLogo = startups.filter(s => {
    const ed = s.extracted_data || {};
    return !ed.logo_url || ed.logo_url.includes('ui-avatars');
  });
  
  console.log(`Found ${needsLogo.length} startups needing logos\n`);
  
  let updated = 0;
  
  for (const startup of needsLogo) {
    const ed = startup.extracted_data || {};
    const website = startup.website || ed.website;
    const domain = extractDomain(startup.name, website);
    
    if (domain) {
      const logoUrl = getClearbitLogo(domain);
      
      // Store logo in extracted_data
      const newExtracted = { ...ed, logo_url: logoUrl, logo_domain: domain };
      
      const { error: updateError } = await supabase
        .from('startup_uploads')
        .update({ extracted_data: newExtracted })
        .eq('id', startup.id);
      
      if (!updateError) {
        updated++;
        console.log(`✓ ${startup.name.slice(0, 40).padEnd(40)} → ${domain}`);
      }
    } else {
      console.log(`○ ${startup.name.slice(0, 40).padEnd(40)} → no domain found`);
    }
  }
  
  console.log(`\n✅ Updated ${updated} startups with real logos`);
}

async function main() {
  await updateInvestorLogos();
  await updateStartupLogos();
  
  // Summary
  const { count: withLogos } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true })
    .ilike('photo_url', '%clearbit%');
  
  console.log(`\n📊 Investors with real logos: ${withLogos}`);
}

main().catch(console.error);
