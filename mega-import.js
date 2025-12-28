require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// 500+ real startups from Crunchbase, TechCrunch, YC directories
const STARTUPS = [
  // AI/ML - 100
  ['OpenAI','AI'],['Anthropic','AI'],['Cohere','AI'],['AI21 Labs','AI'],['Aleph Alpha','AI'],
  ['Mistral AI','AI'],['Inflection','AI'],['Adept','AI'],['Character.AI','AI'],['Jasper','AI'],
  ['Copy.ai','AI'],['Writer','AI'],['Typeface','AI'],['Runway','AI'],['Pika','AI'],
  ['Stability AI','AI'],['Midjourney','AI'],['Leonardo.ai','AI'],['Ideogram','AI'],['Flux','AI'],
  ['ElevenLabs','AI'],['Resemble AI','AI'],['Descript','AI'],['Synthesia','AI'],['HeyGen','AI'],
  ['Suno','AI'],['Udio','AI'],['AIVA','AI'],['Amper','AI'],['Soundraw','AI'],
  ['Harvey','AI'],['Casetext','AI'],['Ironclad','AI'],['Spellbook','AI'],['Luminance','AI'],
  ['Glean','AI'],['Moveworks','AI'],['Forethought','AI'],['Ada','AI'],['Ultimate.ai','AI'],
  ['Cognition','AI'],['Replit','AI'],['Cursor','AI'],['Tabnine','AI'],['Codeium','AI'],
  ['Poolside','AI'],['Magic.dev','AI'],['Anysphere','AI'],['Factory AI','AI'],['Codegen','AI'],
  ['Perplexity','AI'],['You.com','AI'],['Neeva','AI'],['Andi','AI'],['Komo','AI'],
  ['Mem','AI'],['Notion AI','AI'],['Coda AI','AI'],['Craft','AI'],['Slite','AI'],
  ['Otter.ai','AI'],['Fireflies','AI'],['Grain','AI'],['Fathom','AI'],['tl;dv','AI'],
  ['Tome','AI'],['Gamma','AI'],['Beautiful.ai','AI'],['Pitch','AI'],['Canva AI','AI'],
  ['Luma AI','AI'],['Kaedim','AI'],['Meshy','AI'],['Spline','AI'],['Vizcom','AI'],
  ['Wayve','AI'],['Waymo','AI'],['Cruise','AI'],['Aurora','AI'],['Motional','AI'],
  ['Scale AI','AI'],['Labelbox','AI'],['Snorkel','AI'],['Cleanlab','AI'],['Aquarium','AI'],
  ['Weights Biases','AI'],['MLflow','AI'],['Comet','AI'],['Neptune','AI'],['DVC','AI'],
  ['Hugging Face','AI'],['Replicate','AI'],['Modal','AI'],['Baseten','AI'],['Banana','AI'],
  ['Together AI','AI'],['Fireworks','AI'],['Anyscale','AI'],['Mosaic ML','AI'],['Lightning AI','AI'],
  
  // Fintech - 80
  ['Stripe','Fintech'],['Plaid','Fintech'],['Brex','Fintech'],['Ramp','Fintech'],['Mercury','Fintech'],
  ['Carta','Fintech'],['Deel','Fintech'],['Remote','Fintech'],['Oyster','Fintech'],['Papaya','Fintech'],
  ['Pipe','Fintech'],['Capchase','Fintech'],['Clearco','Fintech'],['Arc','Fintech'],['Founderpath','Fintech'],
  ['Revolut','Fintech'],['Wise','Fintech'],['Remitly','Fintech'],['Nium','Fintech'],['Airwallex','Fintech'],
  ['Chime','Fintech'],['Current','Fintech'],['Dave','Fintech'],['Varo','Fintech'],['Aspiration','Fintech'],
  ['Robinhood','Fintech'],['Public','Fintech'],['Wealthfront','Fintech'],['Betterment','Fintech'],['Acorns','Fintech'],
  ['Coinbase','Fintech'],['Kraken','Fintech'],['Gemini','Fintech'],['BlockFi','Fintech'],['Celsius','Fintech'],
  ['Klarna','Fintech'],['Affirm','Fintech'],['Afterpay','Fintech'],['Sezzle','Fintech'],['Zip','Fintech'],
  ['Toast','Fintech'],['Square','Fintech'],['Clover','Fintech'],['SpotOn','Fintech'],['Lightspeed','Fintech'],
  ['Marqeta','Fintech'],['Galileo','Fintech'],['Lithic','Fintech'],['Unit','Fintech'],['Treasury Prime','Fintech'],
  ['Tally','Fintech'],['Brigit','Fintech'],['Earnin','Fintech'],['Even','Fintech'],['Branch','Fintech'],
  ['Lemonade','Fintech'],['Root','Fintech'],['Hippo','Fintech'],['Metromile','Fintech'],['Clearcover','Fintech'],
  ['Gusto','Fintech'],['Justworks','Fintech'],['Rippling','Fintech'],['TriNet','Fintech'],['Paychex','Fintech'],
  ['Melio','Fintech'],['Bill.com','Fintech'],['Tipalti','Fintech'],['Routable','Fintech'],['Airbase','Fintech'],
  ['Pilot','Fintech'],['Bench','Fintech'],['Puzzle','Fintech'],['Finally','Fintech'],['Digits','Fintech'],
  ['Nova Credit','Fintech'],['Petal','Fintech'],['TomoCredit','Fintech'],['X1','Fintech'],['Tomo','Fintech'],
  
  // HealthTech - 60
  ['Tempus','HealthTech'],['Flatiron','HealthTech'],['Veracyte','HealthTech'],['Guardant','HealthTech'],['Foundation','HealthTech'],
  ['Oscar','HealthTech'],['Clover','HealthTech'],['Devoted','HealthTech'],['Alignment','HealthTech'],['Bright','HealthTech'],
  ['Ro','HealthTech'],['Hims','HealthTech'],['Nurx','HealthTech'],['Thirty Madison','HealthTech'],['Calibrate','HealthTech'],
  ['One Medical','HealthTech'],['Carbon Health','HealthTech'],['Forward','HealthTech'],['Parsley','HealthTech'],['Tia','HealthTech'],
  ['Spring Health','HealthTech'],['Lyra','HealthTech'],['Ginger','HealthTech'],['Headway','HealthTech'],['Cerebral','HealthTech'],
  ['Omada','HealthTech'],['Livongo','HealthTech'],['Virta','HealthTech'],['Noom','HealthTech'],['WW Health','HealthTech'],
  ['Color Health','HealthTech'],['Invitae','HealthTech'],['23andMe','HealthTech'],['Ancestry','HealthTech'],['Nebula','HealthTech'],
  ['Abridge','HealthTech'],['Suki','HealthTech'],['Nuance','HealthTech'],['Augmedix','HealthTech'],['DeepScribe','HealthTech'],
  ['Butterfly','HealthTech'],['Eko','HealthTech'],['Tyto Care','HealthTech'],['Biobeat','HealthTech'],['Biofourmis','HealthTech'],
  ['Komodo Health','HealthTech'],['Datavant','HealthTech'],['Truveta','HealthTech'],['Veeva','HealthTech'],['IQVIA','HealthTech'],
  ['Sword Health','HealthTech'],['Hinge Health','HealthTech'],['Kaia Health','HealthTech'],['RecoveryOne','HealthTech'],['Limber','HealthTech'],
  ['Alto Pharmacy','HealthTech'],['Capsule','HealthTech'],['Truepill','HealthTech'],['Amazon Pharmacy','HealthTech'],['Cost Plus','HealthTech'],
  
  // DevTools - 60
  ['Vercel','DevTools'],['Netlify','DevTools'],['Cloudflare','DevTools'],['Fastly','DevTools'],['Akamai','DevTools'],
  ['Supabase','DevTools'],['PlanetScale','DevTools'],['Neon','DevTools'],['CockroachDB','DevTools'],['SingleStore','DevTools'],
  ['MongoDB','DevTools'],['Redis','DevTools'],['Upstash','DevTools'],['Fauna','DevTools'],['Hasura','DevTools'],
  ['Railway','DevTools'],['Render','DevTools'],['Fly.io','DevTools'],['DigitalOcean','DevTools'],['Linode','DevTools'],
  ['GitHub','DevTools'],['GitLab','DevTools'],['Bitbucket','DevTools'],['Sourcegraph','DevTools'],['Gitpod','DevTools'],
  ['Linear','DevTools'],['Shortcut','DevTools'],['Height','DevTools'],['Plane','DevTools'],['Huly','DevTools'],
  ['Retool','DevTools'],['Appsmith','DevTools'],['Budibase','DevTools'],['Tooljet','DevTools'],['Superblocks','DevTools'],
  ['Webflow','DevTools'],['Framer','DevTools'],['Builder.io','DevTools'],['Plasmic','DevTools'],['Makeswift','DevTools'],
  ['Postman','DevTools'],['Insomnia','DevTools'],['Hoppscotch','DevTools'],['Paw','DevTools'],['RapidAPI','DevTools'],
  ['LaunchDarkly','DevTools'],['Split','DevTools'],['Flagsmith','DevTools'],['Unleash','DevTools'],['GrowthBook','DevTools'],
  ['Datadog','DevTools'],['New Relic','DevTools'],['Dynatrace','DevTools'],['Splunk','DevTools'],['Elastic','DevTools'],
  ['Sentry','DevTools'],['Bugsnag','DevTools'],['Rollbar','DevTools'],['LogRocket','DevTools'],['FullStory','DevTools'],
  
  // Climate/Energy - 50
  ['Tesla Energy','Climate'],['Sunrun','Climate'],['Sunnova','Climate'],['Enphase','Climate'],['SolarEdge','Climate'],
  ['Form Energy','Climate'],['ESS Inc','Climate'],['Ambri','Climate'],['Malta','Climate'],['Antora','Climate'],
  ['Commonwealth Fusion','Climate'],['TAE','Climate'],['Helion','Climate'],['General Fusion','Climate'],['Zap Energy','Climate'],
  ['Climeworks','Climate'],['Heirloom','Climate'],['Charm Industrial','Climate'],['Running Tide','Climate'],['Stripe Climate','Climate'],
  ['Redwood Materials','Climate'],['Li-Cycle','Climate'],['Ascend Elements','Climate'],['Battery Resources','Climate'],['Cirba','Climate'],
  ['QuantumScape','Climate'],['Solid Power','Climate'],['Factorial','Climate'],['SES AI','Climate'],['Sila Nano','Climate'],
  ['Crusoe Energy','Climate'],['Lancium','Climate'],['Compute North','Climate'],['Applied Digital','Climate'],['Iris Energy','Climate'],
  ['Arcadia','Climate'],['OhmConnect','Climate'],['Leap','Climate'],['CPower','Climate'],['Voltus','Climate'],
  ['ChargePoint','Climate'],['EVgo','Climate'],['Electrify America','Climate'],['Blink','Climate'],['Volta','Climate'],
  ['Rivian','Climate'],['Lucid','Climate'],['Fisker','Climate'],['Canoo','Climate'],['Lordstown','Climate'],
  
  // Defense/Aerospace - 40
  ['Anduril','Defense'],['Shield AI','Defense'],['Skydio','Defense'],['Saronic','Defense'],['Hermeus','Defense'],
  ['Hadrian','Defense'],['Rebellion Defense','Defense'],['Vannevar Labs','Defense'],['Second Front','Defense'],['Palantir','Defense'],
  ['SpaceX','Defense'],['Rocket Lab','Defense'],['Relativity Space','Defense'],['Firefly','Defense'],['ABL Space','Defense'],
  ['Planet Labs','Defense'],['Spire Global','Defense'],['BlackSky','Defense'],['Satellogic','Defense'],['Capella Space','Defense'],
  ['Axiom Space','Defense'],['Sierra Space','Defense'],['Vast','Defense'],['Orbital Reef','Defense'],['Nanoracks','Defense'],
  ['Varda Space','Defense'],['Space Forge','Defense'],['Outpost','Defense'],['ThinkOrbital','Defense'],['Redwire','Defense'],
  ['K2 Space','Defense'],['True Anomaly','Defense'],['Slingshot','Defense'],['LeoLabs','Defense'],['ExoAnalytic','Defense'],
  ['Epirus','Defense'],['Applied Intuition','Defense'],['Reliable Robotics','Defense'],['Merlin Labs','Defense'],['Xwing','Defense'],
  
  // Robotics - 40
  ['Figure','Robotics'],['Agility Robotics','Robotics'],['Apptronik','Robotics'],['1X Technologies','Robotics'],['Sanctuary AI','Robotics'],
  ['Covariant','Robotics'],['Dexterity','Robotics'],['Pickle Robot','Robotics'],['Nimble','Robotics'],['RightHand','Robotics'],
  ['Locus Robotics','Robotics'],['6 River Systems','Robotics'],['Fetch Robotics','Robotics'],['IAM Robotics','Robotics'],['Vecna','Robotics'],
  ['Nuro','Robotics'],['Gatik','Robotics'],['Einride','Robotics'],['Kodiak','Robotics'],['TuSimple','Robotics'],
  ['Zipline','Robotics'],['Wing','Robotics'],['Amazon Prime Air','Robotics'],['Matternet','Robotics'],['DroneUp','Robotics'],
  ['Berkshire Grey','Robotics'],['Plus One','Robotics'],['Kindred','Robotics'],['Ambi Robotics','Robotics'],['Soft Robotics','Robotics'],
  ['Gecko Robotics','Robotics'],['ANYbotics','Robotics'],['Ghost Robotics','Robotics'],['Spot','Robotics'],['Stretch','Robotics'],
  ['Bear Robotics','Robotics'],['Miso Robotics','Robotics'],['Starship','Robotics'],['Kiwibot','Robotics'],['Serve Robotics','Robotics'],
  
  // SaaS/Enterprise - 60
  ['Salesforce','SaaS'],['HubSpot','SaaS'],['Zendesk','SaaS'],['Freshworks','SaaS'],['Intercom','SaaS'],
  ['Snowflake','SaaS'],['Databricks','SaaS'],['Confluent','SaaS'],['Fivetran','SaaS'],['dbt Labs','SaaS'],
  ['Notion','SaaS'],['Coda','SaaS'],['Airtable','SaaS'],['Monday','SaaS'],['Asana','SaaS'],
  ['Figma','SaaS'],['Canva','SaaS'],['Miro','SaaS'],['Lucid','SaaS'],['Whimsical','SaaS'],
  ['Zoom','SaaS'],['Slack','SaaS'],['Discord','SaaS'],['Loom','SaaS'],['Around','SaaS'],
  ['Gong','SaaS'],['Chorus','SaaS'],['Clari','SaaS'],['People.ai','SaaS'],['Outreach','SaaS'],
  ['Amplitude','SaaS'],['Mixpanel','SaaS'],['Heap','SaaS'],['PostHog','SaaS'],['Pendo','SaaS'],
  ['Auth0','SaaS'],['Okta','SaaS'],['OneLogin','SaaS'],['JumpCloud','SaaS'],['Duo','SaaS'],
  ['Snyk','SaaS'],['Wiz','SaaS'],['Lacework','SaaS'],['Orca','SaaS'],['Aqua','SaaS'],
  ['DocuSign','SaaS'],['PandaDoc','SaaS'],['HelloSign','SaaS'],['SignNow','SaaS'],['Adobe Sign','SaaS'],
  ['Lattice','SaaS'],['Culture Amp','SaaS'],['15Five','SaaS'],['Leapsome','SaaS'],['Betterworks','SaaS'],
  ['Lever','SaaS'],['Greenhouse','SaaS'],['Ashby','SaaS'],['Gem','SaaS'],['Eightfold','SaaS']
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
      status: 'approved'
    });
    
    if (error === null) { 
      added++; 
      if (added % 50 === 0) console.log('Added', added, '...');
    } else {
      errors++;
    }
  }
  
  console.log('Done. Added:', added, '| Skipped:', skipped, '| Errors:', errors);
}

importAll();
