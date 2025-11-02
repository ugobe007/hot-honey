import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Read and execute the investors and uploads migration
    const migrationPath = path.join(__dirname, 'migrations', 'create_investors_and_uploads.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Running migration: create_investors_and_uploads.sql');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('COMMENT ON')) continue; // Skip comments for now
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error && !error.message.includes('already exists')) {
        console.error('⚠️  Error executing statement:', error.message);
      }
    }

    console.log('✅ Migration completed!\n');

    // Now seed the data
    console.log('🌱 Seeding investor data...\n');
    const seedPath = path.join(__dirname, 'seed_investors.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf-8');

    const seedStatements = seedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s.toUpperCase().startsWith('INSERT'));

    for (const statement of seedStatements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.error('⚠️  Error seeding data:', error.message);
      }
    }

    console.log('✅ Seed data inserted!\n');

    // Verify the data
    const { data, error } = await supabase
      .from('investors')
      .select('name, type, portfolio_count, unicorns')
      .order('portfolio_count', { ascending: false });

    if (error) {
      console.error('❌ Error fetching investors:', error);
    } else {
      console.log('📊 Investors in database:');
      console.table(data);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
