import { createClient } from '@supabase/supabase-js';

// Get environment variables from Vite's import.meta.env isn't available in Node
// So we'll read from .env file manually or use hardcoded values for testing
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking database integrity...\n');

  try {
    // 1. Check startup_uploads table
    console.log('📊 STARTUP UPLOADS TABLE:');
    console.log('========================');
    
    const { data: startups, error: startupsError } = await supabase
      .from('startup_uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (startupsError) {
      console.error('❌ Error fetching startups:', startupsError);
    } else {
      console.log(`✅ Found ${startups?.length || 0} startups (showing last 10)`);
      
      if (startups && startups.length > 0) {
        console.log('\n📋 Sample startup data:');
        startups.slice(0, 3).forEach((startup, idx) => {
          console.log(`\n--- Startup ${idx + 1}: ${startup.name} ---`);
          console.log(`ID: ${startup.id}`);
          console.log(`Pitch: ${startup.pitch?.substring(0, 100)}...`);
          console.log(`Stage: ${startup.stage}`);
          console.log(`Raise Amount: ${startup.raise_amount}`);
          console.log(`Website: ${startup.website || 'N/A'}`);
          console.log(`Status: ${startup.status}`);
          console.log(`Source Type: ${startup.source_type}`);
          console.log(`Created: ${startup.created_at}`);
          
          // Check extracted_data field
          if (startup.extracted_data) {
            console.log(`\n🔍 Extracted Data (JSON):`);
            const data = startup.extracted_data;
            console.log(`  - Problem: ${data.problem?.substring(0, 80)}...`);
            console.log(`  - Solution: ${data.solution?.substring(0, 80)}...`);
            console.log(`  - Team: ${data.team?.substring(0, 80)}...`);
            console.log(`  - Industry: ${data.industry}`);
            console.log(`  - Five Points: ${data.fivePoints ? `[${data.fivePoints.length} items]` : 'N/A'}`);
            if (data.fivePoints && data.fivePoints.length > 0) {
              data.fivePoints.forEach((point: string, i: number) => {
                console.log(`    ${i + 1}. ${point.substring(0, 60)}...`);
              });
            }
          } else {
            console.log('⚠️  No extracted_data field');
          }
        });

        // 2. Check for data quality issues
        console.log('\n\n🔍 DATA QUALITY CHECKS:');
        console.log('======================');
        
        const missingPitch = startups.filter(s => !s.pitch || s.pitch.trim() === '');
        const missingRaise = startups.filter(s => !s.raise_amount);
        const missingStage = startups.filter(s => !s.stage);
        const missingExtracted = startups.filter(s => !s.extracted_data);
        const invalidFivePoints = startups.filter(s => {
          const data = s.extracted_data as any;
          return !data?.fivePoints || !Array.isArray(data.fivePoints) || data.fivePoints.length !== 5;
        });

        console.log(`\n📊 Statistics:`);
        console.log(`  Total startups checked: ${startups.length}`);
        console.log(`  Missing pitch: ${missingPitch.length}`);
        console.log(`  Missing raise_amount: ${missingRaise.length}`);
        console.log(`  Missing stage: ${missingStage.length}`);
        console.log(`  Missing extracted_data: ${missingExtracted.length}`);
        console.log(`  Invalid fivePoints (not 5 items): ${invalidFivePoints.length}`);

        if (invalidFivePoints.length > 0) {
          console.log(`\n⚠️  Startups with invalid fivePoints:`);
          invalidFivePoints.forEach(s => {
            const data = s.extracted_data as any;
            const fpLength = data?.fivePoints ? data.fivePoints.length : 0;
            console.log(`  - ${s.name}: ${fpLength} points instead of 5`);
          });
        }
      }
    }

    // 3. Check votes table
    console.log('\n\n🗳️  VOTES TABLE:');
    console.log('===============');
    
    const { data: votes, error: votesError, count } = await supabase
      .from('votes')
      .select('*', { count: 'exact' })
      .limit(5);

    if (votesError) {
      console.error('❌ Error fetching votes:', votesError);
    } else {
      console.log(`✅ Found ${count || 0} total votes`);
      if (votes && votes.length > 0) {
        console.log(`\n📋 Sample votes (showing 5):`);
        votes.forEach((vote, idx) => {
          console.log(`  ${idx + 1}. User: ${vote.user_email}, Startup ID: ${vote.startup_id}, Vote: ${vote.vote_type}, Created: ${vote.created_at}`);
        });
      }
    }

    // 4. Check for orphaned votes (votes without matching startups)
    if (votes && votes.length > 0) {
      const voteStartupIds = [...new Set(votes.map(v => v.startup_id))];
      const { data: existingStartups } = await supabase
        .from('startup_uploads')
        .select('id')
        .in('id', voteStartupIds);
      
      const existingIds = new Set(existingStartups?.map(s => s.id) || []);
      const orphanedVotes = votes.filter(v => !existingIds.has(v.startup_id));
      
      if (orphanedVotes.length > 0) {
        console.log(`\n⚠️  Found ${orphanedVotes.length} orphaned votes (votes for non-existent startups)`);
      } else {
        console.log(`\n✅ All votes have valid startup references`);
      }
    }

    // 5. Check table structure
    console.log('\n\n📐 TABLE STRUCTURE:');
    console.log('==================');
    
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'startup_uploads' })
      .catch(() => ({ data: null, error: { message: 'RPC function not available' } }));

    if (columns) {
      console.log('Columns:', columns);
    } else {
      console.log('⚠️  Could not fetch table structure (this is normal if RPC is not set up)');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n\n✅ Database check complete!\n');
}

checkDatabase();
