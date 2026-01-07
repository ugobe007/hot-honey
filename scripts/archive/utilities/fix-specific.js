require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Manual fixes for known wrong assignments
const MANUAL_FIXES = [
  { name: 'Haiku 4.5', sectors: ['AI/ML'] },
  { name: 'Accordion', sectors: ['FinTech', 'AI/ML'] },
  { name: 'Besolo', sectors: ['SaaS', 'Enterprise'] },
  { name: 'KB Home', sectors: ['PropTech', 'Consumer'] },
  { name: 'TAE Technologies', sectors: ['Energy', 'DeepTech'] },
  { name: 'Lightmatter', sectors: ['DeepTech', 'AI/ML'] },
  { name: 'Xtalic', sectors: ['DeepTech', 'Materials'] },
  { name: 'Hours at NYC', sectors: ['Consumer'] },
  { name: 'Finnish', sectors: ['FinTech'] },
  { name: 'Capitaliply', sectors: ['FinTech'] },
  { name: 'Cloudworx Technologies', sectors: ['SaaS', 'Enterprise'] },
];

async function fix() {
  console.log('Fixing specific wrong assignments...\n');
  
  for (const fix of MANUAL_FIXES) {
    const { error } = await s.from('startup_uploads')
      .update({ sectors: fix.sectors })
      .ilike('name', fix.name + '%');
    
    if (!error) {
      console.log('Fixed:', fix.name, '->', fix.sectors.join(', '));
    }
  }
  
  // Also find startups with "Empowering" that got Energy assigned wrongly
  const { data: empowering } = await s.from('startup_uploads')
    .select('id, name, sectors, tagline')
    .eq('status', 'approved')
    .ilike('tagline', '%empowering%');
  
  console.log('\nStartups with "Empowering" in tagline:', empowering.length);
  
  for (const st of empowering) {
    const secs = st.sectors || [];
    // If it has Energy but tagline just says "empowering", remove Energy
    if (secs.includes('Energy') && !(st.tagline || '').toLowerCase().match(/energy|power grid|solar|battery|nuclear/)) {
      const newSecs = secs.filter(sec => sec !== 'Energy');
      if (newSecs.length === 0) newSecs.push('SaaS');
      await s.from('startup_uploads').update({ sectors: newSecs }).eq('id', st.id);
      console.log('  Removed Energy from:', st.name);
    }
  }
  
  // Same for SpaceTech with "orbit" in unrelated context
  const { data: wrongSpace } = await s.from('startup_uploads')
    .select('id, name, sectors, tagline')
    .eq('status', 'approved')
    .contains('sectors', ['SpaceTech']);
  
  console.log('\nStartups with SpaceTech:', wrongSpace.length);
  
  for (const st of wrongSpace) {
    const tag = (st.tagline || '').toLowerCase();
    // If SpaceTech but no space-related keywords in tagline
    if (!tag.match(/space|satellite|rocket|orbit|aerospace|launch/)) {
      const newSecs = (st.sectors || []).filter(sec => sec !== 'SpaceTech');
      if (newSecs.length === 0) newSecs.push('SaaS');
      await s.from('startup_uploads').update({ sectors: newSecs }).eq('id', st.id);
      console.log('  Removed SpaceTech from:', st.name);
    }
  }
  
  console.log('\nDone.');
}

fix();
