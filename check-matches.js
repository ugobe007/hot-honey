const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  console.log('🎯 MATCHING ENGINE STATISTICS');
  console.log('='.repeat(60));
  
  // Check if matches table exists
  try {
    const { data: matches, error: matchError, count: matchCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact' });
    
    if (matchError) {
      if (matchError.code === '42P01') {
        console.log('\n⚠️  Matches table does not exist yet');
        console.log('   This table tracks startup-investor matches');
      } else {
        console.log('Match table error:', matchError.message);
      }
    } else {
      console.log('\n✅ TOTAL MATCHES:', matchCount || 0);
      
      if (matches && matches.length > 0) {
        console.log('\n📊 RECENT MATCHES:');
        matches.slice(0, 5).forEach((m, i) => {
          console.log(`   ${i+1}. Match ID: ${m.id}`);
          console.log(`      Created: ${new Date(m.created_at).toLocaleString()}`);
          if (m.score) console.log(`      Score: ${m.score}`);
        });
      }
    }
  } catch (e) {
    console.log('Matches check error:', e.message);
  }
  
  // Check saved matches
  try {
    const { count: savedCount } = await supabase
      .from('saved_matches')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n💾 SAVED MATCHES (User Bookmarks): ${savedCount || 0}`);
  } catch (e) {
    console.log('\n💾 SAVED MATCHES: Table not found or error');
  }
  
  // Check GOD scores
  try {
    const { data: godScores, count: godCount } = await supabase
      .from('god_scores')
      .select('*', { count: 'exact' });
    
    console.log(`\n🏆 GOD SCORES (Startup Rankings): ${godCount || 0}`);
    
    if (godScores && godScores.length > 0) {
      const topScores = godScores
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, 5);
      
      console.log('\n   Top 5 Scored Startups:');
      for (let i = 0; i < topScores.length; i++) {
        const s = topScores[i];
        // Get startup name
        const { data: startup } = await supabase
          .from('startups')
          .select('name')
          .eq('id', s.startup_id)
          .single();
        
        console.log(`      ${i+1}. ${startup?.name || 'Unknown'} - Score: ${s.total_score.toFixed(2)}`);
      }
    }
  } catch (e) {
    console.log('\n🏆 GOD SCORES: Table not found or error');
  }
  
  // Check user votes
  try {
    const { data: votes, count: votesCount } = await supabase
      .from('user_votes')
      .select('vote_type', { count: 'exact' });
    
    console.log(`\n👍 USER VOTES (Startup Feedback): ${votesCount || 0}`);
    
    if (votes && votes.length > 0) {
      const yesVotes = votes.filter(v => v.vote_type === 'yes').length;
      const noVotes = votes.filter(v => v.vote_type === 'no').length;
      
      console.log(`   👍 Yes votes: ${yesVotes}`);
      console.log(`   👎 No votes: ${noVotes}`);
      if (yesVotes + noVotes > 0) {
        console.log(`   📊 Approval rate: ${((yesVotes / (yesVotes + noVotes)) * 100).toFixed(1)}%`);
      }
    }
  } catch (e) {
    console.log('\n👍 USER VOTES: No votes yet or table error');
  }
  
  console.log('\n' + '='.repeat(60));
})();
