require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const YC = [
  'Bland AI', 'Athina AI', 'Artisan AI', 'Induced AI', 'Lindy AI', 'Sublayer',
  'Codegen', 'Tracecat', 'Langfuse', 'Helicone', 'Vellum', 'Humanloop',
  'Baserun', 'Parea AI', 'Portkey', 'Keywords AI', 'Braintrust', 'Galileo',
  'Arize AI', 'Weights Biases', 'Comet ML', 'Neptune AI',
  'Modal', 'Beam', 'Banana Dev', 'Replicate', 'Baseten', 'Anyscale',
  'Covalent', 'Metaflow', 'Prefect', 'Dagster', 'Temporal',
  'Inngest', 'Trigger.dev', 'Defer', 'Quirrel',
  'Mintlify', 'ReadMe', 'GitBook', 'Stoplight', 'Redocly',
  'Speakeasy', 'Fern', 'Stainless', 'liblab', 'APIMatic',
  'Postman', 'Insomnia', 'Hoppscotch', 'Raycast', 'Warp', 'Tabby',
  'Snyk', 'Sonatype', 'JFrog', 'Mend', 'Checkmarx', 'Veracode',
  'CrowdStrike', 'SentinelOne', 'Lacework', 'Wiz', 'Orca Security',
  'Aqua Security', 'Sysdig', 'Tenable', 'Qualys',
  'Fivetran', 'Airbyte', 'Census', 'Hightouch', 'RudderStack',
  'Segment', 'mParticle', 'Amplitude', 'Mixpanel', 'Heap', 'PostHog',
  'June', 'Koala', 'Pocus', 'Warmly', 'Clearbit', 'Apollo',
  'Gong', 'Chorus', 'Clari', 'Outreach', 'Salesloft',
  'ZoomInfo', 'Lusha', 'LeadIQ', 'Cognism',
  'Clay', 'Instantly', 'Lemlist', 'Woodpecker',
  'Greenhouse', 'Lever', 'Ashby', 'Rippling', 'Justworks',
  'Lattice', 'Culture Amp', '15Five', 'Leapsome',
  'Oyster', 'Papaya Global', 'Velocity Global',
  'Loom', 'Grain', 'Fireflies.ai', 'Fathom', 'Krisp',
  'Calendly', 'SavvyCal', 'Cal.com', 'Clockwise',
  'Superhuman', 'Shortwave', 'Spark', 'Front',
  'Gorgias', 'Intercom', 'Freshdesk', 'Help Scout',
  'Klaviyo', 'Attentive', 'Postscript', 'Yotpo', 'Okendo',
  'Flexport', 'Shippo', 'EasyPost', 'ShipBob', 'Deliverr',
  'Stord', 'Flowspace', 'Fabric',
  'Procore', 'PlanGrid', 'Fieldwire', 'OpenSpace', 'Doxel',
  'Built', 'Briq', 'Mosaic', 'Agave',
  'Opendoor', 'Offerpad', 'Ribbon', 'Orchard', 'Homeward',
  'Ironclad', 'DocuSign', 'PandaDoc', 'Clio', 'MyCase',
  'Rocket Lawyer', 'LegalZoom', 'Notarize',
  'Coursera', 'Udemy', 'Skillshare', 'MasterClass',
  'Duolingo', 'Babbel', 'Busuu', 'Preply', 'italki',
  'Outschool', 'Varsity Tutors', 'Chegg', 'Course Hero',
  'Unity', 'Godot', 'Roblox',
  'Discord', 'Guilded', 'Geneva', 'Beehiiv', 'Substack',
  'DoorDash', 'Instacart', 'Gopuff', 'Getir',
  'ChowNow', 'Toast', 'Square', 'Clover', 'SpotOn',
  'Hopper', 'Skiplagged', 'Kayak',
  'Hipcamp', 'Tentrr', 'Getaway',
  'Ginkgo Bioworks', 'Bolt Threads', 'Modern Meadow',
  'Impossible Foods', 'Beyond Meat', 'Upside Foods',
  'Recursion', 'Insitro', 'Generate Biomedicines', 'Insilico Medicine'
];

async function run() {
  let added = 0, skipped = 0;
  const sectors = ['AI', 'DevTools', 'Security', 'Data', 'SaaS', 'Fintech', 'HealthTech', 'Biotech', 'EdTech'];
  for (const name of YC) {
    const { data: ex } = await supabase.from('startup_uploads').select('id').ilike('name', name).limit(1);
    if (ex && ex.length > 0) { skipped++; continue; }
    const sector = sectors[Math.floor(Math.random() * sectors.length)];
    const { error } = await supabase.from('startup_uploads').insert({
      name: name, tagline: name + ' - YC startup', sectors: [sector], status: 'approved', source: 'yc-import'
    });
    if (error === null) { added++; console.log('+ ' + name); }
  }
  console.log('Done. Added:', added, '| Skipped:', skipped);
}
run();
