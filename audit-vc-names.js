require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function audit() {
  // Get all investors
  const { data: all } = await s.from('investors').select('name, firm').limit(5000);
  
  // VC-related keywords
  const vcKeywords = [
    'venture', 'capital', 'partners', 'fund', 'investment', 'equity',
    'holdings', 'management', 'advisors', 'group', 'associates',
    'accelerator', 'incubator', 'seed', 'angel', 'cvc', 'corporate',
    'university', 'endowment', 'foundation', 'family office',
    'a16z', 'yc', 'y combinator', 'techstars', 'sequoia', 'kleiner',
    'greylock', 'benchmark', 'accel', 'lightspeed', 'nea', 'usv',
    'gv', 'ivp', 'insight', 'tiger', 'coatue', 'general catalyst'
  ];
  
  // Categorize
  const firmNames = [];
  const individualNames = [];
  const unclear = [];
  const potentiallyBad = [];
  
  all.forEach(inv => {
    const nameLower = inv.name.toLowerCase();
    const firmLower = (inv.firm || '').toLowerCase();
    
    // Check for VC keywords
    const hasVCKeyword = vcKeywords.some(kw => nameLower.includes(kw) || firmLower.includes(kw));
    
    // Check for person name patterns (First Last)
    const isPersonName = /^[A-Z][a-z]+ [A-Z][a-z]+/.test(inv.name) && !hasVCKeyword;
    
    // Check for bad parsing patterns
    const isBadParsing = 
      nameLower.startsWith('the ') ||
      nameLower.startsWith('and ') ||
      nameLower.startsWith('of ') ||
      nameLower.startsWith('in ') ||
      nameLower.startsWith('a ') ||
      nameLower.includes(' the ') && nameLower.length < 20 ||
      /^[a-z]/.test(inv.name) || // starts lowercase
      inv.name.length < 4;
    
    if (isBadParsing) {
      potentiallyBad.push(inv.name);
    } else if (hasVCKeyword) {
      firmNames.push(inv.name);
    } else if (isPersonName || inv.name.includes('(')) {
      individualNames.push(inv.name);
    } else {
      unclear.push(inv.name);
    }
  });
  
  console.log('=== INVESTOR NAME AUDIT ===\n');
  console.log('Total investors:', all.length);
  console.log('VC Firm names:', firmNames.length);
  console.log('Individual names:', individualNames.length);
  console.log('Unclear:', unclear.length);
  console.log('Potentially bad:', potentiallyBad.length);
  
  console.log('\n--- POTENTIALLY BAD NAMES (to delete) ---');
  potentiallyBad.forEach(n => console.log(' ❌', n));
  
  console.log('\n--- SAMPLE VC FIRM NAMES (first 20) ---');
  firmNames.slice(0, 20).forEach(n => console.log(' ✅', n));
  
  console.log('\n--- SAMPLE INDIVIDUAL NAMES (first 20) ---');
  individualNames.slice(0, 20).forEach(n => console.log(' 👤', n));
  
  console.log('\n--- UNCLEAR NAMES (first 30) ---');
  unclear.slice(0, 30).forEach(n => console.log(' ❓', n));
}
audit();
