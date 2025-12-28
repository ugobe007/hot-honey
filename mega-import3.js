require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const STARTUPS = [
  // More AI startups
  ['Anthropic AI','AI'],['Cohere AI','AI'],['Stability','AI'],['Midjourney Inc','AI'],
  ['Databricks AI','AI'],['DataRobot','AI'],['H2O.ai','AI'],['C3.ai','AI'],['Palantir AI','AI'],
  ['UiPath','AI'],['Automation Anywhere','AI'],['Blue Prism','AI'],['WorkFusion','AI'],
  ['Dataiku','AI'],['Alteryx','AI'],['RapidMiner','AI'],['Knime','AI'],['Domino Data','AI'],
  ['Determined AI','AI'],['Paperspace','AI'],['Lambda Labs','AI'],['CoreWeave','AI'],['Voltage Park','AI'],
  ['Groq','AI'],['Cerebras','AI'],['SambaNova','AI'],['Graphcore','AI'],['Tenstorrent','AI'],
  ['Mythic','AI'],['Hailo','AI'],['Syntiant','AI'],['Kneron','AI'],['EdgeQ','AI'],
  ['Weights AI','AI'],['Predibase','AI'],['Determined ML','AI'],['Grid AI','AI'],['Union AI','AI'],
  ['Tecton','AI'],['Feast','AI'],['Hopsworks','AI'],['Feathr','AI'],['Featureform','AI'],
  ['Pinecone','AI'],['Weaviate','AI'],['Milvus','AI'],['Qdrant','AI'],['Chroma','AI'],
  ['LangChain','AI'],['LlamaIndex','AI'],['Semantic Kernel','AI'],['AutoGPT','AI'],['BabyAGI','AI'],
  ['Fixie AI','AI'],['Dust AI','AI'],['Relevance AI','AI'],['Vectara','AI'],['Jina AI','AI'],

  // Cybersecurity
  ['Palo Alto Networks','Security'],['Fortinet','Security'],['Check Point','Security'],['Cisco Security','Security'],
  ['Zscaler','Security'],['Cloudflare Security','Security'],['Netskope','Security'],['Menlo Security','Security'],
  ['Illumio','Security'],['Guardicore','Security'],['Vectra AI','Security'],['Darktrace','Security'],
  ['ExtraHop','Security'],['Corelight','Security'],['Gigamon','Security'],['LogRhythm','Security'],
  ['Sumo Logic','Security'],['Devo','Security'],['Securonix','Security'],['Exabeam','Security'],
  ['Tanium','Security'],['Carbon Black','Security'],['Cylance','Security'],['Deep Instinct','Security'],
  ['Cybereason','Security'],['SentinelOne Security','Security'],['Cynet','Security'],['Morphisec','Security'],
  ['Tessian','Security'],['Abnormal Security','Security'],['Material Security','Security'],['Armorblox','Security'],
  ['Axis Security','Security'],['Perimeter 81','Security'],['Twingate','Security'],['Tailscale','Security'],
  ['HashiCorp','Security'],['CyberArk','Security'],['BeyondTrust','Security'],['Thycotic','Security'],
  ['1Password','Security'],['Dashlane','Security'],['Keeper Security','Security'],['NordPass','Security'],
  ['Bitwarden','Security'],['LastPass','Security'],['Yubico','Security'],['Duo Mobile','Security'],

  // E-commerce/Retail
  ['Shopify Plus','E-commerce'],['BigCommerce','E-commerce'],['Magento','E-commerce'],['WooCommerce','E-commerce'],
  ['Salesforce Commerce','E-commerce'],['SAP Commerce','E-commerce'],['Oracle Commerce','E-commerce'],
  ['Bolt Checkout','E-commerce'],['Fast Checkout','E-commerce'],['Skipify','E-commerce'],['Checkout.com','E-commerce'],
  ['Adyen','E-commerce'],['Worldpay','E-commerce'],['PayPal Commerce','E-commerce'],['Amazon Pay','E-commerce'],
  ['Recharge','E-commerce'],['Bold Commerce','E-commerce'],['Loop Returns','E-commerce'],['Returnly','E-commerce'],
  ['Narvar','E-commerce'],['AfterShip','E-commerce'],['Route','E-commerce'],['Malomo','E-commerce'],
  ['Gorgias Support','E-commerce'],['Kustomer','E-commerce'],['Gladly','E-commerce'],['Dixa','E-commerce'],
  ['Nosto','E-commerce'],['Dynamic Yield','E-commerce'],['Bloomreach','E-commerce'],['Algolia Commerce','E-commerce'],
  ['Constructor.io','E-commerce'],['Searchspring','E-commerce'],['Klevu','E-commerce'],['Coveo Commerce','E-commerce'],
  ['Bazaarvoice','E-commerce'],['PowerReviews','E-commerce'],['Stamped','E-commerce'],['Loox','E-commerce'],
  ['Privy','E-commerce'],['Justuno','E-commerce'],['OptinMonster','E-commerce'],['Wisepops','E-commerce'],
  ['Omnisend','E-commerce'],['Drip','E-commerce'],['Sendlane','E-commerce'],['Retention.com','E-commerce'],

  // HR/Workforce
  ['Workday','HR'],['SAP SuccessFactors','HR'],['Oracle HCM','HR'],['ADP','HR'],['Ceridian','HR'],
  ['UKG','HR'],['Paylocity','HR'],['Paycom','HR'],['Paycor','HR'],['Namely','HR'],
  ['BambooHR','HR'],['Personio','HR'],['HiBob','HR'],['Factorial HR','HR'],['CharlieHR','HR'],
  ['Lever Recruiting','HR'],['Jobvite','HR'],['iCIMS','HR'],['SmartRecruiters','HR'],['Workable','HR'],
  ['Phenom','HR'],['Beamery','HR'],['Avature','HR'],['Paradox AI','HR'],['Olivia AI','HR'],
  ['Cornerstone','HR'],['SumTotal','HR'],['Docebo','HR'],['Absorb LMS','HR'],['TalentLMS','HR'],
  ['Lessonly','HR'],['Seismic Learning','HR'],['Allego','HR'],['Brainshark','HR'],['MindTickle','HR'],
  ['Glint','HR'],['Peakon','HR'],['Qualtrics EX','HR'],['Medallia EX','HR'],['Perceptyx','HR'],
  ['Visier','HR'],['ChartHop','HR'],['Orgnostic','HR'],['Pave','HR'],['Pequity','HR'],

  // Marketing/Advertising
  ['HubSpot Marketing','Marketing'],['Marketo','Marketing'],['Pardot','Marketing'],['Eloqua','Marketing'],
  ['ActiveCampaign','Marketing'],['Mailchimp','Marketing'],['Sendinblue','Marketing'],['ConvertKit','Marketing'],
  ['Constant Contact','Marketing'],['AWeber','Marketing'],['GetResponse','Marketing'],['Campaign Monitor','Marketing'],
  ['SEMrush','Marketing'],['Ahrefs','Marketing'],['Moz','Marketing'],['Majestic','Marketing'],
  ['Sprout Social','Marketing'],['Hootsuite','Marketing'],['Buffer','Marketing'],['Later','Marketing'],
  ['Sprinklr','Marketing'],['Khoros','Marketing'],['Emplifi','Marketing'],['Dash Hudson','Marketing'],
  ['Criteo','Marketing'],['The Trade Desk','Marketing'],['LiveRamp','Marketing'],['Lotame','Marketing'],
  ['Branch.io','Marketing'],['AppsFlyer','Marketing'],['Adjust','Marketing'],['Singular','Marketing'],
  ['Optimizely','Marketing'],['VWO','Marketing'],['AB Tasty','Marketing'],['Kameleoon','Marketing'],
  ['Hotjar','Marketing'],['Crazy Egg','Marketing'],['Lucky Orange','Marketing'],['Mouseflow','Marketing'],
  ['Unbounce','Marketing'],['Instapage','Marketing'],['Leadpages','Marketing'],['ClickFunnels','Marketing'],
  ['Drift','Marketing'],['Qualified','Marketing'],['Demandbase','Marketing'],['6sense','Marketing'],

  // Real Estate/PropTech
  ['Zillow','PropTech'],['Redfin','PropTech'],['Compass Real Estate','PropTech'],['eXp Realty','PropTech'],
  ['Opendoor','PropTech'],['Offerpad','PropTech'],['Knock','PropTech'],['Homeward','PropTech'],
  ['Divvy Homes','PropTech'],['Landis','PropTech'],['ZeroDown','PropTech'],['Point','PropTech'],
  ['Roofstock','PropTech'],['Fundrise','PropTech'],['CrowdStreet','PropTech'],['RealtyMogul','PropTech'],
  ['Latch','PropTech'],['SmartRent','PropTech'],['Dwelo','PropTech'],['PointCentral','PropTech'],
  ['VTS','PropTech'],['Juniper Square','PropTech'],['AppFolio','PropTech'],['Buildium','PropTech'],
  ['Yardi','PropTech'],['RealPage','PropTech'],['Entrata','PropTech'],['ResMan','PropTech'],
  ['Procore','PropTech'],['PlanGrid','PropTech'],['Bluebeam','PropTech'],['Fieldwire','PropTech'],
  ['Built Technologies','PropTech'],['Briq','PropTech'],['Mosaic','PropTech'],['Agave API','PropTech'],
  ['OpenSpace AI','PropTech'],['Doxel AI','PropTech'],['Buildots','PropTech'],['Disperse','PropTech'],

  // Logistics/Supply Chain
  ['Flexport','Logistics'],['Shippo','Logistics'],['EasyPost','Logistics'],['ShipStation','Logistics'],
  ['ShipBob','Logistics'],['Deliverr','Logistics'],['Stord','Logistics'],['Flowspace','Logistics'],
  ['Fabric','Logistics'],['CommonSense Robotics','Logistics'],['Attabotics','Logistics'],['Exotec','Logistics'],
  ['Locus Robotics','Logistics'],['6 River','Logistics'],['Fetch Robots','Logistics'],['inVia','Logistics'],
  ['FourKites','Logistics'],['Project44','Logistics'],['Fourkites','Logistics'],['Trucker Path','Logistics'],
  ['Convoy','Logistics'],['Uber Freight','Logistics'],['Loadsmart','Logistics'],['Transfix','Logistics'],
  ['Samsara','Logistics'],['KeepTruckin','Logistics'],['Motive','Logistics'],['Platform Science','Logistics'],
  ['FarEye','Logistics'],['Bringg','Logistics'],['Onfleet','Logistics'],['Circuit','Logistics'],
  ['Deliverect','Logistics'],['Olo','Logistics'],['Ordermark','Logistics'],['Lunchbox','Logistics'],
  ['Slice','Logistics'],['BentoBox','Logistics'],['Resy','Logistics'],['SevenRooms','Logistics'],

  // EdTech
  ['Coursera','EdTech'],['Udemy','EdTech'],['Skillshare','EdTech'],['MasterClass','EdTech'],
  ['Pluralsight','EdTech'],['LinkedIn Learning','EdTech'],['Udacity','EdTech'],['edX','EdTech'],
  ['Duolingo','EdTech'],['Babbel','EdTech'],['Busuu','EdTech'],['Memrise','EdTech'],
  ['Khan Academy','EdTech'],['IXL Learning','EdTech'],['Age of Learning','EdTech'],['Byju','EdTech'],
  ['Outschool','EdTech'],['Varsity Tutors','EdTech'],['Wyzant','EdTech'],['Tutor.com','EdTech'],
  ['Quizlet','EdTech'],['Brainly','EdTech'],['Photomath','EdTech'],['Socratic','EdTech'],
  ['Canvas LMS','EdTech'],['Blackboard','EdTech'],['Schoology','EdTech'],['Google Classroom','EdTech'],
  ['Clever','EdTech'],['ClassDojo','EdTech'],['Remind','EdTech'],['ParentSquare','EdTech'],
  ['Nearpod','EdTech'],['Pear Deck','EdTech'],['Kahoot','EdTech'],['Quizizz','EdTech'],
  ['Codecademy','EdTech'],['FreeCodeCamp','EdTech'],['DataCamp','EdTech'],['Treehouse','EdTech'],

  // Gaming
  ['Unity Technologies','Gaming'],['Unreal Engine','Gaming'],['Godot Engine','Gaming'],
  ['Roblox','Gaming'],['Epic Games','Gaming'],['Riot Games','Gaming'],['Activision','Gaming'],
  ['Electronic Arts','Gaming'],['Take Two','Gaming'],['Ubisoft','Gaming'],['Bandai Namco','Gaming'],
  ['Supercell','Gaming'],['King','Gaming'],['Zynga','Gaming'],['Playtika','Gaming'],
  ['MiHoYo','Gaming'],['NetEase Games','Gaming'],['Tencent Games','Gaming'],['Krafton','Gaming'],
  ['Niantic','Gaming'],['Pokemon Go','Gaming'],['Ingress','Gaming'],['Pikmin Bloom','Gaming'],
  ['Discord','Gaming'],['Guilded','Gaming'],['TeamSpeak','Gaming'],['Mumble','Gaming'],
  ['Twitch','Gaming'],['YouTube Gaming','Gaming'],['Facebook Gaming','Gaming'],['Trovo','Gaming'],
  ['Steam','Gaming'],['Epic Store','Gaming'],['GOG','Gaming'],['itch.io','Gaming'],
  ['Overwolf','Gaming'],['Mod.io','Gaming'],['Nexus Mods','Gaming'],['CurseForge','Gaming'],

  // Media/Entertainment
  ['Netflix','Media'],['Disney Plus','Media'],['HBO Max','Media'],['Amazon Prime Video','Media'],
  ['Hulu','Media'],['Peacock','Media'],['Paramount Plus','Media'],['Apple TV Plus','Media'],
  ['Spotify','Media'],['Apple Music','Media'],['Amazon Music','Media'],['YouTube Music','Media'],
  ['Tidal','Media'],['Deezer','Media'],['SoundCloud','Media'],['Bandcamp','Media'],
  ['Substack','Media'],['Medium','Media'],['Ghost','Media'],['Buttondown','Media'],
  ['Patreon','Media'],['Ko-fi','Media'],['Buy Me a Coffee','Media'],['Gumroad','Media'],
  ['Anchor','Media'],['Riverside','Media'],['Descript Podcast','Media'],['Podbean','Media'],
  ['Buzzsprout','Media'],['Transistor','Media'],['Simplecast','Media'],['Captivate','Media'],

  // Food/Agriculture
  ['Impossible Foods','FoodTech'],['Beyond Meat','FoodTech'],['Upside Foods','FoodTech'],['Eat Just','FoodTech'],
  ['Perfect Day','FoodTech'],['Clara Foods','FoodTech'],['New Culture','FoodTech'],['Motif FoodWorks','FoodTech'],
  ['Apeel Sciences','FoodTech'],['Hazel Technologies','FoodTech'],['Mori','FoodTech'],['Cambridge Crops','FoodTech'],
  ['Bowery Farming','FoodTech'],['Plenty','FoodTech'],['AeroFarms','FoodTech'],['AppHarvest','FoodTech'],
  ['Gotham Greens','FoodTech'],['BrightFarms','FoodTech'],['Little Leaf Farms','FoodTech'],['Revol Greens','FoodTech'],
  ['Farmers Business Network','FoodTech'],['Indigo Ag','FoodTech'],['Pivot Bio','FoodTech'],['Sound Agriculture','FoodTech'],
  ['Ginkgo Bioworks','FoodTech'],['Zymergen','FoodTech'],['Geltor','FoodTech'],['Bolt Threads','FoodTech'],
  ['DoorDash','FoodTech'],['Instacart','FoodTech'],['Gopuff','FoodTech'],['Gorillas','FoodTech'],
  ['Getir','FoodTech'],['Flink','FoodTech'],['Jokr','FoodTech'],['Buyk','FoodTech'],

  // Travel/Hospitality
  ['Airbnb','Travel'],['Vrbo','Travel'],['Booking.com','Travel'],['Expedia','Travel'],
  ['Tripadvisor','Travel'],['Kayak','Travel'],['Skyscanner','Travel'],['Google Flights','Travel'],
  ['Hopper','Travel'],['Kiwi.com','Travel'],['Momondo','Travel'],['Cheapflights','Travel'],
  ['Sonder','Travel'],['Lyric','Travel'],['Mint House','Travel'],['Placemakr','Travel'],
  ['Hipcamp','Travel'],['Tentrr','Travel'],['Getaway','Travel'],['Collective Retreats','Travel'],
  ['Selina','Travel'],['Life House','Travel'],['Sonder Hotels','Travel'],['citizenM','Travel'],
  ['Hoteltonight','Travel'],['Trivago','Travel'],['Hotels.com','Travel'],['Agoda','Travel'],
  ['TripActions','Travel'],['Navan','Travel'],['TravelPerk','Travel'],['Egencia','Travel']
];

async function importAll() {
  console.log('Importing', STARTUPS.length, 'startups...');
  let added = 0, skipped = 0;
  
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
      if (added % 50 === 0) console.log('Added', added, '...');
    }
  }
  
  console.log('Done. Added:', added, '| Skipped:', skipped);
}

importAll();
