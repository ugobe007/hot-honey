// This script will update MatchingEngine.tsx to use a two-step query approach

const fs = require('fs');
const path = 'src/components/MatchingEngine.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find and replace the query section
const oldQuery = `const { data: matchData, error } = await supabase
        .from('startup_investor_matches')
        .select(\`
          id,
          match_score,
          confidence_level,
          startup_id,
          investor_id,
          startup_uploads (
            id, name, tagline, description, sectors, stage, 
            total_god_score, pitch,
            raise_amount
          ),
          investors (
            id, name, firm, bio, type, sectors, stage,
            check_size_min, check_size_max, geography_focus, 
            notable_investments, investment_thesis
          )
        \`)
        .eq('status', 'suggested')
        .gte('match_score', 35)
        .order('match_score', { ascending: false })
        .limit(100);`;

const newQuery = `// Step 1: Get match IDs only (fast)
      const { data: matchIds, error: matchError } = await supabase
        .from('startup_investor_matches')
        .select('id, match_score, confidence_level, startup_id, investor_id')
        .eq('status', 'suggested')
        .gte('match_score', 35)
        .order('match_score', { ascending: false })
        .limit(100);
      
      if (matchError || !matchIds?.length) {
        console.error('❌ Error fetching match IDs:', matchError);
        setLoadError('Failed to load matches');
        setIsAnalyzing(false);
        return;
      }
      
      // Step 2: Fetch startup and investor details separately
      const startupIds = [...new Set(matchIds.map(m => m.startup_id))];
      const investorIds = [...new Set(matchIds.map(m => m.investor_id))];
      
      const [startupsRes, investorsRes] = await Promise.all([
        supabase.from('startup_uploads').select('id, name, tagline, description, sectors, stage, total_god_score, raise_amount').in('id', startupIds),
        supabase.from('investors').select('id, name, firm, bio, type, sectors, stage, check_size_min, check_size_max, geography_focus, notable_investments, investment_thesis').in('id', investorIds)
      ]);
      
      const startupMap = new Map((startupsRes.data || []).map(s => [s.id, s]));
      const investorMap = new Map((investorsRes.data || []).map(i => [i.id, i]));
      
      // Combine into matchData format
      const matchData = matchIds.map(m => ({
        ...m,
        startup_uploads: startupMap.get(m.startup_id) || null,
        investors: investorMap.get(m.investor_id) || null
      })).filter(m => m.startup_uploads && m.investors);
      
      const error = null;`;

if (content.includes('startup_uploads (')) {
  content = content.replace(oldQuery, newQuery);
  fs.writeFileSync(path, content);
  console.log('✅ Updated MatchingEngine.tsx with optimized two-step query');
} else {
  console.log('❌ Could not find the query pattern to replace');
  console.log('Current content around line 280:');
  const lines = content.split('\n');
  lines.slice(279, 310).forEach((l, i) => console.log(280 + i, l));
}
