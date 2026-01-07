require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addToQueue() {
  // Get startups without matches
  const { data: allStartups } = await supabase
    .from('startup_uploads')
    .select('id')
    .eq('status', 'approved')
    .limit(3500);
  
  const { data: matched } = await supabase
    .from('startup_investor_matches')
    .select('startup_id')
    .limit(50000);
  
  const matchedIds = new Set((matched || []).map(m => m.startup_id));
  const unmatched = (allStartups || []).filter(s => matchedIds.has(s.id) === false);
  
  console.log('Unmatched startups:', unmatched.length);
  
  // Check which are already in queue
  const { data: inQueue } = await supabase
    .from('matching_queue')
    .select('startup_id')
    .limit(5000);
  
  const queuedIds = new Set((inQueue || []).map(q => q.startup_id));
  const needsQueue = unmatched.filter(s => queuedIds.has(s.id) === false);
  
  console.log('Need to add to queue:', needsQueue.length);
  
  // Add one at a time to handle duplicates
  let added = 0;
  let skipped = 0;
  for (const s of needsQueue) {
    const { error } = await supabase.from('matching_queue').insert({
      startup_id: s.id,
      status: 'pending',
      attempts: 0
    });
    
    if (error) {
      skipped++;
    } else {
      added++;
      if (added % 50 === 0) console.log('Added:', added);
    }
  }
  
  console.log('Total added:', added, '| Skipped:', skipped);
}

addToQueue();
