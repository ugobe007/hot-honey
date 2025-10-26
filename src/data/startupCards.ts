// 25 Hot Startup Cards for Rotation System
export interface StartupCardData {
  id: string;
  name: string;
  description: string;
  votes: number;
  totalVotes: number;
  stage: string;
  answers: string[];
}

export const startupCardsPool: StartupCardData[] = [
  // Original 3
  {
    id: '1',
    name: 'NeuralNest',
    description: 'AI-powered neural networks for edge computing',
    votes: 3,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Revolutionary AI edge computing platform',
      'Slow cloud processing delays real-time decisions', 
      'Real-time neural networks on edge devices',
      'Ex-Google AI engineers with 15+ years experience',
      '$2M for scaling and hardware partnerships'
    ]
  },
  {
    id: '2',
    name: 'GreenTech',
    description: 'Sustainable energy solutions for smart cities',
    votes: 7,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Smart city energy optimization',
      'Cities waste 30% energy due to inefficiency',
      'AI-powered grid management system', 
      'Former Tesla energy team members',
      '$1.5M for pilot deployments'
    ]
  },
  {
    id: '3',
    name: 'FinFlow',
    description: 'Automated financial flow management platform',
    votes: 4,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Automated financial flow management',
      'SMBs lose $50K annually to cash flow issues',
      'AI-driven predictive cash flow platform',
      'Ex-Goldman Sachs fintech veterans',
      '$3M for regulatory compliance and scaling'
    ]
  },
  // Additional 22 cards
  {
    id: '4',
    name: 'QuantumLeap',
    description: 'Quantum computing solutions for enterprise',
    votes: 8,
    totalVotes: 5,
    stage: 'Stage 2',
    answers: [
      'Enterprise quantum computing platform',
      'Classical computers hit computational limits',
      'Quantum algorithms for real business problems',
      'MIT quantum physics PhDs',
      '$5M for quantum hardware development'
    ]
  },
  {
    id: '5',
    name: 'BioHeal',
    description: 'Personalized medicine through genetic analysis',
    votes: 6,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Personalized medical treatments',
      'Generic treatments fail 70% of patients',
      'AI-driven genetic analysis platform',
      'Johns Hopkins medical researchers',
      '$4M for clinical trials and FDA approval'
    ]
  },
  {
    id: '6',
    name: 'SpaceLog',
    description: 'Satellite-based supply chain tracking',
    votes: 5,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Global supply chain transparency',
      'Supply chains lack real-time visibility',
      'Satellite tracking with AI analytics',
      'Ex-SpaceX engineers',
      '$3.5M for satellite constellation'
    ]
  },
  {
    id: '7',
    name: 'CyberShield',
    description: 'AI-powered cybersecurity for small businesses',
    votes: 9,
    totalVotes: 5,
    stage: 'Stage 2',
    answers: [
      'Enterprise-grade cybersecurity for SMBs',
      'SMBs suffer 43% of cyber attacks',
      'AI threat detection at affordable cost',
      'Former NSA cybersecurity experts',
      '$2.5M for AI model training'
    ]
  },
  {
    id: '8',
    name: 'FoodTech',
    description: 'Lab-grown meat production at scale',
    votes: 11,
    totalVotes: 5,
    stage: 'Stage 3',
    answers: [
      'Sustainable protein production',
      'Livestock farming destroys environment',
      'Cellular agriculture technology',
      'Stanford bioengineering team',
      '$10M for production facility'
    ]
  },
  {
    id: '9',
    name: 'EduSmart',
    description: 'AI tutoring for personalized learning',
    votes: 4,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Personalized AI education platform',
      'One-size-fits-all education fails students',
      'Adaptive learning algorithms',
      'Harvard education technology experts',
      '$1.8M for curriculum development'
    ]
  },
  {
    id: '10',
    name: 'CleanAir',
    description: 'Atmospheric carbon capture technology',
    votes: 7,
    totalVotes: 5,
    stage: 'Stage 2',
    answers: [
      'Large-scale carbon removal',
      'Climate change needs immediate action',
      'Revolutionary atmospheric processors',
      'MIT climate science team',
      '$8M for pilot facility construction'
    ]
  },
  {
    id: '11',
    name: 'RoboDoc',
    description: 'Robotic surgery with haptic feedback',
    votes: 6,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Precision robotic surgery platform',
      'Human surgeons limited by hand tremor',
      'Haptic feedback robotic arms',
      'Mayo Clinic surgical team',
      '$6M for medical device certification'
    ]
  },
  {
    id: '12',
    name: 'WaterGen',
    description: 'Atmospheric water generation systems',
    votes: 5,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Clean water from air humidity',
      '2 billion people lack clean water access',
      'Advanced condensation technology',
      'Caltech environmental engineers',
      '$3M for manufacturing scale-up'
    ]
  },
  {
    id: '13',
    name: 'SolarMax',
    description: 'Next-generation perovskite solar cells',
    votes: 8,
    totalVotes: 5,
    stage: 'Stage 2',
    answers: [
      'Ultra-efficient solar energy',
      'Current solar panels only 20% efficient',
      'Perovskite crystal technology',
      'Oxford materials science team',
      '$4.5M for manufacturing equipment'
    ]
  },
  {
    id: '14',
    name: 'MindBridge',
    description: 'Brain-computer interface for paralyzed patients',
    votes: 12,
    totalVotes: 5,
    stage: 'Stage 3',
    answers: [
      'Neural control of digital devices',
      'Paralyzed patients lose independence',
      'Non-invasive brain signal processing',
      'Neuralink alumni scientists',
      '$7M for clinical trials'
    ]
  },
  {
    id: '15',
    name: 'CryptoSecure',
    description: 'Quantum-resistant blockchain technology',
    votes: 6,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Future-proof cryptocurrency',
      'Quantum computers will break current crypto',
      'Post-quantum cryptography algorithms',
      'MIT cryptography researchers',
      '$2.8M for protocol development'
    ]
  },
  {
    id: '16',
    name: 'AgriBot',
    description: 'Autonomous farming robots',
    votes: 7,
    totalVotes: 5,
    stage: 'Stage 2',
    answers: [
      'Automated precision agriculture',
      'Farm labor shortage threatens food supply',
      'AI-powered agricultural robots',
      'John Deere engineering veterans',
      '$5.5M for robot fleet production'
    ]
  },
  {
    id: '17',
    name: 'DeepOcean',
    description: 'Underwater mining for rare earth metals',
    votes: 4,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Sustainable rare earth extraction',
      'Land mining destroys ecosystems',
      'Deep sea mining robotics',
      'Woods Hole oceanographers',
      '$12M for deep sea equipment'
    ]
  },
  {
    id: '18',
    name: 'GenTherapy',
    description: 'CRISPR gene therapy for rare diseases',
    votes: 9,
    totalVotes: 5,
    stage: 'Stage 2',
    answers: [
      'Cure genetic diseases at source',
      '7000 rare diseases have no treatment',
      'Precision CRISPR gene editing',
      'Broad Institute geneticists',
      '$15M for FDA clinical trials'
    ]
  },
  {
    id: '19',
    name: 'HyperLoop',
    description: 'Vacuum tube transportation system',
    votes: 10,
    totalVotes: 5,
    stage: 'Stage 3',
    answers: [
      'Ultra-high-speed ground transport',
      'Air travel creates massive emissions',
      'Magnetic levitation in vacuum tubes',
      'Former Tesla engineers',
      '$50M for test track construction'
    ]
  },
  {
    id: '20',
    name: 'NanoMed',
    description: 'Targeted drug delivery nanorobots',
    votes: 5,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Precision cancer treatment',
      'Chemotherapy damages healthy cells',
      'Programmable nanorobot delivery',
      'Caltech nanotechnology team',
      '$8M for nanorobot manufacturing'
    ]
  },
  {
    id: '21',
    name: 'CloudBrain',
    description: 'Distributed AI computing network',
    votes: 6,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Democratized AI computing power',
      'AI training requires expensive hardware',
      'Distributed computing blockchain',
      'Google Cloud AI veterans',
      '$4M for network infrastructure'
    ]
  },
  {
    id: '22',
    name: 'MatrixBio',
    description: 'Synthetic biology for manufacturing',
    votes: 8,
    totalVotes: 5,
    stage: 'Stage 2',
    answers: [
      'Biological manufacturing platform',
      'Chemical manufacturing pollutes environment',
      'Engineered microorganisms as factories',
      'Ginkgo Bioworks alumni',
      '$6.5M for bioreactor facilities'
    ]
  },
  {
    id: '23',
    name: 'FusionTech',
    description: 'Compact nuclear fusion reactors',
    votes: 13,
    totalVotes: 5,
    stage: 'Stage 4',
    answers: [
      'Clean unlimited energy',
      'Fossil fuels destroy planet',
      'Tokamak miniaturization breakthrough',
      'ITER project scientists',
      '$100M for prototype reactor'
    ]
  },
  {
    id: '24',
    name: 'MemoryChip',
    description: 'Neural implants for memory enhancement',
    votes: 7,
    totalVotes: 5,
    stage: 'Stage 2',
    answers: [
      'Augmented human memory',
      'Alzheimer\'s erases precious memories',
      'Bio-compatible memory chips',
      'Duke neuroscience researchers',
      '$9M for human trials'
    ]
  },
  {
    id: '25',
    name: 'SpaceForge',
    description: 'Zero-gravity manufacturing platform',
    votes: 4,
    totalVotes: 5,
    stage: 'Stage 1',
    answers: [
      'Perfect manufacturing in space',
      'Gravity limits material quality',
      'Orbital manufacturing stations',
      'NASA materials scientists',
      '$20M for space platform launch'
    ]
  }
];

// Get 3 random cards from the pool
export const getRandomStartupCards = (count: number = 3): StartupCardData[] => {
  const shuffled = [...startupCardsPool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Replace a card after voting
export const getReplacementCard = (excludeIds: string[]): StartupCardData => {
  const available = startupCardsPool.filter(card => !excludeIds.includes(card.id));
  return available[Math.floor(Math.random() * available.length)];
};