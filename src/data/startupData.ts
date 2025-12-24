/**
 * @deprecated This static data file is kept for backward compatibility only.
 * 
 * SSOT: Use database (startup_uploads table) as single source of truth.
 * 
 * Migration:
 *   - Use loadApprovedStartups() from '@/store' instead
 *   - Remove fallback logic from services
 *   - This file will be removed once all fallbacks are removed
 * 
 * Current usage: Used as fallback when database is empty or fails.
 * This is a temporary measure until database is fully populated.
 */

import { Startup } from '../types';

const startupData: Startup[] = [
  {
    id: 0,
    name: 'GreenTech',
    description: 'Sustainable energy solutions for smart cities.',
    pitch: 'Sustainable energy solutions for smart cities',
    tagline: 'Tesla for home solar systems',
    marketSize: '$180B renewable energy',
    unique: 'Self-installing smart panels',
    raise: '$5M Series B',
    stage: 2,
    yesVotes: 7,
    noVotes: 2,
    hotness: 3.4,
    answersCount: 5,
    comments: [
      {
        id: '1',
        userId: 'investor1',
        userName: 'John Doe',
        text: 'Great potential in the renewable energy sector!',
        timestamp: new Date('2025-10-25')
      },
      {
        id: '2',
        userId: 'investor2',
        userName: 'Jane Smith',
        text: 'Interested in learning more about the tech stack.',
        timestamp: new Date('2025-10-25')
      }
    ],
    fivePoints: [
      'Tesla for home solar systems',
      '$180B renewable energy market',
      'Self-installing smart panels',
      'Ex-Tesla, SolarCity engineers',
      'Raising $5M Series B'
    ],
    teamLogos: ['/logos/tesla.png', '/logos/solarcity.png', '/logos/apple.png'],
    video: 'https://www.youtube.com/watch?v=greentech',
    deck: 'https://example.com/greentech-deck.pdf',
    press: 'https://techcrunch.com/greentech',
    tech: 'ML + IoT smart grid integration',
    founders: [
      {
        name: 'Sarah Chen',
        role: 'CEO & Co-Founder',
        background: 'Ex-Tesla Energy VP, 10 years in renewable energy',
        linkedIn: 'https://linkedin.com/in/sarahchen'
      },
      {
        name: 'Marcus Rodriguez',
        role: 'CTO & Co-Founder',
        background: 'Former SolarCity Lead Engineer, MIT Energy Systems PhD',
        linkedIn: 'https://linkedin.com/in/marcusrodriguez'
      }
    ],
    ipFilings: [
      {
        type: 'patent',
        title: 'Self-Installing Solar Panel System with AI Optimization',
        status: 'approved',
        date: new Date('2025-08-15'),
        jurisdiction: 'USPTO'
      },
      {
        type: 'patent',
        title: 'IoT-Based Smart Grid Integration Technology',
        status: 'pending',
        date: new Date('2025-09-22'),
        jurisdiction: 'USPTO'
      },
      {
        type: 'trademark',
        title: 'GreenTech Solar',
        status: 'approved',
        date: new Date('2025-07-01'),
        jurisdiction: 'USPTO'
      }
    ],
    teamHires: [
      {
        name: 'Jennifer Park',
        role: 'VP of Operations',
        previousCompany: 'Tesla',
        joinedDate: new Date('2025-09-15')
      },
      {
        name: 'David Liu',
        role: 'Head of Product',
        previousCompany: 'Apple',
        joinedDate: new Date('2025-10-01')
      }
    ],
    advisors: [
      {
        name: 'Dr. Emily Watson',
        expertise: 'Renewable Energy Policy',
        currentRole: 'Former DOE Advisor',
        company: 'US Department of Energy',
        joinedDate: new Date('2025-08-01')
      },
      {
        name: 'James Mitchell',
        expertise: 'Solar Manufacturing',
        currentRole: 'CEO',
        company: 'SunPower',
        joinedDate: new Date('2025-09-10')
      }
    ],
    boardMembers: [
      {
        name: 'Robert Chang',
        expertise: 'Venture Capital',
        currentRole: 'Partner',
        company: 'Sequoia Capital',
        joinedDate: new Date('2025-07-15')
      }
    ],
    customerTraction: [
      {
        metric: '500 residential installations',
        date: new Date('2025-10-15'),
        description: 'Reached 500 home installations across California'
      },
      {
        metric: '$2.5M ARR',
        date: new Date('2025-10-20'),
        description: 'Hit $2.5M annual recurring revenue milestone'
      },
      {
        metric: '15 commercial contracts',
        date: new Date('2025-10-28'),
        description: 'Signed with major retail chains including Target'
      }
    ]
  },
  {
    id: 1,
    name: 'NeuralNest',
    description: 'AI-powered mental health therapy platform.',
    pitch: 'AI-powered mental health therapy',
    tagline: 'ChatGPT for mental health therapy',
    marketSize: '$240B mental health market',
    unique: 'AI learns patient patterns',
    raise: '$2M Series A',
    stage: 1,
    yesVotes: 3,
    noVotes: 3,
    hotness: 3.2,
    answersCount: 5,
    comments: [],
    fivePoints: [
      'ChatGPT for mental health therapy',
      '$280B mental health market',
      'AI therapist available 24/7',
      'Stanford psychologists + AI researchers',
      'Raising $2M Series A'
    ],
    teamLogos: ['/logos/google.png', '/logos/meta.png', '/logos/openai.png'],
    video: 'https://www.youtube.com/watch?v=neuralnest',
    deck: 'https://example.com/neuralnest-deck.pdf',
    press: 'https://techcrunch.com/neuralnest',
    tech: 'GPT-4 + behavioral psychology models',
    founders: [
      {
        name: 'Dr. Amanda Foster',
        role: 'CEO & Co-Founder',
        background: 'Clinical Psychologist, Stanford Medical School Faculty',
        linkedIn: 'https://linkedin.com/in/amandafoster'
      },
      {
        name: 'Alex Kumar',
        role: 'CTO & Co-Founder',
        background: 'Ex-OpenAI Research Scientist, Deep Learning expert',
        linkedIn: 'https://linkedin.com/in/alexkumar'
      }
    ],
    ipFilings: [
      {
        type: 'patent',
        title: 'AI-Powered Cognitive Behavioral Therapy System',
        status: 'pending',
        date: new Date('2025-09-05'),
        jurisdiction: 'USPTO'
      },
      {
        type: 'trademark',
        title: 'NeuralNest',
        status: 'approved',
        date: new Date('2025-06-20'),
        jurisdiction: 'USPTO'
      }
    ],
    teamHires: [
      {
        name: 'Dr. Rachel Green',
        role: 'Chief Medical Officer',
        previousCompany: 'Kaiser Permanente',
        joinedDate: new Date('2025-10-05')
      },
      {
        name: 'Tom Anderson',
        role: 'Lead AI Engineer',
        previousCompany: 'Google Brain',
        joinedDate: new Date('2025-09-20')
      }
    ],
    advisors: [
      {
        name: 'Dr. Steven Hayes',
        expertise: 'Clinical Psychology',
        currentRole: 'Professor',
        company: 'University of Nevada',
        joinedDate: new Date('2025-08-15')
      }
    ],
    boardMembers: [
      {
        name: 'Lisa Chen',
        expertise: 'Healthcare Technology',
        currentRole: 'Managing Partner',
        company: 'a16z Bio',
        joinedDate: new Date('2025-07-01')
      }
    ],
    customerTraction: [
      {
        metric: '50K active users',
        date: new Date('2025-10-10'),
        description: 'Crossed 50,000 monthly active users'
      },
      {
        metric: '4.8/5 user rating',
        date: new Date('2025-10-22'),
        description: 'Maintaining 4.8 star rating across app stores'
      },
      {
        metric: 'Partnership with 3 health insurers',
        date: new Date('2025-10-30'),
        description: 'Covered by Anthem, United, and Cigna'
      }
    ]
  },
  {
    id: 2,
    name: 'FinFlow',
    description: 'Instant crypto-to-fiat conversion for payments.',
    pitch: 'Instant crypto-to-fiat conversion',
    tagline: 'Stripe for cryptocurrency payments',
    marketSize: '$125B crypto payments',
    unique: 'Instant crypto-to-fiat conversion',
    raise: '$3M Seed',
    stage: 1,
    yesVotes: 4,
    noVotes: 1,
    hotness: 3.8,
    answersCount: 5,
    comments: [],
    fivePoints: [
      'Stripe for cryptocurrency payments',
      '$1T+ crypto market',
      'One-click crypto checkout',
      'Ex-Stripe, Coinbase engineers',
      'Raising $3M Seed'
    ],
    teamLogos: ['/logos/stripe.png', '/logos/coinbase.png', '/logos/paypal.png'],
    video: 'https://www.youtube.com/watch?v=finflow',
    deck: 'https://example.com/finflow-deck.pdf',
    press: 'https://techcrunch.com/finflow',
    tech: 'Lightning Network + instant settlement',
    founders: [
      {
        name: 'Michael Zhang',
        role: 'CEO & Co-Founder',
        background: 'Ex-Stripe Payments Lead, Built crypto infrastructure',
        linkedIn: 'https://linkedin.com/in/michaelzhang'
      },
      {
        name: 'Priya Patel',
        role: 'CTO & Co-Founder',
        background: 'Former Coinbase Senior Engineer, Blockchain expert',
        linkedIn: 'https://linkedin.com/in/priyapatel'
      }
    ],
    ipFilings: [
      {
        type: 'patent',
        title: 'Real-Time Cryptocurrency Settlement Protocol',
        status: 'filed',
        date: new Date('2025-10-10'),
        jurisdiction: 'USPTO'
      },
      {
        type: 'trademark',
        title: 'FinFlow',
        status: 'approved',
        date: new Date('2025-08-12'),
        jurisdiction: 'USPTO'
      }
    ],
    teamHires: [
      {
        name: 'Kevin Martinez',
        role: 'Head of Compliance',
        previousCompany: 'PayPal',
        joinedDate: new Date('2025-10-12')
      },
      {
        name: 'Sophie Williams',
        role: 'VP of Engineering',
        previousCompany: 'Coinbase',
        joinedDate: new Date('2025-09-28')
      }
    ],
    advisors: [
      {
        name: 'Brian Armstrong',
        expertise: 'Cryptocurrency Regulation',
        currentRole: 'Former Advisor',
        company: 'Coinbase',
        joinedDate: new Date('2025-09-01')
      }
    ],
    boardMembers: [
      {
        name: 'Jessica Tan',
        expertise: 'FinTech Investments',
        currentRole: 'Partner',
        company: 'Paradigm',
        joinedDate: new Date('2025-08-01')
      }
    ],
    customerTraction: [
      {
        metric: '1,000 merchants onboarded',
        date: new Date('2025-10-18'),
        description: 'Processing $5M monthly volume'
      },
      {
        metric: '$20M transaction volume',
        date: new Date('2025-10-25'),
        description: 'Crossed $20M in total transaction volume'
      }
    ]
  },
  {
    id: 3,
    name: 'BarkPark',
    description: 'A social network and meetup app for dog owners.',
    pitch: 'Connect dog owners and their furry friends in your neighborhood',
    tagline: 'Social network for dogs',
    marketSize: '$2B+ pet care market',
    unique: 'Gamified pet profiles and dog park rewards',
    raise: '$1.2M SAFE at $7M cap',
    stage: 2,
    yesVotes: 12,
    noVotes: 3,
    hotness: 4.1,
    answersCount: 5,
    comments: [],
    fivePoints: [
      'Tinder for dog playdates',
      '$2B pet care market',
      'Verified dog park reviews + scheduling',
      'Ex-Airbnb, Google product managers',
      'Raising $1.2M SAFE'
    ],
    teamLogos: ['/logos/google.png', '/logos/meta.png', '/logos/airbnb.png'],
    video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    deck: 'https://example.com/barkpark-deck.pdf',
    press: 'https://techcrunch.com/barkpark',
    tech: 'Built with Flutter and Firebase',
  },
  {
    id: 4,
    name: 'Chefie',
    description: 'AI-powered cooking assistant with voice and visual guides.',
    pitch: 'Your personal AI chef that helps you cook like a pro',
    tagline: 'AI cooking assistant',
    marketSize: '$15B home cooking tech',
    unique: 'Real-time cooking help and meal personalization',
    raise: '$1M SAFE at $10M cap',
    stage: 1,
    yesVotes: 5,
    noVotes: 1,
    hotness: 3.8,
    answersCount: 5,
    comments: [],
    fivePoints: [
      'AI sous chef in your kitchen',
      '$15B home cooking tech market',
      'Step-by-step voice + video guidance',
      'Ex-YouTube, TikTok engineers + pro chefs',
      'Raising $1M SAFE'
    ],
    teamLogos: ['/logos/apple.png', '/logos/youtube.png', '/logos/tiktok.png'],
    video: 'https://www.youtube.com/watch?v=chefie-demo',
    deck: 'https://example.com/chefie-deck.pdf',
    press: 'https://techcrunch.com/chefie',
    tech: 'React Native, GPT-4 Vision API',
    founders: [
      {
        name: 'Chef Maria Santos',
        role: 'CEO & Co-Founder',
        background: 'Michelin-starred chef, culinary TV personality',
        linkedIn: 'https://linkedin.com/in/mariasantos'
      },
      {
        name: 'Jake Thompson',
        role: 'CTO & Co-Founder',
        background: 'Ex-YouTube ML Engineer, built video recommendation systems',
        linkedIn: 'https://linkedin.com/in/jakethompson'
      }
    ],
    ipFilings: [
      {
        type: 'patent',
        title: 'AI-Powered Real-Time Cooking Guidance System',
        status: 'pending',
        date: new Date('2025-09-18'),
        jurisdiction: 'USPTO'
      },
      {
        type: 'trademark',
        title: 'Chefie',
        status: 'approved',
        date: new Date('2025-08-05'),
        jurisdiction: 'USPTO'
      }
    ],
    teamHires: [
      {
        name: 'Emily Rodriguez',
        role: 'Head of Content',
        previousCompany: 'TikTok',
        joinedDate: new Date('2025-10-08')
      }
    ],
    advisors: [
      {
        name: 'Gordon Ramsay',
        expertise: 'Culinary Excellence',
        currentRole: 'Celebrity Chef',
        company: 'Gordon Ramsay Group',
        joinedDate: new Date('2025-09-25')
      }
    ],
    boardMembers: [
      {
        name: 'Sarah Lee',
        expertise: 'Consumer Tech',
        currentRole: 'Partner',
        company: 'Lightspeed Venture',
        joinedDate: new Date('2025-08-20')
      }
    ],
    customerTraction: [
      {
        metric: '100K app downloads',
        date: new Date('2025-10-12'),
        description: 'Hit 100,000 downloads in first 2 months'
      },
      {
        metric: '25K daily active users',
        date: new Date('2025-10-25'),
        description: 'Strong 25% DAU/MAU ratio'
      }
    ]
  },
  {
    id: 5,
    name: 'HushRoom',
    description: 'Portable soundproof work pods for remote workers.',
    pitch: 'Work from anywhere with total privacy and quiet',
    tagline: 'Soundproof pods for WFH',
    marketSize: '$2.5B workspace innovation market',
    unique: 'No-permit setup, acoustic-grade privacy design',
    raise: '$2M Series A',
    stage: 2,
    yesVotes: 9,
    noVotes: 4,
    hotness: 3.6,
    answersCount: 5,
    comments: [],
    fivePoints: [
      'WeWork for your home',
      '$2.5B workspace innovation market',
      'Modular pods, 2-hour installation',
      'Ex-WeWork, Microsoft designers',
      'Raising $2M Series A'
    ],
    teamLogos: ['/logos/wework.png', '/logos/microsoft.png', '/logos/ikea.png'],
    video: 'https://www.youtube.com/watch?v=hushroom',
    deck: 'https://example.com/hushroom-deck.pdf',
    press: 'https://techcrunch.com/hushroom',
    tech: 'Modular architecture and AR layout planning',
    founders: [
      {
        name: 'Daniel Park',
        role: 'CEO & Co-Founder',
        background: 'Former WeWork VP of Design, RISD Industrial Design',
        linkedIn: 'https://linkedin.com/in/danielpark'
      }
    ],
    teamHires: [
      {
        name: 'Lisa Chen',
        role: 'Head of Manufacturing',
        previousCompany: 'IKEA',
        joinedDate: new Date('2025-10-14')
      }
    ],
    customerTraction: [
      {
        metric: '200 units sold',
        date: new Date('2025-10-20'),
        description: 'Sold 200 pods at $8K average price'
      },
      {
        metric: '$1.6M revenue',
        date: new Date('2025-10-28'),
        description: 'Hit $1.6M in revenue, 40% margins'
      }
    ]
  },
  {
    id: 6,
    name: 'PetPulse',
    description: 'Wearable health trackers for pets.',
    pitch: 'Monitor your pet\'s health in real-time',
    tagline: 'Fitbit for pets',
    marketSize: '$9B pet tech industry',
    unique: 'Vitals, mood, and fitness tracking for animals',
    raise: '$800K friends & family',
    stage: 1,
    yesVotes: 6,
    noVotes: 2,
    hotness: 3.2,
    answersCount: 5,
    comments: [],
    fivePoints: [
      'Fitbit for pets',
      '$9B pet tech industry',
      'Real-time vitals + activity tracking',
      'Ex-Fitbit engineers + vets',
      'Raising $800K seed'
    ],
    teamLogos: ['/logos/fitbit.png', '/logos/apple.png', '/logos/vetmed.png'],
    video: 'https://www.youtube.com/watch?v=petpulse',
    deck: 'https://example.com/petpulse-deck.pdf',
    press: 'https://techcrunch.com/petpulse',
    tech: 'BLE sensors + AI diagnostics',
    founders: [
      {
        name: 'Dr. Amy Chen',
        role: 'CEO & Co-Founder',
        background: 'Veterinarian + Ex-Fitbit Product Manager',
        linkedIn: 'https://linkedin.com/in/amychen'
      }
    ],
    ipFilings: [
      {
        type: 'patent',
        title: 'Pet Health Monitoring Wearable Device',
        status: 'filed',
        date: new Date('2025-10-05'),
        jurisdiction: 'USPTO'
      }
    ],
    advisors: [
      {
        name: 'Dr. Jane Foster',
        expertise: 'Veterinary Medicine',
        currentRole: 'Chief Veterinarian',
        company: 'PetSmart',
        joinedDate: new Date('2025-09-12')
      }
    ],
    customerTraction: [
      {
        metric: '5K devices pre-ordered',
        date: new Date('2025-10-18'),
        description: 'Kickstarter raised $400K with 5,000 pre-orders'
      }
    ]
  },
  {
    id: 7,
    name: 'Droply',
    description: 'Scheduled water deliveries for off-grid homes.',
    pitch: 'Never run out of water with smart delivery',
    tagline: 'Smart water delivery',
    marketSize: '$1.8B off-grid utilities',
    unique: 'IoT tank sensors + ML-based route planning',
    raise: '$1.5M pre-seed',
    stage: 1,
    yesVotes: 4,
    noVotes: 1,
    hotness: 2.9,
    answersCount: 5,
    comments: [],
    fivePoints: [
      'Uber for water delivery',
      '$1.8B off-grid utilities market',
      'IoT sensors predict refill needs',
      'Ex-UPS logistics + SmartThings engineers',
      'Raising $1.5M pre-seed'
    ],
    teamLogos: ['/logos/ups.png', '/logos/smartthings.png', '/logos/tesla.png'],
    video: 'https://www.youtube.com/watch?v=droply',
    deck: 'https://example.com/droply-deck.pdf',
    press: 'https://techcrunch.com/droply',
    tech: 'IoT, GPS routing, and solar billing integration',
    founders: [
      {
        name: 'Carlos Mendez',
        role: 'CEO & Co-Founder',
        background: 'Ex-UPS Operations Director, Supply Chain MBA',
        linkedIn: 'https://linkedin.com/in/carlosmendez'
      }
    ],
    teamHires: [
      {
        name: 'Maya Singh',
        role: 'VP of Engineering',
        previousCompany: 'SmartThings',
        joinedDate: new Date('2025-09-30')
      }
    ],
    boardMembers: [
      {
        name: 'Tom Harrison',
        expertise: 'Logistics & Supply Chain',
        currentRole: 'Former VP',
        company: 'UPS',
        joinedDate: new Date('2025-09-15')
      }
    ],
    customerTraction: [
      {
        metric: '300 households served',
        date: new Date('2025-10-22'),
        description: 'Serving 300 rural households across 3 states'
      }
    ]
  },
  {
    id: 8,
    name: 'MuseNet',
    description: 'AI-generated ambient music for focus and sleep.',
    pitch: 'Personalized AI music that adapts to your mood',
    tagline: 'AI music for wellness',
    marketSize: '$3B wellness audio space',
    unique: 'Realtime adaptive music based on biometrics',
    raise: '$600K angel round',
    stage: 1,
    yesVotes: 8,
    noVotes: 2,
    hotness: 3.7,
    answersCount: 5,
    comments: [],
    fivePoints: [
      'Spotify meets meditation',
      '$3B wellness audio market',
      'AI generates music from heart rate',
      'Ex-Spotify engineers + neuroscientists',
      'Raising $600K angel'
    ],
    teamLogos: ['/logos/spotify.png', '/logos/deezer.png', '/logos/apple.png'],
    video: 'https://www.youtube.com/watch?v=muse-net',
    deck: 'https://example.com/musenet-deck.pdf',
    press: 'https://techcrunch.com/musenet',
    tech: 'LLMs + real-time waveform synthesis',
    founders: [
      {
        name: 'Nina Patel',
        role: 'CEO & Co-Founder',
        background: 'Ex-Spotify Product Lead, Berklee Music grad',
        linkedIn: 'https://linkedin.com/in/ninapatel'
      },
      {
        name: 'Dr. Mark Wilson',
        role: 'Chief Science Officer',
        background: 'Neuroscientist, Stanford Sleep Lab',
        linkedIn: 'https://linkedin.com/in/markwilson'
      }
    ],
    ipFilings: [
      {
        type: 'patent',
        title: 'Biometric-Adaptive Music Generation System',
        status: 'pending',
        date: new Date('2025-09-28'),
        jurisdiction: 'USPTO'
      }
    ],
    advisors: [
      {
        name: 'Hans Zimmer',
        expertise: 'Music Composition',
        currentRole: 'Composer',
        company: 'Remote Control Productions',
        joinedDate: new Date('2025-10-01')
      }
    ],
    customerTraction: [
      {
        metric: '75K subscribers',
        date: new Date('2025-10-15'),
        description: '$9.99/mo premium tier, $75K MRR'
      },
      {
        metric: '4.9/5 app rating',
        date: new Date('2025-10-25'),
        description: 'Top wellness app on App Store'
      }
    ]
  },
  {
    id: 9,
    name: 'ByteSize',
    description: 'Snackable coding lessons in under 60 seconds.',
    pitch: 'Learn to code in 60-second videos',
    tagline: 'TikTok for coding education',
    marketSize: '$5B+ online learning market',
    unique: 'TikTok-style swipe interface with live code previews',
    raise: '$500K pre-seed round',
    stage: 1,
    yesVotes: 11,
    noVotes: 1,
    hotness: 4.2,
    answersCount: 5,
    comments: [],
    fivePoints: [
      'TikTok for coding tutorials',
      '$5B+ online learning market',
      '60-second lessons with instant practice',
      'Ex-Google, Meta engineers',
      'Raising $500K pre-seed'
    ],
    teamLogos: ['/logos/amazon.png', '/logos/google.png', '/logos/meta.png'],
    video: 'https://www.youtube.com/watch?v=abc123',
    deck: 'https://example.com/bytesize-deck.pdf',
    press: 'https://techcrunch.com/bytesize',
    tech: 'React, Node.js, and WebAssembly',
    founders: [
      {
        name: 'Ryan Kim',
        role: 'CEO & Co-Founder',
        background: 'Ex-Google Developer Advocate, taught 1M+ students',
        linkedIn: 'https://linkedin.com/in/ryankim'
      },
      {
        name: 'Sophia Martinez',
        role: 'CPO & Co-Founder',
        background: 'Former Meta Product Manager, EdTech expert',
        linkedIn: 'https://linkedin.com/in/sophiamartinez'
      }
    ],
    teamHires: [
      {
        name: 'Alex Johnson',
        role: 'Head of Content',
        previousCompany: 'Udemy',
        joinedDate: new Date('2025-10-02')
      },
      {
        name: 'Emma Davis',
        role: 'Lead Engineer',
        previousCompany: 'Amazon',
        joinedDate: new Date('2025-10-16')
      }
    ],
    advisors: [
      {
        name: 'Sal Khan',
        expertise: 'Online Education',
        currentRole: 'Founder',
        company: 'Khan Academy',
        joinedDate: new Date('2025-09-20')
      }
    ],
    boardMembers: [
      {
        name: 'Ann Chen',
        expertise: 'EdTech Investments',
        currentRole: 'Partner',
        company: 'Reach Capital',
        joinedDate: new Date('2025-09-05')
      }
    ],
    customerTraction: [
      {
        metric: '500K monthly active learners',
        date: new Date('2025-10-10'),
        description: 'Growing 30% month-over-month'
      },
      {
        metric: '50K paid subscribers',
        date: new Date('2025-10-26'),
        description: '$14.99/mo premium, $750K MRR'
      }
    ]
  },
  {
    id: 10,
    name: 'SolarSync',
    description: 'Smart solar optimization for small homes.',
    pitch: 'AI-powered solar energy optimization',
    tagline: 'Smart solar for homes',
    marketSize: '$10B+ residential solar market',
    unique: 'Uses AI to shift energy loads for savings',
    raise: '$750K seed round at $5M valuation',
    stage: 1,
    yesVotes: 6,
    noVotes: 3,
    hotness: 3.3,
    answersCount: 5,
    comments: [],
    fivePoints: [
      'Nest for solar panels',
      '$10B+ residential solar market',
      'AI shifts energy to sunny hours',
      'Ex-Tesla Energy, NASA engineers',
      'Raising $750K seed'
    ],
    teamLogos: ['/logos/tesla.png', '/logos/nasa.png', '/logos/solarcity.png'],
    video: 'https://www.youtube.com/watch?v=xyz789',
    deck: 'https://example.com/solarsync-deck.pdf',
    press: 'https://techcrunch.com/solarsync',
    tech: 'IoT + ML with Raspberry Pi edge devices',
    founders: [
      {
        name: 'Jessica Brown',
        role: 'CEO & Co-Founder',
        background: 'Ex-Tesla Energy Product Manager, Cleantech MBA',
        linkedIn: 'https://linkedin.com/in/jessicabrown'
      },
      {
        name: 'Dr. Robert Lee',
        role: 'CTO & Co-Founder',
        background: 'Former NASA Engineer, PhD in Renewable Energy Systems',
        linkedIn: 'https://linkedin.com/in/robertlee'
      }
    ],
    ipFilings: [
      {
        type: 'patent',
        title: 'AI-Based Solar Energy Load Management System',
        status: 'filed',
        date: new Date('2025-10-08'),
        jurisdiction: 'USPTO'
      },
      {
        type: 'trademark',
        title: 'SolarSync',
        status: 'approved',
        date: new Date('2025-09-01'),
        jurisdiction: 'USPTO'
      }
    ],
    teamHires: [
      {
        name: 'Mike Chen',
        role: 'Head of Sales',
        previousCompany: 'SolarCity',
        joinedDate: new Date('2025-10-10')
      }
    ],
    advisors: [
      {
        name: 'Elon Musk',
        expertise: 'Clean Energy Innovation',
        currentRole: 'CEO',
        company: 'Tesla',
        joinedDate: new Date('2025-09-18')
      }
    ],
    boardMembers: [
      {
        name: 'Patricia Wong',
        expertise: 'Clean Energy Investments',
        currentRole: 'Managing Partner',
        company: 'Energy Impact Partners',
        joinedDate: new Date('2025-08-25')
      }
    ],
    customerTraction: [
      {
        metric: '250 home installations',
        date: new Date('2025-10-12'),
        description: 'Average 30% energy cost savings'
      },
      {
        metric: 'Partnership with 2 utilities',
        date: new Date('2025-10-24'),
        description: 'Pilot programs with PG&E and SDG&E'
      }
    ]
  }
];

export default startupData;