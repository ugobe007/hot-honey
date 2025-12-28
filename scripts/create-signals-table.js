require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTables() {
  console.log('Creating signals tables...');
  
  // Check if signals table exists
  const { data: existing } = await supabase
    .from('signals')
    .select('id')
    .limit(1);
  
  if (existing !== null) {
    console.log('Signals table already exists');
    return;
  }
  
  console.log('Tables need to be created via Supabase dashboard or migration.');
  console.log('');
  console.log('Run this SQL in Supabase SQL Editor:');
  console.log('');
  console.log(`
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source_type VARCHAR(50) NOT NULL,
  source_name VARCHAR(255) NOT NULL,
  source_url TEXT UNIQUE,
  title TEXT,
  content TEXT,
  sectors JSONB DEFAULT '[]',
  themes JSONB DEFAULT '[]',
  sentiment VARCHAR(20),
  signal_strength FLOAT,
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS signal_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  sector VARCHAR(100),
  theme VARCHAR(255),
  mention_count INT DEFAULT 0,
  avg_sentiment FLOAT,
  UNIQUE(period_start, sector, theme)
);

CREATE TABLE IF NOT EXISTS funding_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  startup_id UUID,
  startup_name VARCHAR(255),
  outcome_type VARCHAR(50),
  funding_amount BIGINT,
  funding_round VARCHAR(50),
  outcome_date TIMESTAMPTZ,
  god_score_at_time FLOAT
);
  `);
}

createTables().catch(console.error);
