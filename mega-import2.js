require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const STARTUPS = [
  ['OpenAI','AI'],['Cohere','AI'],['AI21 Labs','AI'],['Aleph Alpha','AI'],
  ['Inflection','AI'],['Adept','AI'],['Character.AI','AI'],['Jasper','AI'],
  ['Copy.ai','AI'],['Writer','AI'],['Typeface','AI'],['Pika','AI'],
  ['Leonardo.ai','AI'],['Ideogram','AI'],['Flux AI','AI'],
  ['ElevenLabs','AI'],['Resemble AI','AI'],['HeyGen','AI'],
  ['Suno','AI'],['Udio','AI'],['AIVA','AI'],['Soundraw','AI'],
  ['Casetext','AI'],['Spellbook','AI'],['Luminance','AI'],
  ['Moveworks','AI'],['Forethought','AI'],['Ada Support','AI'],['Ultimate.ai','AI'],
  ['Cognition Labs','AI'],['Cursor AI','AI'],['Tabnine','AI'],['Codeium','AI'],
  ['Poolside AI','AI'],['Magic.dev','AI'],['Anysphere','AI'],['Factory AI','AI'],
  ['You.com','AI'],['Neeva','AI'],['Andi Search','AI'],['Komo AI','AI'],
  ['Mem AI','AI'],['Slite','AI'],['Craft Docs','AI'],
  ['Fireflies AI','AI'],['Fathom Video','AI'],['tl;dv','AI'],
  ['Gamma App','AI'],['Beautiful.ai','AI'],['Pitch','AI'],
  ['Luma AI','AI'],['Kaedim','AI'],['Meshy AI','AI'],['Vizcom','AI'],
  ['Wayve','AI'],['Aurora Innovation','AI'],['Motional','AI'],
  ['Labelbox','AI'],['Snorkel AI','AI'],['Cleanlab','AI'],['Aquarium ML','AI'],
  ['Comet ML','AI'],['Neptune ML','AI'],['DVC','AI'],
  ['Together AI','AI'],['Fireworks AI','AI'],['Mosaic ML','AI'],['Lightning AI','AI'],
  ['Capchase','Fintech'],['Clearco','Fintech'],['Arc Finance','Fintech'],['Founderpath','Fintech'],
  ['Nium','Fintech'],['Airwallex','Fintech'],
  ['Current Bank','Fintech'],['Dave Banking','Fintech'],['Varo Bank','Fintech'],['Aspiration Bank','Fintech'],
  ['Public.com','Fintech'],['Wealthfront','Fintech'],['Betterment','Fintech'],['Acorns','Fintech'],
  ['Kraken','Fintech'],['Gemini','Fintech'],
  ['Sezzle','Fintech'],['Zip Pay','Fintech'],
  ['Lightspeed POS','Fintech'],
  ['Lithic','Fintech'],['Unit Finance','Fintech'],['Treasury Prime','Fintech'],
  ['Tally Finance','Fintech'],['Brigit','Fintech'],['Earnin','Fintech'],['Even Financial','Fintech'],['Branch Finance','Fintech'],
  ['Root Insurance','Fintech'],['Hippo Insurance','Fintech'],['Metromile','Fintech'],['Clearcover','Fintech'],
  ['Melio','Fintech'],['Tipalti','Fintech'],['Routable','Fintech'],['Airbase','Fintech'],
  ['Pilot Finance','Fintech'],['Bench Accounting','Fintech'],['Puzzle Financial','Fintech'],['Digits Finance','Fintech'],
  ['Nova Credit','Fintech'],['Petal Card','Fintech'],['TomoCredit','Fintech'],['X1 Card','Fintech'],
  ['Flatiron Health','HealthTech'],['Veracyte','HealthTech'],['Guardant Health','HealthTech'],
  ['Clover Health','HealthTech'],['Alignment Healthcare','HealthTech'],['Bright Health','HealthTech'],
  ['Nurx','HealthTech'],['Thirty Madison','HealthTech'],['Calibrate Health','HealthTech'],
  ['Carbon Health','HealthTech'],['Forward Health','HealthTech'],['Parsley Health','HealthTech'],['Tia Health','HealthTech'],
  ['Lyra Health','HealthTech'],['Ginger Mental','HealthTech'],
  ['Omada Health','HealthTech'],['Virta Health','HealthTech'],['Noom','HealthTech'],
  ['Invitae','HealthTech'],['Nebula Genomics','HealthTech'],
  ['Suki AI','HealthTech'],['Augmedix','HealthTech'],['DeepScribe','HealthTech'],
  ['Eko Health','HealthTech'],['Tyto Care','HealthTech'],['Biobeat','HealthTech'],['Biofourmis','HealthTech'],
  ['Datavant','HealthTech'],['Truveta','HealthTech'],
  ['Hinge Health','HealthTech'],['Kaia Health','HealthTech'],['RecoveryOne','HealthTech'],
  ['Capsule Pharmacy','HealthTech'],['Truepill','HealthTech'],['Cost Plus Drugs','HealthTech'],
  ['Netlify','DevTools'],['Fastly','DevTools'],
  ['Neon Database','DevTools'],['CockroachDB','DevTools'],['SingleStore','DevTools'],
  ['Upstash','DevTools'],['Fauna','DevTools'],['Hasura','DevTools'],
  ['Render','DevTools'],
  ['Sourcegraph','DevTools'],['Gitpod','DevTools'],
  ['Shortcut PM','DevTools'],['Height PM','DevTools'],['Plane PM','DevTools'],['Huly PM','DevTools'],
  ['Appsmith','DevTools'],['Budibase','DevTools'],['Tooljet','DevTools'],['Superblocks','DevTools'],
  ['Builder.io','DevTools'],['Plasmic','DevTools'],['Makeswift','DevTools'],
  ['Hoppscotch','DevTools'],['RapidAPI','DevTools'],
  ['Split.io','DevTools'],['Flagsmith','DevTools'],['Unleash','DevTools'],['GrowthBook','DevTools'],
  ['Dynatrace','DevTools'],['Splunk','DevTools'],['Elastic','DevTools'],
  ['Bugsnag','DevTools'],['Rollbar','DevTools'],['LogRocket','DevTools'],['FullStory','DevTools'],
  ['Sunrun','Climate'],['SolarEdge','Climate'],
  ['ESS Inc','Climate'],['Malta Inc','Climate'],['Antora Energy','Climate'],
  ['TAE Technologies','Climate'],['Helion Energy','Climate'],['General Fusion','Climate'],['Zap Energy','Climate'],
  ['Heirloom Carbon','Climate'],['Charm Industrial','Climate'],['Running Tide','Climate'],
  ['Li-Cycle','Climate'],['Ascend Elements','Climate'],['Battery Resources','Climate'],['Cirba Solutions','Climate'],
  ['Solid Power','Climate'],['Factorial Energy','Climate'],['SES AI','Climate'],['Sila Nano','Climate'],
  ['Lancium','Climate'],['Compute North','Climate'],['Applied Digital','Climate'],['Iris Energy','Climate'],
  ['OhmConnect','Climate'],['Leap Energy','Climate'],['CPower','Climate'],['Voltus','Climate'],
  ['EVgo','Climate'],['Electrify America','Climate'],['Blink Charging','Climate'],['Volta Charging','Climate'],
  ['Lucid Motors','Climate'],['Fisker','Climate'],['Canoo','Climate'],['Lordstown Motors','Climate'],
  ['Saronic','Defense'],
  ['Rebellion Defense','Defense'],['Vannevar Labs','Defense'],['Second Front','Defense'],
  ['Firefly Aerospace','Defense'],['ABL Space','Defense'],
  ['BlackSky','Defense'],['Satellogic','Defense'],['Capella Space','Defense'],
  ['Sierra Space','Defense'],['Vast Space','Defense'],['Orbital Reef','Defense'],['Nanoracks','Defense'],
  ['Space Forge','Defense'],['Outpost Space','Defense'],['ThinkOrbital','Defense'],['Redwire Space','Defense'],
  ['K2 Space','Defense'],['True Anomaly','Defense'],['Slingshot Aerospace','Defense'],['LeoLabs','Defense'],['ExoAnalytic','Defense'],
  ['Applied Intuition','Defense'],['Reliable Robotics','Defense'],['Merlin Labs','Defense'],['Xwing','Defense'],
  ['Apptronik','Robotics'],['1X Technologies','Robotics'],['Sanctuary AI','Robotics'],
  ['Dexterity Robotics','Robotics'],['Pickle Robot','Robotics'],['Nimble Robotics','Robotics'],['RightHand Robotics','Robotics'],
  ['6 River Systems','Robotics'],['Fetch Robotics','Robotics'],['IAM Robotics','Robotics'],['Vecna Robotics','Robotics'],
  ['Gatik','Robotics'],['Einride','Robotics'],['Kodiak Robotics','Robotics'],
  ['Wing Aviation','Robotics'],['Matternet','Robotics'],['DroneUp','Robotics'],
  ['Plus One Robotics','Robotics'],['Kindred AI','Robotics'],['Ambi Robotics','Robotics'],['Soft Robotics','Robotics'],
  ['ANYbotics','Robotics'],['Ghost Robotics','Robotics'],
  ['Bear Robotics','Robotics'],['Miso Robotics','Robotics'],['Kiwibot','Robotics'],['Serve Robotics','Robotics'],
  ['Freshworks','SaaS'],
  ['Confluent','SaaS'],['dbt Labs','SaaS'],
  ['Coda','SaaS'],
  ['Lucidchart','SaaS'],['Whimsical','SaaS'],
  ['Around','SaaS'],
  ['Chorus AI','SaaS'],['People.ai','SaaS'],
  ['Pendo','SaaS'],
  ['OneLogin','SaaS'],['JumpCloud','SaaS'],['Duo Security','SaaS'],
  ['Lacework','SaaS'],['Aqua Security','SaaS'],
  ['HelloSign','SaaS'],['SignNow','SaaS'],
  ['Culture Amp','SaaS'],['Betterworks','SaaS'],
  ['Gem Recruiting','SaaS'],['Eightfold AI','SaaS']
];

async function importAll() {
  console.log('Importing', STARTUPS.length, 'startups...');
  let added = 0, skipped = 0, errors = 0;
  
  for (const [name, sector] of STARTUPS) {
    const { data: ex } = await supabase.from('startup_uploads').select('id').ilike('name', name).limit(1);
    if (ex && ex.length > 0) { skipped++; continue; }
    
    const { error } = await supabase.from('startup_uploads').insert({
      name: name,
      tagline: name + ' - ' + sector + ' company',
      sectors: [sector],
      status: 'approved',
      source_type: 'manual'
    });
    
    if (error === null) { 
      added++;
      if (added % 25 === 0) console.log('Added', added, '...');
    } else {
      errors++;
      if (errors < 3) console.log('Error:', error.message);
    }
  }
  
  console.log('Done. Added:', added, '| Skipped:', skipped, '| Errors:', errors);
}

importAll();
