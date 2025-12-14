-- Quick seed script to add 5 investors to the database
-- Run this in your Supabase SQL editor

-- Clear existing investors (optional - remove this line if you want to keep existing data)
DELETE FROM investors;

-- Insert 5 diverse investors
INSERT INTO investors (name, type, tagline, description, website, check_size, stage, sectors, geography, portfolio_count, exits, unicorns, notable_investments) VALUES
('Y Combinator', 'accelerator', 'The world''s most powerful startup accelerator', 'Y Combinator provides seed funding, advice, and connections. Two batches per year.', 'https://www.ycombinator.com', '$500,000', '["pre_seed", "seed"]'::jsonb, '["Software", "AI/ML", "Healthcare", "Fintech", "Consumer", "B2B"]'::jsonb, 'Global', 4000, 400, 20, '["Airbnb", "Stripe", "Coinbase", "DoorDash", "Dropbox"]'::jsonb),

('Andreessen Horowitz', 'vc_firm', 'Software is eating the world', 'a16z backs bold entrepreneurs building the future through technology.', 'https://a16z.com', '$1M - $50M', '["seed", "series_a", "series_b", "series_c"]'::jsonb, '["Software", "AI/ML", "Crypto/Web3", "Fintech", "Consumer"]'::jsonb, 'Global', 800, 150, 40, '["Facebook", "Airbnb", "Slack", "Coinbase", "Instagram"]'::jsonb),

('Sequoia Capital', 'vc_firm', 'Helping the daring build legendary companies', 'Sequoia helps the daring build legendary companies from idea to IPO.', 'https://www.sequoiacap.com', '$500K - $100M', '["seed", "series_a", "series_b", "series_c"]'::jsonb, '["Software", "AI/ML", "Enterprise", "Consumer", "Fintech"]'::jsonb, 'Global', 1000, 300, 100, '["Apple", "Google", "YouTube", "Instagram", "WhatsApp"]'::jsonb),

('Founders Fund', 'vc_firm', 'We wanted flying cars, instead we got 140 characters', 'Founders Fund invests in companies building revolutionary technologies.', 'https://foundersfund.com', '$1M - $100M', '["seed", "series_a", "series_b", "series_c"]'::jsonb, '["Software", "AI/ML", "Aerospace", "Bio/Healthcare", "Defense"]'::jsonb, 'Global', 200, 50, 20, '["SpaceX", "Palantir", "Airbnb", "Stripe", "Facebook"]'::jsonb),

('Techstars', 'accelerator', 'Do more faster', 'Techstars helps entrepreneurs succeed through our worldwide network.', 'https://www.techstars.com', '$120,000', '["pre_seed", "seed"]'::jsonb, '["Software", "AI/ML", "Fintech", "Healthcare", "B2B"]'::jsonb, 'Global', 3000, 250, 10, '["SendGrid", "ClassPass", "PillPack", "DigitalOcean"]'::jsonb);

-- Verify the data
SELECT name, type, portfolio_count FROM investors ORDER BY portfolio_count DESC;
