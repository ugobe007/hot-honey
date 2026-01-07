require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function investigate() {
  const { data: zeroTraction } = await supabase.from('startup_uploads')
    .select('id, name, tagline, description, pitch, website')
    .eq('status', 'approved')
    .eq('traction_score', 0)
    .limit(15);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ZERO TRACTION SAMPLES (15 of 297)');
  console.log('═══════════════════════════════════════════════════════════');

  for (const st of zeroTraction) {
    const allText = [st.name, st.tagline, st.description, st.pitch].filter(Boolean).join(' ').toLowerCase();
    console.log('\n📍', st.name);
    console.log('   Text length:', allText.length);
    console.log('   Tagline:', (st.tagline || '(none)').substring(0, 80));
    
    const patterns = {
      revenue: /revenue|mrr|arr|sales|paying|customer|subscri|income|profit/i.test(allText),
      growth: /grow|scale|expand|increas|triple|double|explod|rapid|hockey/i.test(allText),
      users: /user|customer|client|active|download|install|member|subscriber/i.test(allText),
      funding: /fund|invest|raise|capital|seed|series|vc|backed/i.test(allText),
      launch: /launch|live|ship|deploy|release|availab|beta|alpha|pilot/i.test(allText),
      ai_ml: /\b(ai|ml|machine learning|artificial intelligence|gpt|llm|neural|deep learning)\b/i.test(allText),
      company: /\b(inc|llc|ltd|corp|co\.|company|startup)\b/i.test(allText),
    };
    console.log('   Patterns:', Object.entries(patterns).filter(([k,v])=>v).map(([k])=>k).join(', ') || 'NONE');
  }

  // Also check zero vision
  const { data: zeroVision } = await supabase.from('startup_uploads')
    .select('id, name, tagline, description, pitch')
    .eq('status', 'approved')
    .eq('vision_score', 0)
    .limit(10);

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  ZERO VISION SAMPLES (10 of 211)');
  console.log('═══════════════════════════════════════════════════════════');

  for (const st of zeroVision) {
    const allText = [st.name, st.tagline, st.description, st.pitch].filter(Boolean).join(' ').toLowerCase();
    console.log('\n📍', st.name);
    console.log('   Text length:', allText.length);
    console.log('   Tagline:', (st.tagline || '(none)').substring(0, 80));
    
    const visionPatterns = {
      ambition: /transform|revolution|reimagin|disrupt|future|world|global|billion/i.test(allText),
      contrarian: /only|unique|first|different|unlike|proprietary|exclusive/i.test(allText),
      mission: /mission|vision|purpose|change|impact|empower/i.test(allText),
      market: /market|industry|sector|space|ecosystem/i.test(allText),
    };
    console.log('   Vision patterns:', Object.entries(visionPatterns).filter(([k,v])=>v).map(([k])=>k).join(', ') || 'NONE');
  }
}

investigate();
