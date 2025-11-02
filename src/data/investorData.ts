// Investment firms and accelerators data

export interface InvestorFirm {
  id: number;
  name: string;
  type: 'vc_firm' | 'accelerator' | 'angel_network' | 'corporate_vc';
  tagline?: string;
  description?: string;
  website?: string;
  logo?: string;
  
  // Investment info
  aum?: string; // Assets under management
  fundSize?: string; // Current fund size
  checkSize?: string; // Typical check size (e.g., "$500K-$5M")
  stage?: string[]; // ['seed', 'series_a', 'series_b']
  sectors?: string[]; // Industries they invest in
  geography?: string[]; // Locations they invest in
  
  // Track record
  portfolioCount?: number; // Total portfolio companies
  exits?: number; // Number of exits
  unicorns?: number; // Number of unicorns created
  notableInvestments?: string[]; // Company names
  
  // Hot Honey specific
  hotHoneyInvestments?: number; // Investments made through Hot Honey
  hotHoneyStartups?: string[]; // Startups they've invested in via Hot Honey
  
  // Social
  linkedin?: string;
  twitter?: string;
  
  // Team
  partners?: string[]; // Partner names
  contactEmail?: string;
}

const investorData: InvestorFirm[] = [
  {
    id: 1,
    name: 'Y Combinator',
    type: 'accelerator',
    tagline: 'Make something people want',
    description: 'Y Combinator created a new model for funding early stage startups. Twice a year we invest in a large number of startups.',
    website: 'https://www.ycombinator.com',
    logo: '/investors/yc.png',
    fundSize: '$3B+',
    checkSize: '$500K',
    stage: ['pre-seed', 'seed'],
    sectors: ['all'],
    geography: ['global'],
    portfolioCount: 4000,
    exits: 100,
    unicorns: 20,
    notableInvestments: ['Airbnb', 'Stripe', 'Coinbase', 'DoorDash', 'Instacart', 'Reddit'],
    hotHoneyInvestments: 0,
    hotHoneyStartups: [],
    linkedin: 'https://www.linkedin.com/company/y-combinator',
    twitter: 'https://twitter.com/ycombinator',
  },
  {
    id: 2,
    name: 'Andreessen Horowitz (a16z)',
    type: 'vc_firm',
    tagline: 'Software is eating the world',
    description: 'Andreessen Horowitz backs bold entrepreneurs building the future through technology.',
    website: 'https://a16z.com',
    logo: '/investors/a16z.png',
    aum: '$35B',
    fundSize: '$7.6B',
    checkSize: '$1M-$50M',
    stage: ['seed', 'series_a', 'series_b', 'growth'],
    sectors: ['fintech', 'crypto', 'bio', 'consumer', 'enterprise', 'ai'],
    geography: ['US', 'global'],
    portfolioCount: 800,
    exits: 50,
    unicorns: 40,
    notableInvestments: ['Coinbase', 'Airbnb', 'Facebook', 'GitHub', 'Instacart', 'Lyft'],
    hotHoneyInvestments: 0,
    linkedin: 'https://www.linkedin.com/company/andreessen-horowitz',
    twitter: 'https://twitter.com/a16z',
  },
  {
    id: 3,
    name: 'Sequoia Capital',
    type: 'vc_firm',
    tagline: 'The entrepreneurs behind the entrepreneurs',
    description: 'Sequoia Capital helps daring founders build legendary companies.',
    website: 'https://www.sequoiacap.com',
    logo: '/investors/sequoia.png',
    aum: '$85B',
    checkSize: '$500K-$100M',
    stage: ['seed', 'series_a', 'series_b', 'series_c', 'growth'],
    sectors: ['all'],
    geography: ['US', 'China', 'India', 'Southeast Asia'],
    portfolioCount: 1000,
    exits: 200,
    unicorns: 100,
    notableInvestments: ['Apple', 'Google', 'PayPal', 'YouTube', 'Instagram', 'WhatsApp'],
    hotHoneyInvestments: 0,
    linkedin: 'https://www.linkedin.com/company/sequoia-capital',
    twitter: 'https://twitter.com/sequoia',
  },
  {
    id: 4,
    name: 'Techstars',
    type: 'accelerator',
    tagline: 'Help entrepreneurs succeed',
    description: 'Techstars is the worldwide network that helps entrepreneurs succeed.',
    website: 'https://www.techstars.com',
    logo: '/investors/techstars.png',
    checkSize: '$120K',
    stage: ['pre-seed', 'seed'],
    sectors: ['all'],
    geography: ['global'],
    portfolioCount: 3000,
    exits: 50,
    unicorns: 10,
    notableInvestments: ['SendGrid', 'ClassPass', 'DigitalOcean', 'PillPack'],
    hotHoneyInvestments: 0,
    linkedin: 'https://www.linkedin.com/company/techstars',
    twitter: 'https://twitter.com/techstars',
  },
  {
    id: 5,
    name: 'Founders Fund',
    type: 'vc_firm',
    tagline: 'We wanted flying cars, instead we got 140 characters',
    description: 'Founders Fund backs bold entrepreneurs who build companies that redefine industries.',
    website: 'https://foundersfund.com',
    logo: '/investors/foundersfund.png',
    aum: '$12B',
    checkSize: '$1M-$100M',
    stage: ['seed', 'series_a', 'series_b', 'growth'],
    sectors: ['aerospace', 'ai', 'biotech', 'crypto', 'consumer'],
    geography: ['US'],
    portfolioCount: 200,
    exits: 30,
    unicorns: 20,
    notableInvestments: ['Facebook', 'SpaceX', 'Airbnb', 'Stripe', 'Palantir'],
    hotHoneyInvestments: 0,
    partners: ['Peter Thiel', 'Brian Singerman'],
    linkedin: 'https://www.linkedin.com/company/founders-fund',
    twitter: 'https://twitter.com/foundersfund',
  },
];

export default investorData;
