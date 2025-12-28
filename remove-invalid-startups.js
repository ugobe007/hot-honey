/**
 * Remove Invalid Startups
 * 
 * Removes countries, places, and other invalid entries from the database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// List of countries, regions, and invalid names
const INVALID_NAMES = [
  // Countries
  'North Korea', 'South Korea', 'North America', 'South America', 'East Africa', 'West Africa',
  'United States', 'United Kingdom', 'United Arab Emirates', 'United Nations',
  'New Zealand', 'New York', 'New Jersey', 'New Hampshire', 'New Mexico',
  'South Africa', 'South Sudan', 'South Carolina', 'South Dakota',
  'North Carolina', 'North Dakota', 'North Macedonia',
  'East Timor', 'West Bank', 'East Germany', 'West Germany',
  // States/Provinces
  'California', 'Texas', 'Florida', 'New York', 'Pennsylvania', 'Illinois', 'Ohio',
  'Georgia', 'North Carolina', 'Michigan', 'New Jersey', 'Virginia', 'Washington',
  'Arizona', 'Massachusetts', 'Tennessee', 'Indiana', 'Missouri', 'Maryland',
  'Wisconsin', 'Colorado', 'Minnesota', 'South Carolina', 'Alabama', 'Louisiana',
  'Kentucky', 'Oregon', 'Oklahoma', 'Connecticut', 'Utah', 'Iowa', 'Nevada',
  'Arkansas', 'Mississippi', 'Kansas', 'New Mexico', 'Nebraska', 'Idaho',
  'West Virginia', 'Hawaii', 'New Hampshire', 'Maine', 'Montana', 'Rhode Island',
  'Delaware', 'South Dakota', 'North Dakota', 'Alaska', 'Vermont', 'Wyoming',
  // Cities (major ones that might be mistaken)
  'London', 'Paris', 'Tokyo', 'Berlin', 'Rome', 'Madrid', 'Moscow', 'Beijing',
  'Sydney', 'Melbourne', 'Toronto', 'Vancouver', 'Montreal', 'Dubai', 'Singapore',
  // Government/Organizations
  'Federal Reserve', 'Federal Government', 'State Department', 'Department of Defense',
  'Department of State', 'Department of Justice', 'Department of Energy',
  // Other invalid patterns
  'The Company', 'The Startup', 'The Business', 'The Organization',
  'A Company', 'A Startup', 'A Business',
];

// Patterns for invalid names
const INVALID_PATTERNS = [
  /^(North|South|East|West)\s+(Korea|America|Africa|Carolina|Dakota|Macedonia|Timor|Bank|Germany)$/i,
  /^(United\s+)?(States|Kingdom|Nations|Arab\s+Emirates)$/i,
  /^New\s+(Zealand|York|Jersey|Hampshire|Mexico|Delhi|Orleans)$/i,
  /^(State|Federal|Government|Department)\s+of/i,
  /^The\s+(Company|Startup|Business|Organization)$/i,
  /^A\s+(Company|Startup|Business)$/i,
];

function isInvalidName(name) {
  if (!name) return true;
  
  const nameTrimmed = name.trim();
  
  // Check exact matches
  if (INVALID_NAMES.some(invalid => nameTrimmed.toLowerCase() === invalid.toLowerCase())) {
    return true;
  }
  
  // Check patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(nameTrimmed)) {
      return true;
    }
  }
  
  return false;
}

async function removeInvalidStartups() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     🧹 REMOVING INVALID STARTUPS                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  let removedCount = 0;

  // 1. Check startup_uploads
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  CHECKING startup_uploads');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: uploads, error: uploadsError } = await supabase
    .from('startup_uploads')
    .select('id, name, description')
    .eq('status', 'approved')
    .limit(5000);

  if (uploadsError) {
    console.error('Error fetching startup_uploads:', uploadsError);
    return;
  }

  console.log(`📊 Checking ${uploads.length} approved startups...\n`);

  const toRemoveUploads = [];
  for (const startup of uploads) {
    if (isInvalidName(startup.name)) {
      toRemoveUploads.push(startup.id);
      console.log(`   🚫 ${startup.name} - Invalid name (country/place/government)`);
    }
  }

  if (toRemoveUploads.length > 0) {
    console.log(`\n🗑️  Removing ${toRemoveUploads.length} invalid startups from startup_uploads...`);
    const { error: deleteError } = await supabase
      .from('startup_uploads')
      .delete()
      .in('id', toRemoveUploads);

    if (deleteError) {
      console.error('Error removing from startup_uploads:', deleteError);
    } else {
      removedCount += toRemoveUploads.length;
      console.log(`   ✅ Removed ${toRemoveUploads.length} invalid startups`);
    }
  } else {
    console.log('   ✅ No invalid startups found in startup_uploads');
  }

  // 2. Check discovered_startups
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  CHECKING discovered_startups');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: discovered, error: discoveredError } = await supabase
    .from('discovered_startups')
    .select('id, name, description')
    .eq('imported_to_startups', false)
    .limit(5000);

  if (discoveredError) {
    console.error('Error fetching discovered_startups:', discoveredError);
    return;
  }

  console.log(`📊 Checking ${discovered.length} discovered startups...\n`);

  const toRemoveDiscovered = [];
  for (const startup of discovered) {
    if (isInvalidName(startup.name)) {
      toRemoveDiscovered.push(startup.id);
      console.log(`   🚫 ${startup.name} - Invalid name (country/place/government)`);
    }
  }

  if (toRemoveDiscovered.length > 0) {
    console.log(`\n🗑️  Removing ${toRemoveDiscovered.length} invalid startups from discovered_startups...`);
    const { error: deleteError } = await supabase
      .from('discovered_startups')
      .delete()
      .in('id', toRemoveDiscovered);

    if (deleteError) {
      console.error('Error removing from discovered_startups:', deleteError);
    } else {
      removedCount += toRemoveDiscovered.length;
      console.log(`   ✅ Removed ${toRemoveDiscovered.length} invalid startups`);
    }
  } else {
    console.log('   ✅ No invalid startups found in discovered_startups');
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`✅ Checked: ${(uploads?.length || 0) + (discovered?.length || 0)} startups`);
  console.log(`🗑️  Removed: ${removedCount} invalid startups\n`);
  console.log('💡 Invalid names include: countries, states, cities, government entities\n');
}

removeInvalidStartups().catch(console.error);





