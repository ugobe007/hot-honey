-- Seed initial investor data
-- Insert Y Combinator
INSERT INTO investors (
  name, type, tagline, description, website, linkedin,
  check_size, stage, sectors, geography,
  portfolio_count, exits, unicorns, notable_investments
) VALUES (
  'Y Combinator',
  'accelerator',
  'The world''s most powerful startup accelerator',
  'Y Combinator provides seed funding, advice, and connections to thousands of startups. Two batches per year of 3-month programs.',
  'https://www.ycombinator.com',
  'https://www.linkedin.com/company/y-combinator/',
  '$500,000',
  '["pre_seed", "seed"]'::jsonb,
  '["Software", "AI/ML", "Healthcare", "Fintech", "Consumer", "B2B", "Marketplace"]'::jsonb,
  'Global',
  4000,
  400,
  20,
  '["Airbnb", "Stripe", "Coinbase", "DoorDash", "Instacart", "Dropbox", "Reddit", "Twitch"]'::jsonb
);

-- Insert Andreessen Horowitz
INSERT INTO investors (
  name, type, tagline, description, website, linkedin,
  aum, check_size, stage, sectors, geography,
  portfolio_count, exits, unicorns, notable_investments
) VALUES (
  'Andreessen Horowitz',
  'vc_firm',
  'Software is eating the world',
  'a16z backs bold entrepreneurs building the future through technology. We are stage agnostic: We invest in seed to late-stage companies across bio + healthcare, consumer, crypto, enterprise, fintech, games, and companies building toward American dynamism.',
  'https://a16z.com',
  'https://www.linkedin.com/company/andreessen-horowitz/',
  '$35B',
  '$1M - $50M',
  '["seed", "series_a", "series_b", "series_c", "growth"]'::jsonb,
  '["Software", "AI/ML", "Crypto/Web3", "Fintech", "Bio/Healthcare", "Consumer", "Enterprise", "Gaming"]'::jsonb,
  'Global',
  800,
  150,
  40,
  '["Facebook", "Airbnb", "Slack", "Coinbase", "GitHub", "Instagram", "Oculus", "Lyft"]'::jsonb
);

-- Insert Sequoia Capital
INSERT INTO investors (
  name, type, tagline, description, website, linkedin,
  aum, check_size, stage, sectors, geography,
  portfolio_count, exits, unicorns, notable_investments
) VALUES (
  'Sequoia Capital',
  'vc_firm',
  'Helping the daring build legendary companies',
  'Sequoia Capital helps the daring build legendary companies from idea to IPO and beyond. We invest across stages and geographies in technology, healthcare, and other innovation-driven sectors.',
  'https://www.sequoiacap.com',
  'https://www.linkedin.com/company/sequoia-capital/',
  '$85B',
  '$500K - $100M',
  '["seed", "series_a", "series_b", "series_c", "growth", "late_stage"]'::jsonb,
  '["Software", "AI/ML", "Enterprise", "Consumer", "Fintech", "Healthcare", "Crypto", "Marketplace"]'::jsonb,
  'Global',
  1000,
  300,
  100,
  '["Apple", "Google", "YouTube", "Instagram", "WhatsApp", "Airbnb", "DoorDash", "Stripe", "Zoom"]'::jsonb
);

-- Insert Techstars
INSERT INTO investors (
  name, type, tagline, description, website, linkedin,
  check_size, stage, sectors, geography,
  portfolio_count, exits, unicorns, notable_investments
) VALUES (
  'Techstars',
  'accelerator',
  'Do more faster',
  'Techstars is the worldwide network that helps entrepreneurs succeed. We connect entrepreneurs, investors, corporates, and cities to help build thriving startup communities.',
  'https://www.techstars.com',
  'https://www.linkedin.com/company/techstars/',
  '$120,000',
  '["pre_seed", "seed"]'::jsonb,
  '["Software", "AI/ML", "Fintech", "Healthcare", "IoT", "B2B", "Consumer", "Impact"]'::jsonb,
  'Global',
  3000,
  250,
  10,
  '["SendGrid", "ClassPass", "PillPack", "DigitalOcean", "Sphero", "DataRobot"]'::jsonb
);

-- Insert Founders Fund
INSERT INTO investors (
  name, type, tagline, description, website, linkedin,
  aum, check_size, stage, sectors, geography,
  portfolio_count, exits, unicorns, notable_investments
) VALUES (
  'Founders Fund',
  'vc_firm',
  'We wanted flying cars, instead we got 140 characters',
  'Founders Fund is a San Francisco based venture capital firm investing in companies building revolutionary technologies. We back founders with the courage to imagine - and the conviction to build - a dramatically better future.',
  'https://foundersfund.com',
  'https://www.linkedin.com/company/founders-fund/',
  '$12B',
  '$1M - $100M',
  '["seed", "series_a", "series_b", "series_c", "growth"]'::jsonb,
  '["Software", "AI/ML", "Aerospace", "Bio/Healthcare", "Crypto/Web3", "Defense", "Energy", "Frontier Tech"]'::jsonb,
  'Global',
  200,
  50,
  20,
  '["SpaceX", "Palantir", "Airbnb", "Stripe", "Facebook", "Anduril", "Oscar Health", "Neuralink"]'::jsonb
);

-- Verify the data was inserted
SELECT name, type, portfolio_count, unicorns FROM investors ORDER BY portfolio_count DESC;
