require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const STARTUPS = [
  // Biotech/Pharma - 100
  ['Moderna','Biotech'],['BioNTech','Biotech'],['CureVac','Biotech'],['Translate Bio','Biotech'],
  ['Recursion Pharma','Biotech'],['Insitro','Biotech'],['Insilico Medicine','Biotech'],['Atomwise','Biotech'],
  ['Schrodinger','Biotech'],['Relay Therapeutics','Biotech'],['XtalPi','Biotech'],['Exscientia','Biotech'],
  ['Generate Biomedicines','Biotech'],['Evozyne','Biotech'],['Arzeda','Biotech'],['Cradle Bio','Biotech'],
  ['Benchling','Biotech'],['Geneious','Biotech'],['SnapGene','Biotech'],['Dotmatics','Biotech'],
  ['10x Genomics','Biotech'],['Illumina','Biotech'],['PacBio','Biotech'],['Oxford Nanopore','Biotech'],
  ['GRAIL','Biotech'],['Freenome','Biotech'],['Thrive Earlier','Biotech'],['Exact Sciences','Biotech'],
  ['Natera','Biotech'],['Myriad Genetics','Biotech'],['Invitae Genetics','Biotech'],['Color Genomics','Biotech'],
  ['Mammoth Biosciences','Biotech'],['Caribou Biosciences','Biotech'],['Intellia','Biotech'],['Editas','Biotech'],
  ['CRISPR Therapeutics','Biotech'],['Beam Therapeutics','Biotech'],['Prime Medicine','Biotech'],['Verve Therapeutics','Biotech'],
  ['Synthego','Biotech'],['Twist Bioscience','Biotech'],['DNA Script','Biotech'],['Ansa Biotechnologies','Biotech'],
  ['Altos Labs','Biotech'],['NewLimit','Biotech'],['Retro Biosciences','Biotech'],['Loyal for Dogs','Biotech'],
  ['Calico','Biotech'],['Unity Biotechnology','Biotech'],['Life Biosciences','Biotech'],['Rejuvenate Bio','Biotech'],
  ['EQRx','Biotech'],['CivicaRx','Biotech'],['Mark Cuban Cost Plus','Biotech'],['BlinkRx','Biotech'],
  ['Lyell Immunopharma','Biotech'],['Arsenal Bio','Biotech'],['Tmunity','Biotech'],['Poseida','Biotech'],
  ['Sana Biotechnology','Biotech'],['BlueRock','Biotech'],['Vertex Cell','Biotech'],['Sigilon','Biotech'],
  ['Resilience','Biotech'],['National Resilience','Biotech'],['Just Evotec','Biotech'],['Abzena','Biotech'],
  ['Ginkgo Bioworks','Biotech'],['Zymergen','Biotech'],['Amyris','Biotech'],['LanzaTech','Biotech'],
  
  // More Fintech - 80
  ['Wise Transfer','Fintech'],['WorldRemit','Fintech'],['Remitly Global','Fintech'],['Xoom','Fintech'],
  ['Western Union Digital','Fintech'],['MoneyGram Digital','Fintech'],['Ria Money','Fintech'],['TransferGo','Fintech'],
  ['N26','Fintech'],['Monzo','Fintech'],['Starling Bank','Fintech'],['Nubank','Fintech'],
  ['Revolut Bank','Fintech'],['Chime Bank','Fintech'],['SoFi Bank','Fintech'],['Marcus Goldman','Fintech'],
  ['Upgrade','Fintech'],['MoneyLion','Fintech'],['Albert','Fintech'],['Cleo AI','Fintech'],
  ['Truebill','Fintech'],['Rocket Money','Fintech'],['Copilot Money','Fintech'],['Monarch Money','Fintech'],
  ['YNAB','Fintech'],['Goodbudget','Fintech'],['PocketGuard','Fintech'],['Simplifi','Fintech'],
  ['Personal Capital','Fintech'],['Empower Finance','Fintech'],['Stash Invest','Fintech'],['Ellevest','Fintech'],
  ['Titan Invest','Fintech'],['M1 Finance','Fintech'],['Alpaca','Fintech'],['DriveWealth','Fintech'],
  ['Interactive Brokers','Fintech'],['TradeStation','Fintech'],['Webull','Fintech'],['Moomoo','Fintech'],
  ['eToro','Fintech'],['Freetrade','Fintech'],['Trading 212','Fintech'],['Stake','Fintech'],
  ['Uniswap','Fintech'],['Aave','Fintech'],['Compound Finance','Fintech'],['MakerDAO','Fintech'],
  ['OpenSea','Fintech'],['Blur NFT','Fintech'],['Rarible','Fintech'],['Foundation NFT','Fintech'],
  ['Alchemy','Fintech'],['Infura','Fintech'],['QuickNode','Fintech'],['Moralis','Fintech'],
  ['Chainalysis','Fintech'],['Elliptic','Fintech'],['TRM Labs','Fintech'],['Merkle Science','Fintech'],
  ['Fireblocks','Fintech'],['Anchorage','Fintech'],['BitGo','Fintech'],['Copper.co','Fintech'],
  ['Circle','Fintech'],['Paxos','Fintech'],['TrueUSD','Fintech'],['USDC','Fintech'],
  ['Ripple','Fintech'],['Stellar','Fintech'],['Algorand','Fintech'],['Solana Labs','Fintech'],
  ['Polygon','Fintech'],['Avalanche','Fintech'],['Near Protocol','Fintech'],['Aptos Labs','Fintech'],
  ['Sui','Fintech'],['LayerZero','Fintech'],['Wormhole','Fintech'],['Axelar','Fintech'],
  
  // More SaaS/B2B - 100
  ['ServiceNow','SaaS'],['Atlassian','SaaS'],['Monday.com','SaaS'],['Smartsheet','SaaS'],
  ['ClickUp','SaaS'],['Notion HQ','SaaS'],['Roam Research','SaaS'],['Obsidian','SaaS'],
  ['Logseq','SaaS'],['Tana','SaaS'],['Mem Labs','SaaS'],['Reflect Notes','SaaS'],
  ['Zapier','SaaS'],['Make (Integromat)','SaaS'],['Workato','SaaS'],['Tray.io','SaaS'],
  ['n8n','SaaS'],['Pipedream','SaaS'],['Paragon','SaaS'],['Merge Dev','SaaS'],
  ['Segment CDP','SaaS'],['mParticle CDP','SaaS'],['Rudderstack CDP','SaaS'],['Hightouch CDP','SaaS'],
  ['Census CDP','SaaS'],['Lytics','SaaS'],['BlueConic','SaaS'],['Treasure Data','SaaS'],
  ['Twilio','SaaS'],['Vonage','SaaS'],['Bandwidth','SaaS'],['Plivo','SaaS'],
  ['MessageBird','SaaS'],['Sinch','SaaS'],['Infobip','SaaS'],['Kaleyra','SaaS'],
  ['SendGrid','SaaS'],['Mailgun','SaaS'],['Postmark','SaaS'],['SparkPost','SaaS'],
  ['Customer.io','SaaS'],['Braze','SaaS'],['Iterable','SaaS'],['OneSignal','SaaS'],
  ['Airship','SaaS'],['Leanplum','SaaS'],['CleverTap','SaaS'],['MoEngage','SaaS'],
  ['Contentful','SaaS'],['Sanity','SaaS'],['Strapi','SaaS'],['Directus','SaaS'],
  ['Prismic','SaaS'],['Storyblok','SaaS'],['Kontent.ai','SaaS'],['Agility CMS','SaaS'],
  ['Algolia','SaaS'],['Elasticsearch','SaaS'],['Typesense','SaaS'],['Meilisearch','SaaS'],
  ['Zendesk CX','SaaS'],['Freshdesk CX','SaaS'],['Help Scout CX','SaaS'],['Kayako','SaaS'],
  ['Zoho Desk','SaaS'],['ServiceNow CSM','SaaS'],['Salesforce Service','SaaS'],['Oracle Service','SaaS'],
  ['Intercom Support','SaaS'],['Drift Chat','SaaS'],['LiveChat','SaaS'],['Tidio','SaaS'],
  ['Crisp Chat','SaaS'],['Olark','SaaS'],['Tawk.to','SaaS'],['JivoChat','SaaS'],
  ['Calendly Scheduling','SaaS'],['Acuity Scheduling','SaaS'],['SimplyBook','SaaS'],['Setmore','SaaS'],
  ['Doodle','SaaS'],['When2meet','SaaS'],['Rally','SaaS'],['Cron Calendar','SaaS'],
  ['Reclaim AI','SaaS'],['Clockwise AI','SaaS'],['Motion','SaaS'],['SkedPal','SaaS'],
  
  // Insurance Tech - 50
  ['Lemonade Insurance','InsurTech'],['Root Insurance','InsurTech'],['Metromile Insurance','InsurTech'],
  ['Hippo Insurance','InsurTech'],['Clearcover Insurance','InsurTech'],['Branch Insurance','InsurTech'],
  ['Kin Insurance','InsurTech'],['Openly Insurance','InsurTech'],['Swyfft Insurance','InsurTech'],
  ['Next Insurance','InsurTech'],['Pie Insurance','InsurTech'],['Vouch Insurance','InsurTech'],
  ['Embroker','InsurTech'],['Newfront Insurance','InsurTech'],['At-Bay','InsurTech'],['Coalition Cyber','InsurTech'],
  ['Corvus Insurance','InsurTech'],['Cowbell Cyber','InsurTech'],['Resilience Cyber','InsurTech'],
  ['Bestow','InsurTech'],['Ladder Life','InsurTech'],['Ethos Life','InsurTech'],['Haven Life','InsurTech'],
  ['Policygenius','InsurTech'],['Gabi','InsurTech'],['Jerry Insurance','InsurTech'],['Insurify','InsurTech'],
  ['Bold Penguin','InsurTech'],['Semsee','InsurTech'],['Tarmika','InsurTech'],['AgentSync','InsurTech'],
  ['Majesco','InsurTech'],['Guidewire','InsurTech'],['Duck Creek','InsurTech'],['Sapiens','InsurTech'],
  ['Applied Systems','InsurTech'],['Vertafore','InsurTech'],['EZLynx','InsurTech'],['HawkSoft','InsurTech'],
  ['Cape Analytics','InsurTech'],['Betterview','InsurTech'],['Arturo','InsurTech'],['Tensorflight','InsurTech'],
  ['Tractable','InsurTech'],['Snapsheet','InsurTech'],['Hi Marley','InsurTech'],['Benekiva','InsurTech'],
  ['Gradient AI','InsurTech'],['Shift Technology','InsurTech'],['Friss','InsurTech'],['DataRobot Insurance','InsurTech'],
  
  // Legal Tech - 40
  ['Clio Legal','LegalTech'],['MyCase Legal','LegalTech'],['PracticePanther','LegalTech'],['Smokeball','LegalTech'],
  ['Rocket Lawyer','LegalTech'],['LegalZoom','LegalTech'],['Avvo','LegalTech'],['Justia','LegalTech'],
  ['Notarize','LegalTech'],['Proof','LegalTech'],['Snapdocs','LegalTech'],['Stavvy','LegalTech'],
  ['Ironclad CLM','LegalTech'],['Juro','LegalTech'],['Agiloft','LegalTech'],['Icertis','LegalTech'],
  ['ContractPodAi','LegalTech'],['Evisort','LegalTech'],['LinkSquares','LegalTech'],['SpotDraft','LegalTech'],
  ['Harvey Legal','LegalTech'],['CaseText AI','LegalTech'],['Spellbook AI','LegalTech'],['Luminance AI','LegalTech'],
  ['Kira Systems','LegalTech'],['Eigen Technologies','LegalTech'],['ThoughtRiver','LegalTech'],['LawGeex','LegalTech'],
  ['Ross Intelligence','LegalTech'],['Lex Machina','LegalTech'],['Ravel Law','LegalTech'],['Blue J Legal','LegalTech'],
  ['Relativity','LegalTech'],['Logikcull','LegalTech'],['Everlaw','LegalTech'],['Disco eDiscovery','LegalTech'],
  ['ZyLAB','LegalTech'],['Nuix','LegalTech'],['Exterro','LegalTech'],['Lighthouse eDiscovery','LegalTech'],
  
  // Construction Tech - 40
  ['Procore Construction','ConTech'],['PlanGrid','ConTech'],['Bluebeam Revu','ConTech'],['Fieldwire','ConTech'],
  ['Autodesk Construction','ConTech'],['Trimble Construction','ConTech'],['Bentley Systems','ConTech'],['Hexagon','ConTech'],
  ['BuilderTrend','ConTech'],['CoConstruct','ConTech'],['Buildertrend','ConTech'],['Jobber','ConTech'],
  ['ServiceTitan','ConTech'],['Housecall Pro','ConTech'],['Jobber Field','ConTech'],['Workiz','ConTech'],
  ['OpenSpace Construction','ConTech'],['Doxel Construction','ConTech'],['Buildots','ConTech'],['Disperse','ConTech'],
  ['Versatile','ConTech'],['Dusty Robotics','ConTech'],['Canvas','ConTech'],['Toggle','ConTech'],
  ['Katerra','ConTech'],['Factory OS','ConTech'],['Prescient','ConTech'],['Blokable','ConTech'],
  ['Built Robotics','ConTech'],['SafeAI','ConTech'],['Teleo','ConTech'],['Phantom Auto','ConTech'],
  ['Join Construction','ConTech'],['Levelset','ConTech'],['GCPay','ConTech'],['Textura','ConTech'],
  ['CMiC','ConTech'],['Sage Construction','ConTech'],['Viewpoint','ConTech'],['Jonas Construction','ConTech'],
  
  // Quantum Computing - 20
  ['IBM Quantum','Quantum'],['Google Quantum AI','Quantum'],['Microsoft Azure Quantum','Quantum'],['Amazon Braket','Quantum'],
  ['IonQ','Quantum'],['Rigetti','Quantum'],['D-Wave','Quantum'],['Quantinuum','Quantum'],
  ['PsiQuantum','Quantum'],['Xanadu','Quantum'],['QuEra','Quantum'],['Atom Computing','Quantum'],
  ['ColdQuanta','Quantum'],['Pasqal','Quantum'],['Alpine Quantum','Quantum'],['Nu Quantum','Quantum'],
  ['Classiq','Quantum'],['Zapata Computing','Quantum'],['QC Ware','Quantum'],['1QBit','Quantum'],
  
  // More DevTools - 50
  ['Snyk Security','DevTools'],['SonarQube','DevTools'],['Codacy','DevTools'],['DeepSource','DevTools'],
  ['CodeClimate','DevTools'],['LGTM','DevTools'],['Semgrep','DevTools'],['Bearer','DevTools'],
  ['CircleCI','DevTools'],['GitHub Actions','DevTools'],['GitLab CI','DevTools'],['Jenkins','DevTools'],
  ['Travis CI','DevTools'],['TeamCity','DevTools'],['Buildkite','DevTools'],['Drone CI','DevTools'],
  ['Argo CD','DevTools'],['Flux CD','DevTools'],['Spinnaker','DevTools'],['Harness','DevTools'],
  ['Octopus Deploy','DevTools'],['AWS CodeDeploy','DevTools'],['Azure DevOps','DevTools'],['Google Cloud Build','DevTools'],
  ['Terraform','DevTools'],['Pulumi','DevTools'],['Crossplane','DevTools'],['CDK','DevTools'],
  ['Ansible','DevTools'],['Chef','DevTools'],['Puppet','DevTools'],['SaltStack','DevTools'],
  ['Kubernetes','DevTools'],['Docker','DevTools'],['Rancher','DevTools'],['OpenShift','DevTools'],
  ['Nomad','DevTools'],['Consul','DevTools'],['Vault','DevTools'],['Boundary','DevTools'],
  ['Waypoint','DevTools'],['Packer','DevTools'],['Vagrant','DevTools'],['Terragrunt','DevTools'],
  ['Spacelift','DevTools'],['env0','DevTools'],['Scalr','DevTools'],['Atlantis','DevTools'],
  ['Infracost','DevTools'],['Checkov','DevTools']
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
